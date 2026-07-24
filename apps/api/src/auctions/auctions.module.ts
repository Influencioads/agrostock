import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Logger,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Query } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, type Product } from '@prisma/client';
import { IsNumber, Max, Min } from 'class-validator';
import { MAX_MONEY_CENTS } from '../common/limits';
import { AppException } from '../common/app-exception';
import { flagFor, maskName } from '../common/masking';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { Locale, localize } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';

/** Product fields carrying a per-locale translation (mirrors products.module). */
const PRODUCT_TR_FIELDS = ['name', 'grade', 'origin', 'qty', 'moq', 'delivery'] as const;

// API-13: these are DOLLARS, converted to int4 `amountCents` on write — cap at
// the dollar equivalent of MAX_MONEY_CENTS so the conversion can't overflow.
const MAX_BID_DOLLARS = MAX_MONEY_CENTS / 100;

export class PlaceBidDto {
  @IsNumber() @Min(1) @Max(MAX_BID_DOLLARS) amount!: number; // dollars
}
export class AutoBidDto {
  @IsNumber() @Min(1) @Max(MAX_BID_DOLLARS) max!: number; // dollars — proxy-bid ceiling
}

const isAdmin = (u?: AuthUser) => !!u && (u.roles ?? [u.role]).includes('admin');

/** A lot is complete once its countdown has run out. No clock = runs until closed. */
const hasEnded = (p: Pick<Product, 'auctionEndsAt'>) =>
  !!p.auctionEndsAt && p.auctionEndsAt.getTime() <= Date.now();

/** Only live lots belong on a public board; the completed ones are owner-scoped. */
const liveOnly = (): Prisma.ProductWhereInput => ({
  OR: [{ auctionEndsAt: null }, { auctionEndsAt: { gt: new Date() } }],
});

/**
 * The minimum raise for a lot. Sellers may pin `bidIncrementCents`; otherwise it
 * scales to ~1% of the current price, clamped to $50–$1,000 and rounded to $50.
 */
function effectiveIncrement(product: Pick<Product, 'bidIncrementCents' | 'startBidCents'>, highestCents: number | null): number {
  if (product.bidIncrementCents && product.bidIncrementCents > 0) return product.bidIncrementCents;
  const base = highestCents ?? product.startBidCents ?? 100_000;
  const raw = Math.round((base * 0.01) / 5_000) * 5_000;
  return Math.min(100_000, Math.max(5_000, raw));
}

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Public auction snapshot. Open ascending: the current highest bid, bid count,
   * min-increment and reserve status are visible to everyone. Only the winning
   * bidder's real name is owner/admin-gated — the public gets a masked handle.
   */
  private async withPublic(product: Product, ownerView: boolean) {
    const [top, count] = await Promise.all([
      this.prisma.auctionBid.findFirst({
        where: { productId: product.id },
        orderBy: { amountCents: 'desc' },
        include: { bidder: { select: { id: true, name: true } } },
      }),
      this.prisma.auctionBid.count({ where: { productId: product.id } }),
    ]);
    const highestCents = top?.amountCents ?? null;
    const bidIncrementCents = effectiveIncrement(product, highestCents);
    const base = highestCents ?? product.startBidCents ?? 0;
    const reserveMet = product.reserveCents == null ? true : (highestCents ?? 0) >= product.reserveCents;
    return {
      bidCount: count,
      highestCents,
      highBidderMasked: top ? maskName(top.bidder.name) : null,
      // API-05: the real bidder id must NOT ship in the public payload — it was
      // resolvable to a full name via the public /directory/profile/:id endpoint,
      // defeating the name masking. Only the seller/admin see the identity; a
      // buyer's own "am I winning" state comes from `standing()` (rank), not this.
      highBidderId: ownerView ? top?.bidder.id ?? null : null,
      // Real identity only for the seller/admin — never in the public payload.
      highBidder: ownerView ? top?.bidder.name ?? null : null,
      startBidCents: product.startBidCents ?? null,
      bidIncrementCents,
      minNextCents: base + bidIncrementCents,
      reserveCents: ownerView ? product.reserveCents ?? null : null,
      hasReserve: product.reserveCents != null,
      reserveMet,
    };
  }

  /** The viewer's position in the lot: their ceiling, rank, and whether outbid. */
  private async standing(productId: string, viewerId: string) {
    const grouped = await this.prisma.auctionBid.groupBy({
      by: ['bidderId'],
      where: { productId },
      _max: { amountCents: true },
    });
    grouped.sort((a, b) => (b._max.amountCents ?? 0) - (a._max.amountCents ?? 0));
    const rank = grouped.findIndex((g) => g.bidderId === viewerId);
    const yourMaxCents = rank >= 0 ? grouped[rank]._max.amountCents ?? null : null;
    const leading = grouped.length > 0 && grouped[0].bidderId === viewerId;
    const auto = await this.prisma.auctionAutoBid.findUnique({
      where: { productId_bidderId: { productId, bidderId: viewerId } },
    });
    return {
      yourMaxCents,
      yourRank: rank >= 0 ? rank + 1 : null,
      bidderCount: grouped.length,
      leading,
      outbid: yourMaxCents != null && !leading,
      autoMaxCents: auto?.maxCents ?? null,
    };
  }

  /**
   * Completed lots leave every public surface but stay reachable for the people
   * who were actually in them: the seller, an admin, and anyone who bid — by
   * hand or by leaving a proxy ceiling. To everyone else the lot reads as though
   * it never existed, so a stale link 404s instead of exposing a settled book.
   */
  private async isParticipant(product: Product, viewer?: AuthUser) {
    if (!viewer) return false;
    if (isAdmin(viewer) || product.sellerId === viewer.id) return true;
    const [bid, auto] = await Promise.all([
      this.prisma.auctionBid.findFirst({ where: { productId: product.id, bidderId: viewer.id }, select: { id: true } }),
      this.prisma.auctionAutoBid.findFirst({ where: { productId: product.id, bidderId: viewer.id }, select: { maxCents: true } }),
    ]);
    return !!bid || !!auto;
  }

  /** Gate on a completed lot — same 404 as a slug that was never a lot at all. */
  private async assertVisible(product: Product, viewer?: AuthUser) {
    if (!hasEnded(product)) return;
    if (!(await this.isParticipant(product, viewer))) {
      throw AppException.notFound('auctions.not_found', 'Auction not found');
    }
  }

  async list(viewer?: AuthUser, locale: Lang = 'en') {
    const products = await this.prisma.product.findMany({
      where: { isAuction: true, approved: true, ...liveOnly() },
      include: { seller: { select: { name: true } }, translations: { where: { locale } } },
      orderBy: { auctionEndsAt: 'asc' },
      // API-15: cap this public list — it was unbounded and runs a per-lot top-bid
      // query (N+1), so an unbounded result set was a linear-cost DoS lever. The
      // soonest-ending 100 live lots are what the board shows.
      take: 100,
    });
    const admin = isAdmin(viewer);
    return Promise.all(
      products.map(async (p) => ({
        ...localize(p, [...PRODUCT_TR_FIELDS]),
        ...(await this.withPublic(p, admin || (!!viewer && p.sellerId === viewer.id))),
      })),
    );
  }

  async detail(slug: string, viewer?: AuthUser, locale: Lang = 'en') {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { seller: { select: { id: true, name: true, country: true } }, translations: { where: { locale } } },
    });
    if (!product || !product.isAuction) throw AppException.notFound('auctions.not_found', 'Auction not found');
    await this.assertVisible(product, viewer);
    const ownerView = isAdmin(viewer) || (!!viewer && product.sellerId === viewer.id);
    const pub = await this.withPublic(product, ownerView);
    const standing = viewer && !ownerView ? await this.standing(product.id, viewer.id) : null;
    return { ...localize(product, [...PRODUCT_TR_FIELDS]), ...pub, isOwner: ownerView, standing };
  }

  /**
   * Public, masked bid history: everyone sees every offer price and the relative
   * order, but bidder identities are hidden. The seller/admin sees real names;
   * a bidder sees their own rows tagged "You".
   */
  async bids(slug: string, viewer?: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) throw AppException.notFound('auctions.not_found', 'Auction not found');
    await this.assertVisible(product, viewer);
    const ownerView = isAdmin(viewer) || (!!viewer && product.sellerId === viewer.id);
    const rows = await this.prisma.auctionBid.findMany({
      where: { productId: product.id },
      orderBy: { amountCents: 'desc' },
      take: 24,
      include: { bidder: { select: { id: true, name: true } } },
    });
    return rows.map((b, i) => {
      const isYou = !!viewer && viewer.id === b.bidderId;
      return {
        id: b.id,
        amountCents: b.amountCents,
        createdAt: b.createdAt,
        auto: b.auto,
        isYou,
        isTop: i === 0,
        flag: flagFor(b.bidderId),
        masked: ownerView ? b.bidder.name : isYou ? 'You' : maskName(b.bidder.name),
      };
    });
  }

  async place(slug: string, bidder: AuthUser, amountDollars: number) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product || !product.isAuction) throw AppException.notFound('auctions.not_found', 'Auction not found');
    if (product.auctionEndsAt && product.auctionEndsAt.getTime() < Date.now()) {
      throw AppException.badRequest('auctions.ended', 'This auction has ended.');
    }
    if (product.sellerId === bidder.id) {
      throw AppException.badRequest('auctions.own_auction', 'You cannot bid on your own auction.');
    }
    const amountCents = Math.round(amountDollars * 100);

    // Who leads before this bid? Used to fire an "outbid" notification once the
    // proxy engine has settled the new top.
    const prevTop = await this.prisma.auctionBid.findFirst({
      where: { productId: product.id },
      orderBy: { amountCents: 'desc' },
      select: { bidderId: true },
    });

    // Serializable so two simultaneous bids can't both clear the same floor: the
    // floor is re-read and the bid inserted atomically; the loser gets a retry.
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const top = await tx.auctionBid.findFirst({
            where: { productId: product.id },
            orderBy: { amountCents: 'desc' },
            select: { amountCents: true },
          });
          const floor = top?.amountCents ?? product.startBidCents ?? 0;
          const minNext = floor + effectiveIncrement(product, top?.amountCents ?? null);
          if (amountCents < minNext) {
            // Open auction: it's safe (and clearer) to tell the bidder the minimum.
            throw AppException.badRequest('auctions.bid_too_low', `The minimum next bid is $${(minNext / 100).toLocaleString()}.`);
          }
          await tx.auctionBid.create({ data: { productId: product.id, bidderId: bidder.id, amountCents } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw AppException.badRequest('auctions.bid_race', 'Another bid landed first — please try again with a higher amount.');
    }
    // Let the proxy engine answer on behalf of anyone this bid outbid.
    await this.resolveAutoBids(product.id);
    await this.notifyOutbid(product, prevTop?.bidderId ?? null, bidder.id);
    return this.detail(slug, bidder);
  }

  /**
   * After a bid + proxy settlement, tell anyone who lost the lead. Covers the
   * previous leader and the just-placed bidder (a proxy can outbid them instantly).
   * Push + in-app only — outbids are frequent, so we suppress email.
   */
  private async notifyOutbid(product: Product, prevTopBidderId: string | null, placedById: string) {
    const newTop = await this.prisma.auctionBid.findFirst({
      where: { productId: product.id },
      orderBy: { amountCents: 'desc' },
      select: { bidderId: true, amountCents: true },
    });
    if (!newTop) return;
    const losers = new Set<string>();
    if (prevTopBidderId && prevTopBidderId !== newTop.bidderId) losers.add(prevTopBidderId);
    if (placedById !== newTop.bidderId) losers.add(placedById);
    for (const userId of losers) {
      await this.notifications.create({
        userId,
        system: 'auctions',
        type: 'auction.outbid',
        params: { product: product.name, amount: `$${(newTop.amountCents / 100).toLocaleString()}` },
        data: { productId: product.id, slug: product.slug },
        linkUrl: `/product/${product.slug}`,
        email: false,
      });
    }
  }

  /**
   * Proxy engine: while some bidder's auto-bid ceiling can still beat the current
   * top by one increment, place the minimum winning bid on their behalf. Bounded
   * so escalating ceilings converge instead of looping forever.
   */
  private async resolveAutoBids(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return;
    for (let i = 0; i < 40; i++) {
      const top = await this.prisma.auctionBid.findFirst({
        where: { productId },
        orderBy: { amountCents: 'desc' },
        select: { amountCents: true, bidderId: true },
      });
      const need = (top?.amountCents ?? product.startBidCents ?? 0) + effectiveIncrement(product, top?.amountCents ?? null);
      const auto = await this.prisma.auctionAutoBid.findFirst({
        where: { productId, maxCents: { gte: need }, ...(top ? { NOT: { bidderId: top.bidderId } } : {}) },
        orderBy: [{ maxCents: 'desc' }, { updatedAt: 'asc' }],
      });
      if (!auto) break;
      await this.prisma.auctionBid.create({
        data: { productId, bidderId: auto.bidderId, amountCents: Math.min(auto.maxCents, need), auto: true },
      });
    }
  }

  async setAutoBid(slug: string, buyer: AuthUser, maxDollars: number) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product || !product.isAuction) throw AppException.notFound('auctions.not_found', 'Auction not found');
    if (product.auctionEndsAt && product.auctionEndsAt.getTime() < Date.now()) {
      throw AppException.badRequest('auctions.ended', 'This auction has ended.');
    }
    if (product.sellerId === buyer.id) {
      throw AppException.badRequest('auctions.own_auction', 'You cannot bid on your own auction.');
    }
    const maxCents = Math.round(maxDollars * 100);
    const top = await this.prisma.auctionBid.findFirst({ where: { productId: product.id }, orderBy: { amountCents: 'desc' }, select: { amountCents: true } });
    const minNext = (top?.amountCents ?? product.startBidCents ?? 0) + effectiveIncrement(product, top?.amountCents ?? null);
    if (maxCents < minNext) {
      throw AppException.badRequest('auctions.autobid_too_low', `Your max must be at least $${(minNext / 100).toLocaleString()}.`);
    }
    await this.prisma.auctionAutoBid.upsert({
      where: { productId_bidderId: { productId: product.id, bidderId: buyer.id } },
      create: { productId: product.id, bidderId: buyer.id, maxCents },
      update: { maxCents },
    });
    await this.resolveAutoBids(product.id);
    return this.detail(slug, buyer);
  }

  async clearAutoBid(slug: string, buyer: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) throw AppException.notFound('auctions.not_found', 'Auction not found');
    await this.prisma.auctionAutoBid.deleteMany({ where: { productId: product.id, bidderId: buyer.id } });
    return this.detail(slug, buyer);
  }

  myBids(bidderId: string) {
    return this.prisma.auctionBid.findMany({
      where: { bidderId },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, slug: true, emoji: true, flag: true } } },
    });
  }

  /** The seller's own auction listings, with the owner's full public snapshot. */
  async selling(sellerId: string) {
    const products = await this.prisma.product.findMany({
      where: { sellerId, isAuction: true },
      orderBy: { auctionEndsAt: 'asc' },
    });
    return Promise.all(products.map(async (p) => ({ ...p, ...(await this.withPublic(p, true)) })));
  }

  async close(slug: string, user: AuthUser) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product || !product.isAuction) throw AppException.notFound('auctions.not_found', 'Auction not found');
    if (product.sellerId !== user.id && !isAdmin(user)) throw AppException.forbidden('auctions.not_owner', 'Not your auction');
    if (product.auctionSettledAt) {
      throw AppException.badRequest('auctions.already_ended', 'This auction has already ended.');
    }
    await this.prisma.product.update({ where: { id: product.id }, data: { auctionEndsAt: new Date() } });
    const winner = await this.settleAuction(product);
    return { ok: true, winner };
  }

  /**
   * BL-09: settle one auction exactly once — find the winner, send the
   * won/sold/no-bid notifications, and stamp `auctionSettledAt`. The stamp is
   * claimed conditionally so a manual `close()` racing the scheduled closer can't
   * double-notify. Called by both paths. (Minting the winner's order/escrow is
   * Phase J territory — this only closes and notifies.)
   */
  private async settleAuction(product: { id: string; name: string; slug: string; sellerId: string | null; reserveCents: number | null }) {
    const claimed = await this.prisma.product.updateMany({
      where: { id: product.id, auctionSettledAt: null },
      data: { auctionSettledAt: new Date() },
    });
    if (claimed.count === 0) return null; // already settled by the other path

    const top = await this.prisma.auctionBid.findFirst({
      where: { productId: product.id },
      orderBy: { amountCents: 'desc' },
      include: { bidder: { select: { id: true, name: true } } },
    });
    // BL-09: a reserve that wasn't met means the lot did NOT sell — treat as no winner.
    const winner = top && (product.reserveCents == null || top.amountCents >= product.reserveCents) ? top : null;

    if (winner) {
      const priceLabel = `$${(winner.amountCents / 100).toLocaleString()}`;
      await this.notifications.create({
        userId: winner.bidderId,
        system: 'auctions',
        type: 'auction.won',
        params: { amount: priceLabel, product: product.name },
        data: { productId: product.id, slug: product.slug, amountCents: winner.amountCents },
        linkUrl: `/product/${product.slug}`,
      });
      if (product.sellerId) {
        await this.notifications.create({
          userId: product.sellerId,
          system: 'auctions',
          type: 'auction.sold',
          params: { product: product.name, amount: priceLabel, buyer: winner.bidder.name },
          data: { productId: product.id, slug: product.slug, amountCents: winner.amountCents },
          linkUrl: '/console/auctions',
        });
      }
    } else if (product.sellerId) {
      await this.notifications.create({
        userId: product.sellerId,
        system: 'auctions',
        type: 'auction.closed_no_bids',
        params: { product: product.name },
        data: { productId: product.id, slug: product.slug },
        linkUrl: '/console/auctions',
        email: false,
      });
    }
    return winner;
  }

  /**
   * BL-09: close lapsed auctions. Runs every 5 minutes; picks up lots whose
   * countdown ran out but that were never manually closed — previously these
   * stranded both parties (no winner, no notification). Idempotent via the
   * `auctionSettledAt` claim in settleAuction.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async closeLapsedAuctions() {
    const lapsed = await this.prisma.product.findMany({
      where: { isAuction: true, auctionSettledAt: null, auctionEndsAt: { not: null, lte: new Date() } },
      select: { id: true, name: true, slug: true, sellerId: true, reserveCents: true },
      take: 200,
    });
    for (const p of lapsed) {
      try {
        await this.settleAuction(p);
      } catch (err) {
        this.logger.error(`Failed to auto-close auction ${p.slug}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  async adminList(status?: string) {
    const where: Prisma.ProductWhereInput = { isAuction: true };
    if (status && ['pending', 'live', 'rejected', 'hidden'].includes(status)) where.status = status as never;
    const products = await this.prisma.product.findMany({
      where,
      include: { seller: { select: { id: true, name: true } } },
      orderBy: { auctionEndsAt: 'asc' },
    });
    return Promise.all(products.map(async (p) => ({ ...p, ...(await this.withPublic(p, true)) })));
  }

  async adminCancel(slug: string) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product || !product.isAuction) throw AppException.notFound('auctions.not_found', 'Auction not found');
    await this.prisma.product.update({ where: { id: product.id }, data: { auctionEndsAt: new Date(), status: 'hidden' } });
    return { ok: true };
  }
}

@ApiTags('auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(private auctions: AuctionsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(@CurrentUser() user: AuthUser | undefined, @Locale() locale: Lang) {
    return this.auctions.list(user, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.auctions.myBids(user.id);
  }

  // Static segments must precede `:slug` or Nest will match them as a slug.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Get('selling')
  selling(@CurrentUser() user: AuthUser) {
    return this.auctions.selling(user.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  detail(@CurrentUser() user: AuthUser | undefined, @Param('slug') slug: string, @Locale() locale: Lang) {
    return this.auctions.detail(slug, user, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':slug/close')
  close(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.auctions.close(slug, user);
  }

  // Public, masked bid history — open ascending auctions show every offer price.
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug/bids')
  bids(@CurrentUser() user: AuthUser | undefined, @Param('slug') slug: string) {
    return this.auctions.bids(slug, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Post(':slug/bids')
  place(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() dto: PlaceBidDto) {
    return this.auctions.place(slug, user, dto.amount);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Post(':slug/autobid')
  setAutoBid(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() dto: AutoBidDto) {
    return this.auctions.setAutoBid(slug, user, dto.max);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Delete(':slug/autobid')
  clearAutoBid(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.auctions.clearAutoBid(slug, user);
  }
}

/** Admin auction oversight: list all, inspect the bid book, close or void. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('auctions_manage')
@Controller('admin/auctions')
export class AdminAuctionsController {
  constructor(private auctions: AuctionsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.auctions.adminList(status);
  }

  @Get(':slug')
  detail(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.auctions.detail(slug, user);
  }

  @Get(':slug/bids')
  bids(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.auctions.bids(slug, user);
  }

  @Post(':slug/close')
  close(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.auctions.close(slug, user);
  }

  @Post(':slug/cancel')
  cancel(@Param('slug') slug: string) {
    return this.auctions.adminCancel(slug);
  }
}

@Module({ controllers: [AuctionsController, AdminAuctionsController], providers: [AuctionsService] })
export class AuctionsModule {}
