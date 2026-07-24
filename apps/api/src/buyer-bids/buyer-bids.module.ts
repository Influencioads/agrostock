import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { uploadLimits } from '../uploads/upload-limits';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Prisma, BuyerBidMode } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// API-16: images must be an uploaded root-relative path or an http(s) URL — never
// a `javascript:` / `data:` / `vbscript:` value that could execute when a client
// renders the src. Blocks stored-XSS via the goods-wanted photos.
const SAFE_IMAGE_REF = /^(?:https?:\/\/|\/)[^\s]*$/i;
import { MAX_MONEY_CENTS, MAX_QTY } from '../common/limits';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { flagFor, maskName } from '../common/masking';
import { JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { secureReference } from '../common/secure-random';
import { NotificationsService, type NotificationParams } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BUYER_BID_UPSERTED, type ContentUpsertedEvent } from '../translation/translation.events';
import { Locale, localize } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';
import { PRODUCT_UNITS, toUnit } from '@agrotraders/types';

/** Gallery cap on a buyer's requirement photos (mirrors MAX_PRODUCT_IMAGES). */
export const MAX_BUYER_BID_IMAGES = 6;

const ref = () => secureReference('BID');
// BL-13: 2 decimals so cents aren't truncated in the display string.
const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isAdmin = (u: AuthUser) => (u.roles ?? [u.role]).includes('admin');

/**
 * A requirement is finished once it leaves `open` — awarded, closed or cancelled
 * — or once whichever clock it runs on has expired. Mirrors the exclusions
 * `open()` and `live()` already apply to the public boards.
 */
const isCompleted = (b: { status: string; deadline: Date | null; auctionEndsAt: Date | null }) =>
  b.status !== 'open' ||
  (!!b.deadline && b.deadline.getTime() <= Date.now()) ||
  (!!b.auctionEndsAt && b.auctionEndsAt.getTime() <= Date.now());

// ── DTOs ─────────────────────────────────────────────────────────

export class CreateBuyerBidDto {
  @ApiProperty({ enum: ['quote', 'auction'], default: 'quote' })
  @IsOptional() @IsIn(['quote', 'auction']) mode?: BuyerBidMode;

  @ApiProperty() @IsString() @MaxLength(160) title!: string;
  @ApiProperty() @IsString() @MaxLength(160) productName!: string;
  @ApiProperty({ minimum: 0.01, maximum: MAX_QTY }) @IsNumber() @Min(0.01) @Max(MAX_QTY) qtyValue!: number;
  @ApiProperty({ required: false, enum: PRODUCT_UNITS, default: 'MT' }) @IsOptional() @IsIn(PRODUCT_UNITS as unknown as string[]) qtyUnit?: string;

  @ApiProperty({ required: false, description: 'Target / ceiling price per unit, USD cents' })
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) targetPriceCents?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) deliveryPlace?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) destinationCountry?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() deadline?: string;
  @ApiProperty({ required: false, description: 'mode=auction only' }) @IsOptional() @IsDateString() auctionEndsAt?: string;
  @ApiProperty({ required: false, maxLength: 800 }) @IsOptional() @IsString() @MaxLength(800) notes?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() categoryId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() productId?: string;

  @ApiProperty({ required: false, type: [String], description: 'Photos of the goods wanted; first is the cover.' })
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_BUYER_BID_IMAGES) @IsString({ each: true })
  @Matches(SAFE_IMAGE_REF, { each: true, message: 'images must be uploaded paths or http(s) URLs' })
  images?: string[];
}

export class SubmitSellerBidDto {
  @ApiProperty({ description: 'Offered price per unit, USD cents' }) @IsInt() @Min(1) @Max(MAX_MONEY_CENTS) priceCents!: number;
  @ApiProperty({ minimum: 0.01, maximum: MAX_QTY }) @IsNumber() @Min(0.01) @Max(MAX_QTY) qtyValue!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) etaDays?: number;
  @ApiProperty({ required: false, maxLength: 600 }) @IsOptional() @IsString() @MaxLength(600) message?: string;
}

const BUYER_BID_INCLUDE = {
  buyer: { select: { id: true, name: true, country: true } },
  category: { select: { id: true, name: true, slug: true, emoji: true } },
  product: { select: { id: true, name: true, slug: true, emoji: true } },
} as const;

const SELLER_BID_INCLUDE = {
  seller: { select: { id: true, name: true, country: true } },
} as const;

/** Translatable columns on a buyer bid, folded from its translation row. */
const BID_TR_FIELDS = ['title', 'productName', 'notes'] as const;

interface BuyerBidTranslationRow {
  title: string;
  productName: string;
  notes: string | null;
}

function localizeBid<
  T extends {
    title: string;
    productName: string;
    notes: string | null;
    translations?: BuyerBidTranslationRow[];
  },
>(row: T): T {
  return localize(row, [...BID_TR_FIELDS]);
}

@Injectable()
export class BuyerBidsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private events: EventEmitter2,
  ) {}

  private async notify(userId: string, type: string, params: NotificationParams | undefined, data?: Record<string, unknown>) {
    // Persist + fan-out (realtime/push/email) is all handled by create(); title/body
    // are rendered from the `notification:<type>` catalog in the recipient's locale.
    await this.notifications.create({ userId, system: 'bids', type, params, data });
  }

  /**
   * A completed requirement is owner-scoped: the buyer who raised it, an admin,
   * and any seller who actually bid on it keep their access (it stays in their
   * dashboards and history). For everyone else a stale link 404s rather than
   * exposing a settled book — the read mirror of the board exclusions.
   */
  private async assertVisible(
    buyerBid: { id: string; buyerId: string; status: string; deadline: Date | null; auctionEndsAt: Date | null },
    viewer: AuthUser | undefined,
  ) {
    if (!isCompleted(buyerBid)) return;
    if (viewer && (buyerBid.buyerId === viewer.id || isAdmin(viewer))) return;
    const own = viewer
      ? await this.prisma.sellerBid.findFirst({
          where: { buyerBidId: buyerBid.id, sellerId: viewer.id },
          select: { id: true },
        })
      : null;
    if (!own) throw new NotFoundException('Requirement not found');
  }

  /** Lowest submitted price on a buyer bid, or null when nobody has bid. */
  private async bestPriceCents(buyerBidId: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const best = await tx.sellerBid.findFirst({
      where: { buyerBidId, status: { in: ['submitted', 'awarded'] } },
      orderBy: { priceCents: 'asc' },
      select: { priceCents: true },
    });
    return best?.priceCents ?? null;
  }

  // ── buyer ──────────────────────────────────────────────────────

  async create(buyer: AuthUser, dto: CreateBuyerBidDto) {
    const mode = dto.mode ?? 'quote';
    if (mode === 'auction' && !dto.auctionEndsAt) {
      throw new BadRequestException('An auction requirement needs a closing time.');
    }
    if (mode === 'auction' && new Date(dto.auctionEndsAt!).getTime() <= Date.now()) {
      throw new BadRequestException('The auction closing time must be in the future.');
    }
    const bid = await this.prisma.buyerBid.create({
      data: {
        reference: ref(),
        mode,
        title: dto.title,
        productName: dto.productName,
        qtyValue: dto.qtyValue,
        qtyUnit: toUnit(dto.qtyUnit),
        targetPriceCents: dto.targetPriceCents,
        deliveryPlace: dto.deliveryPlace,
        destinationCountry: dto.destinationCountry,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        auctionEndsAt: mode === 'auction' ? new Date(dto.auctionEndsAt!) : null,
        notes: dto.notes,
        images: dto.images ?? [],
        categoryId: dto.categoryId || null,
        productId: dto.productId || null,
        buyerId: buyer.id,
      },
      include: BUYER_BID_INCLUDE,
    });
    this.events.emit(BUYER_BID_UPSERTED, { id: bid.id } satisfies ContentUpsertedEvent);
    return bid;
  }

  /** Buyer's own requirements, each with a bid count and the best price so far. */
  async mine(buyerId: string, locale: Lang = 'en') {
    const buyerBids = await this.prisma.buyerBid.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: { ...BUYER_BID_INCLUDE, _count: { select: { sellerBids: true } }, translations: { where: { locale } } },
    });
    return Promise.all(
      buyerBids.map(async (r) => ({ ...localizeBid(r), bestPriceCents: await this.bestPriceCents(r.id) })),
    );
  }

  /** Admin view: every buyer bid on the platform with its seller-bid count. */
  async adminList(status?: string) {
    const where: Prisma.BuyerBidWhereInput = {};
    if (status && ['open', 'awarded', 'closed', 'cancelled'].includes(status)) where.status = status as never;
    const buyerBids = await this.prisma.buyerBid.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { ...BUYER_BID_INCLUDE, _count: { select: { sellerBids: true } } },
    });
    return Promise.all(buyerBids.map(async (r) => ({ ...r, bestPriceCents: await this.bestPriceCents(r.id) })));
  }

  async cancel(id: string, user: AuthUser) {
    const buyerBid = await this.prisma.buyerBid.findUnique({ where: { id } });
    if (!buyerBid) throw new NotFoundException('Requirement not found');
    if (buyerBid.buyerId !== user.id && !isAdmin(user)) throw new ForbiddenException('Not your requirement');
    if (buyerBid.status !== 'open') throw new BadRequestException('Only an open requirement can be cancelled.');
    return this.prisma.buyerBid.update({ where: { id }, data: { status: 'cancelled' }, include: BUYER_BID_INCLUDE });
  }

  /**
   * Buyer picks a winner. The awarded seller bid becomes a real Order
   * (`processing`) so it drops straight into both dashboards — the buyer-bid
   * analogue of `TransportService.acceptQuote`.
   */
  async award(buyerBidId: string, sellerBidId: string, user: AuthUser) {
    const buyerBid = await this.prisma.buyerBid.findUnique({ where: { id: buyerBidId } });
    if (!buyerBid) throw new NotFoundException('Requirement not found');
    if (buyerBid.buyerId !== user.id && !isAdmin(user)) throw new ForbiddenException('Not your requirement');
    if (buyerBid.status !== 'open') throw new BadRequestException('This requirement is already closed.');

    const sellerBid = await this.prisma.sellerBid.findUnique({ where: { id: sellerBidId } });
    if (!sellerBid || sellerBid.buyerBidId !== buyerBidId) throw new NotFoundException('Bid not found');
    if (sellerBid.status !== 'submitted') throw new BadRequestException('That bid is no longer available.');

    const amountCents = Math.round(sellerBid.priceCents * sellerBid.qtyValue);

    const result = await this.prisma.$transaction(async (tx) => {
      // F15: claim the requirement AND the winning bid with conditional
      // transitions FIRST. If a concurrent award (or double tap) already closed
      // either, updateMany matches zero rows and we abort before creating a
      // second order — a single conditional winner, no duplicate orders.
      const claimedBid = await tx.buyerBid.updateMany({
        where: { id: buyerBidId, status: 'open' },
        data: { status: 'awarded', awardedSellerBidId: sellerBidId },
      });
      if (claimedBid.count === 0) throw new BadRequestException('This requirement is already closed.');
      const claimedSeller = await tx.sellerBid.updateMany({
        where: { id: sellerBidId, buyerBidId, status: 'submitted' },
        data: { status: 'awarded' },
      });
      if (claimedSeller.count === 0) throw new BadRequestException('That bid is no longer available.');

      // BL-08: reserve stock for the awarded order on a managed listing, inside
      // this transaction — an oversold award rolls back the whole win. Rounds to
      // match settleReservation (delivery capture / cancel release use the same).
      const reserveQty = Math.max(0, Math.round(sellerBid.qtyValue));
      if (buyerBid.productId && reserveQty > 0) {
        const product = await tx.product.findUnique({ where: { id: buyerBid.productId }, select: { stockQty: true } });
        if (product && product.stockQty !== null) {
          const reserved = await tx.$executeRaw`
            UPDATE "Product"
            SET "reservedQty" = "reservedQty" + ${reserveQty}
            WHERE "id" = ${buyerBid.productId}
              AND "stockQty" IS NOT NULL
              AND "stockQty" - "reservedQty" >= ${reserveQty}`;
          if (reserved === 0) throw new BadRequestException('Not enough stock available to award this quantity.');
        }
      }

      const order = await tx.order.create({
        data: {
          reference: secureReference('AG'),
          status: 'processing',
          // Numeric + display string move together — analytics parse the string.
          amountCents,
          amount: usd(amountCents),
          unitPriceCents: sellerBid.priceCents,
          qtyValue: sellerBid.qtyValue,
          qtyUnit: buyerBid.qtyUnit,
          qty: `${sellerBid.qtyValue} ${buyerBid.qtyUnit}`,
          note: `Awarded from ${buyerBid.reference} — ${buyerBid.title}`,
          productId: buyerBid.productId,
          buyerId: buyerBid.buyerId,
          sellerId: sellerBid.sellerId,
        },
        include: { product: { select: { name: true } }, seller: { select: { name: true } } },
      });
      await tx.orderEvent.create({
        data: { orderId: order.id, type: 'order_placed', actorId: user.id, toStatus: 'processing', note: `Awarded from ${buyerBid.reference}` },
      });
      await tx.sellerBid.updateMany({ where: { buyerBidId, id: { not: sellerBidId }, status: 'submitted' }, data: { status: 'rejected' } });
      const updatedBuyerBid = await tx.buyerBid.update({
        where: { id: buyerBidId },
        data: { orderId: order.id },
        include: BUYER_BID_INCLUDE,
      });
      return { buyerBid: updatedBuyerBid, order };
    });

    await this.notify(sellerBid.sellerId, 'buyer_bid.awarded', { reference: buyerBid.reference, orderReference: result.order.reference }, {
      buyerBidId,
      orderId: result.order.id,
    });
    // Buyer copy under the transactional `orders` category so it also emails
    // (the `bids` category above is push/in-app only).
    await this.notifications.create({
      userId: buyerBid.buyerId,
      system: 'orders',
      type: 'order.bid_awarded',
      params: { reference: buyerBid.reference, orderReference: result.order.reference },
      data: { buyerBidId, orderId: result.order.id },
      linkUrl: `/orders/${result.order.id}`,
    });
    return result;
  }

  // ── seller ─────────────────────────────────────────────────────

  /** Open requirements a seller can bid on. Excludes ones whose deadline has passed. */
  async open(query: { categoryId?: string; search?: string }, locale: Lang = 'en') {
    const now = new Date();
    const buyerBids = await this.prisma.buyerBid.findMany({
      where: {
        status: 'open',
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { productName: { contains: query.search, mode: 'insensitive' } }] } : {}),
        AND: [
          { OR: [{ deadline: null }, { deadline: { gt: now } }] },
          { OR: [{ auctionEndsAt: null }, { auctionEndsAt: { gt: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { ...BUYER_BID_INCLUDE, _count: { select: { sellerBids: true } }, translations: { where: { locale } } },
    });
    return Promise.all(
      buyerBids.map(async (r) => ({
        ...localizeBid(r),
        // Reverse auctions publish the price to beat; quote-mode requirements stay sealed.
        bestPriceCents: r.mode === 'auction' ? await this.bestPriceCents(r.id) : null,
      })),
    );
  }

  myBids(sellerId: string) {
    return this.prisma.sellerBid.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: { buyerBid: { include: BUYER_BID_INCLUDE } },
    });
  }

  /**
   * The public bids board — open auction-mode requirements, soonest-closing
   * first. The buyer-side mirror of `AuctionsService.list()`: identities are
   * never here (only the count + best price), so it is safe to serve logged-out.
   * Quote-mode requirements are sealed and deliberately excluded.
   */
  async live(locale: Lang = 'en') {
    const now = new Date();
    const buyerBids = await this.prisma.buyerBid.findMany({
      where: {
        mode: 'auction',
        status: 'open',
        OR: [{ auctionEndsAt: null }, { auctionEndsAt: { gt: now } }],
      },
      orderBy: { auctionEndsAt: 'asc' },
      include: { ...BUYER_BID_INCLUDE, _count: { select: { sellerBids: true } }, translations: { where: { locale } } },
    });
    return Promise.all(
      buyerBids.map(async (r) => ({ ...localizeBid(r), bestPriceCents: await this.bestPriceCents(r.id) })),
    );
  }

  /**
   * Submit a seller bid.
   *   quote mode   → any price; the buyer compares.
   *   auction mode → a *reverse* auction, so the price must undercut the
   *                  current best. Serializable so two simultaneous bids can't
   *                  both clear the same floor (mirrors AuctionsService.place).
   */
  async submitBid(buyerBidId: string, seller: AuthUser, dto: SubmitSellerBidDto) {
    const buyerBid = await this.prisma.buyerBid.findUnique({ where: { id: buyerBidId } });
    if (!buyerBid) throw new NotFoundException('Requirement not found');
    if (buyerBid.buyerId === seller.id) throw new BadRequestException('You cannot bid on your own requirement.');
    if (buyerBid.status !== 'open') throw new BadRequestException('This requirement is closed.');
    if (buyerBid.deadline && buyerBid.deadline.getTime() < Date.now()) throw new BadRequestException('The bidding deadline has passed.');
    if (buyerBid.auctionEndsAt && buyerBid.auctionEndsAt.getTime() < Date.now()) throw new BadRequestException('This auction has ended.');

    if (buyerBid.mode === 'quote') {
      await this.prisma.sellerBid.create({
        data: { buyerBidId, sellerId: seller.id, priceCents: dto.priceCents, qtyValue: dto.qtyValue, etaDays: dto.etaDays, message: dto.message },
      });
      await this.notify(buyerBid.buyerId, 'buyer_bid.new_seller_bid', { amount: usd(dto.priceCents), unit: buyerBid.qtyUnit, reference: buyerBid.reference }, { buyerBidId });
      return this.detail(buyerBidId, seller);
    }

    let previousBestSellerId: string | null = null;
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const best = await tx.sellerBid.findFirst({
            where: { buyerBidId, status: 'submitted' },
            orderBy: { priceCents: 'asc' },
            select: { priceCents: true, sellerId: true },
          });
          if (best && dto.priceCents >= best.priceCents) {
            // Reverse auction: the floor is public, so naming it is safe and useful.
            throw new BadRequestException(`Your price must be below the current best of ${usd(best.priceCents)} per ${buyerBid.qtyUnit}.`);
          }
          previousBestSellerId = best?.sellerId ?? null;
          await tx.sellerBid.create({
            data: { buyerBidId, sellerId: seller.id, priceCents: dto.priceCents, qtyValue: dto.qtyValue, etaDays: dto.etaDays, message: dto.message },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Another bid landed first — please try again with a lower price.');
    }

    await this.notify(buyerBid.buyerId, 'buyer_bid.new_seller_bid', { amount: usd(dto.priceCents), unit: buyerBid.qtyUnit, reference: buyerBid.reference }, { buyerBidId });
    if (previousBestSellerId && previousBestSellerId !== seller.id) {
      await this.notify(previousBestSellerId, 'buyer_bid.outbid', { reference: buyerBid.reference }, { buyerBidId });
    }
    return this.detail(buyerBidId, seller);
  }

  // ── shared read ────────────────────────────────────────────────

  /**
   * Seller-bid visibility is the inverse of a seller-side auction:
   *   buyer/admin  → every bid, ranked cheapest first.
   *   quote mode   → a seller sees only their own bids (sealed).
   *   auction mode → a seller additionally sees the current best price
   *                  (never the identities) so they know what to beat.
   */
  async detail(id: string, user: AuthUser | undefined, locale: Lang = 'en') {
    const row = await this.prisma.buyerBid.findUnique({
      where: { id },
      include: { ...BUYER_BID_INCLUDE, translations: { where: { locale } } },
    });
    if (!row) throw new NotFoundException('Requirement not found');
    await this.assertVisible(row, user);
    const buyerBid = localizeBid(row);

    const ownerView = !!user && (buyerBid.buyerId === user.id || isAdmin(user));
    // Owner/admin see every row; a signed-in non-owner sees only their own
    // (sealed); a logged-out viewer sees none here — the masked book endpoint
    // is what a public visitor reads.
    const sellerBids = ownerView
      ? await this.prisma.sellerBid.findMany({ where: { buyerBidId: id }, orderBy: { priceCents: 'asc' }, include: SELLER_BID_INCLUDE })
      : user
        ? await this.prisma.sellerBid.findMany({ where: { buyerBidId: id, sellerId: user.id }, orderBy: { priceCents: 'asc' }, include: SELLER_BID_INCLUDE })
        : [];

    const bestPriceCents = ownerView || buyerBid.mode === 'auction' ? await this.bestPriceCents(id) : null;

    // Counts are safe in both modes: they say how much competition there is
    // without saying who or at what price. The bid room shows them even when
    // the book itself is sealed.
    const [sellers, bidCount] = await Promise.all([
      this.prisma.sellerBid.groupBy({
        by: ['sellerId'],
        where: { buyerBidId: id, status: { in: ['submitted', 'awarded'] } },
      }),
      this.prisma.sellerBid.count({ where: { buyerBidId: id, status: { in: ['submitted', 'awarded'] } } }),
    ]);
    const yourBestPriceCents = ownerView
      ? null
      : (sellerBids.find((b) => b.status === 'submitted' || b.status === 'awarded')?.priceCents ?? null);

    return {
      ...buyerBid,
      sellerBids,
      bestPriceCents,
      isOwner: ownerView,
      sellerCount: sellers.length,
      bidCount,
      yourBestPriceCents,
    };
  }

  /**
   * The bid book: every seller bid with identities masked, cheapest first.
   *
   * The reverse of `AuctionsService.bids()` — lowest price is `isTop`, not
   * highest — and sealed in quote mode, where a seller only ever sees rows they
   * authored. Publishing the book in auction mode discloses nothing new: `open()`
   * already returns `bestPriceCents` and `submitBid()` names the floor in its
   * error, so the price to beat is public there by design.
   */
  async bids(id: string, viewer: AuthUser | undefined) {
    const buyerBid = await this.prisma.buyerBid.findUnique({ where: { id } });
    if (!buyerBid) throw new NotFoundException('Requirement not found');
    await this.assertVisible(buyerBid, viewer);

    const ownerView = !!viewer && (buyerBid.buyerId === viewer.id || isAdmin(viewer));
    const sealed = !ownerView && buyerBid.mode === 'quote';
    // Sealed quote mode shows a seller only their own rows; a logged-out visitor
    // has none, so the book is empty for them (the count still comes from detail()).
    if (sealed && !viewer) return [];

    const rows = await this.prisma.sellerBid.findMany({
      where: {
        buyerBidId: id,
        status: { in: ['submitted', 'awarded'] },
        ...(sealed && viewer ? { sellerId: viewer.id } : {}),
      },
      // Tie-break on time so the ranking is stable and the earliest of two
      // equal prices wins. Matches `bestPriceCents`'s status filter, so the
      // book and the headline price can never disagree.
      orderBy: [{ priceCents: 'asc' }, { createdAt: 'asc' }],
      take: 24,
      include: { seller: { select: { id: true, name: true } } },
    });

    return rows.map((b, i) => {
      const isYou = !!viewer && viewer.id === b.sellerId;
      return {
        id: b.id,
        priceCents: b.priceCents,
        qtyValue: b.qtyValue,
        etaDays: b.etaDays,
        message: b.message,
        status: b.status,
        createdAt: b.createdAt,
        isYou,
        isTop: !sealed && i === 0,
        flag: flagFor(b.sellerId),
        masked: ownerView ? b.seller.name : isYou ? 'You' : maskName(b.seller.name),
        // The owner's award + profile links need the real id; nobody else does.
        sellerId: ownerView ? b.seller.id : null,
      };
    });
  }
}

@ApiTags('buyer-bids')
@ApiBearerAuth()
@Controller('buyer-bids')
export class BuyerBidsController {
  constructor(
    private buyerBids: BuyerBidsService,
    private uploads: UploadsService,
  ) {}

  // Guards are declared PER METHOD, not on the class: the public board, bid
  // detail and masked book are readable logged-out (mirroring auctions), while
  // every mutation and owner-scoped list stays behind JwtAuthGuard + Roles.
  // Static segments must precede `:id` or Nest will match them as an id.

  /** Public board — open auction-mode bids anyone can browse, like `/auctions`. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('live')
  live(@Locale() locale: Lang) {
    return this.buyerBids.live(locale);
  }

  /**
   * Buyer's own upload route. `/products/upload-images` is seller-only, so a
   * buyer attaching photos to a requirement would 403 against it.
   */
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('files', MAX_BUYER_BID_IMAGES, uploadLimits(MAX_BUYER_BID_IMAGES)))
  async uploadImages(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No images were uploaded.');
    // Sequential: sharp is CPU-bound, so parallelising the encodes just thrashes.
    const imageUrls: string[] = [];
    for (const file of files) imageUrls.push(await this.uploads.saveImage(file, 'buyer-bids'));
    return { imageUrls };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Get('mine')
  mine(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.buyerBids.mine(u.id, locale);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Get('mine/bids')
  myBids(@CurrentUser() u: AuthUser) {
    return this.buyerBids.myBids(u.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Get('open')
  open(@Locale() locale: Lang, @Query('categoryId') categoryId?: string, @Query('search') search?: string) {
    return this.buyerBids.open({ categoryId, search }, locale);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateBuyerBidDto) {
    return this.buyerBids.create(u, dto);
  }

  /** Public: the requirement + specs. Owner/admin get real names via the book. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  detail(@CurrentUser() u: AuthUser | undefined, @Param('id') id: string, @Locale() locale: Lang) {
    return this.buyerBids.detail(id, u, locale);
  }

  /** The masked bid book. Public for auction mode; quote mode stays sealed. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/bids')
  bids(@CurrentUser() u: AuthUser | undefined, @Param('id') id: string) {
    return this.buyerBids.bids(id, u);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Post(':id/bids')
  submitBid(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: SubmitSellerBidDto) {
    return this.buyerBids.submitBid(id, u, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Post(':id/bids/:bidId/award')
  award(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('bidId') bidId: string) {
    return this.buyerBids.award(id, bidId, u);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @Post(':id/cancel')
  cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.buyerBids.cancel(id, u);
  }
}

/** Admin oversight of buyer bids (reverse auctions / RFQs). */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('bids_manage')
@Controller('admin/buyer-bids')
export class AdminBuyerBidsController {
  constructor(private buyerBids: BuyerBidsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.buyerBids.adminList(status);
  }

  @Get(':id')
  detail(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.buyerBids.detail(id, u);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.buyerBids.cancel(id, u);
  }

  @Post(':id/bids/:bidId/award')
  award(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('bidId') bidId: string) {
    return this.buyerBids.award(id, bidId, u);
  }
}

@Module({
  controllers: [BuyerBidsController, AdminBuyerBidsController],
  providers: [BuyerBidsService],
  exports: [BuyerBidsService],
})
export class BuyerBidsModule {}
