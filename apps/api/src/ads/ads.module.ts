import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { TextTranslationService } from '../translation/text-translation.service';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';

export class CreateAdDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) dailyBudgetCents!: number;
}

export class UpdateAdDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(1) dailyBudgetCents?: number;
}

export class RejectAdDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

const AD_INCLUDE = {
  product: { select: { id: true, name: true, emoji: true } },
} as const;

@Injectable()
export class AdsService {
  constructor(
    private prisma: PrismaService,
    private text: TextTranslationService,
  ) {}

  /**
   * Localize a batch of campaigns in place: the embedded `product.name` and the
   * campaign's own free-text `rejectionReason`. Both are English in the DB with
   * no per-type translation table, so they ride the generic translate-on-read
   * cache. Mutates the joined objects (same references returned). No-op for en.
   */
  private async localizeCampaigns<
    T extends { rejectionReason?: string | null; product?: { name?: string | null } | null },
  >(rows: T[], locale: Lang): Promise<T[]> {
    const names = await this.text.localizeMany(rows.map((r) => r.product?.name), locale);
    const reasons = await this.text.localizeMany(rows.map((r) => r.rejectionReason), locale);
    rows.forEach((r, i) => {
      if (typeof names[i] === 'string' && r.product) r.product.name = names[i] as string;
      if (typeof reasons[i] === 'string') r.rejectionReason = reasons[i] as string;
    });
    return rows;
  }

  async mine(sellerId: string, locale: Lang = 'en') {
    const rows = await this.prisma.adCampaign.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: AD_INCLUDE,
    });
    return this.localizeCampaigns(rows, locale);
  }

  async create(sellerId: string, dto: CreateAdDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Not your product');
    return this.prisma.adCampaign.create({
      // Every new campaign awaits admin approval before it can go live.
      data: { sellerId, productId: dto.productId, dailyBudgetCents: dto.dailyBudgetCents, status: 'pending' },
      include: AD_INCLUDE,
    });
  }

  /**
   * Toggling `active` is the seller's pause/resume and never re-triggers review.
   * Changing the budget re-opens moderation, since spend is what admins approve.
   */
  async update(id: string, sellerId: string, dto: UpdateAdDto) {
    const ad = await this.prisma.adCampaign.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('Campaign not found');
    if (ad.sellerId !== sellerId) throw new ForbiddenException('Not your campaign');

    const budgetChanged = dto.dailyBudgetCents != null && dto.dailyBudgetCents !== ad.dailyBudgetCents;
    // A rejected campaign resubmitted with a new budget goes back into the queue.
    const reReview = budgetChanged && ad.status !== 'pending';

    return this.prisma.adCampaign.update({
      where: { id },
      data: {
        ...(dto.active != null ? { active: dto.active } : {}),
        ...(dto.dailyBudgetCents != null ? { dailyBudgetCents: dto.dailyBudgetCents } : {}),
        ...(reReview ? { status: 'pending', reviewedAt: null, reviewedById: null, rejectionReason: null } : {}),
      },
      include: AD_INCLUDE,
    });
  }

  /**
   * The products behind LIVE campaigns: approved + not paused + the product
   * itself approved. Weighted by daily budget so bigger spenders surface more
   * often, then shuffled within weight so the rail isn't static on every load.
   */
  async promoted(limit = 8, locale: Lang = 'en') {
    const campaigns = await this.prisma.adCampaign.findMany({
      where: { status: 'approved', active: true, product: { approved: true } },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
            seller: { select: { id: true, name: true } },
            market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } },
          },
        },
      },
    });
    // One product may run several campaigns; keep its best-funded one.
    const byProduct = new Map<string, (typeof campaigns)[number]>();
    for (const c of campaigns) {
      const seen = byProduct.get(c.productId);
      if (!seen || c.dailyBudgetCents > seen.dailyBudgetCents) byProduct.set(c.productId, c);
    }
    const chosen = [...byProduct.values()]
      .map((c) => ({ c, key: Math.random() * c.dailyBudgetCents }))
      .sort((a, b) => b.key - a.key)
      .slice(0, Math.max(1, Math.min(limit, 24)))
      .map(({ c }) => c);
    // Count a served campaign as one impression (fire-and-forget).
    if (chosen.length) {
      void this.prisma.adCampaign
        .updateMany({ where: { id: { in: chosen.map((c) => c.id) } }, data: { impressions: { increment: 1 } } })
        .catch(() => undefined);
    }
    const products = chosen.map((c) => c.product);
    // Category/subcategory/market names are localized elsewhere; the priority
    // free-text here is the product name.
    const names = await this.text.localizeMany(products.map((p) => p.name), locale);
    products.forEach((p, i) => {
      if (typeof names[i] === 'string') p.name = names[i] as string;
    });
    return products;
  }

  /** Public click tracking — increments a campaign's click counter. */
  async recordClick(id: string) {
    await this.prisma.adCampaign.updateMany({ where: { id }, data: { clicks: { increment: 1 } } });
    return { ok: true };
  }

  /** Admin overview: every campaign, optionally filtered to the review queue. */
  async all(status?: string, locale: Lang = 'en') {
    const rows = await this.prisma.adCampaign.findMany({
      where: status === 'pending' || status === 'approved' || status === 'rejected' ? { status } : {},
      // Pending first so the review queue is never buried.
      orderBy: [{ status: 'asc' }, { active: 'desc' }, { createdAt: 'desc' }],
      include: {
        product: { select: { id: true, name: true, emoji: true } },
        seller: { select: { id: true, name: true } },
      },
    });
    return this.localizeCampaigns(rows, locale);
  }

  async decide(id: string, adminId: string, status: 'approved' | 'rejected', reason?: string) {
    const ad = await this.prisma.adCampaign.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('Campaign not found');
    return this.prisma.adCampaign.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: adminId,
        rejectionReason: status === 'rejected' ? (reason ?? null) : null,
      },
      include: { ...AD_INCLUDE, seller: { select: { id: true, name: true } } },
    });
  }
}

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private ads: AdsService) {}

  /** Public — powers the homepage "Highlighted Products" rail. */
  @Get('promoted')
  promoted(@Locale() locale: Lang, @Query('limit') limit?: string) {
    return this.ads.promoted(limit ? Number(limit) : 8, locale);
  }

  /** Public click tracking beacon for a promoted campaign. */
  // API-16: the beacon must stay unauthenticated (public storefront visitors), but
  // a tight per-IP throttle stops a script from inflating a paid campaign's click
  // count. Legitimate viewing can't plausibly exceed this.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post(':id/click')
  click(@Param('id') id: string) {
    return this.ads.recordClick(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Get()
  mine(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.ads.mine(u.id, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateAdDto) {
    return this.ads.create(u.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateAdDto) {
    return this.ads.update(id, u.id, dto);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('ads_moderate')
@Controller('admin/ads')
export class AdminAdsController {
  constructor(private ads: AdsService) {}

  @Get() all(@Locale() locale: Lang, @Query('status') status?: string) {
    return this.ads.all(status, locale);
  }

  @Patch(':id/approve')
  approve(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.ads.decide(id, u.id, 'approved');
  }

  @Patch(':id/reject')
  reject(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: RejectAdDto) {
    return this.ads.decide(id, u.id, 'rejected', dto.reason);
  }
}

@Module({
  controllers: [AdsController, AdminAdsController],
  providers: [AdsService],
})
export class AdsModule {}
