import {
  BadRequestException,
  Body,
  ConflictException,
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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, ReviewKind, ReviewRole, ReviewStatus } from '@prisma/client';
import { REVIEW_UPSERTED, type ContentUpsertedEvent } from '../translation/translation.events';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

// ── DTOs ────────────────────────────────────────────────────────────────
class CreateReviewDto {
  @IsEnum(ReviewKind) kind!: ReviewKind;
  /** Id of the completed subject (order / trip / loader job / assignment / hire). */
  @IsString() subjectId!: string;
  /** Which counterpart this review targets. Must match the caller's side. */
  @IsEnum(ReviewRole) revieweeRole!: ReviewRole;
  @IsInt() @Min(1) @Max(5) stars!: number;
  @IsOptional() @IsString() @MaxLength(1000) text?: string;
}

/** Author self-edit — allowed at any time; only the author's own row. */
class UpdateReviewDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) stars?: number;
  @IsOptional() @IsString() @MaxLength(1000) text?: string;
}

/** Admin moderation edit — may also change status / attach an admin note. */
class AdminUpdateReviewDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) stars?: number;
  @IsOptional() @IsString() @MaxLength(1000) text?: string;
  @IsOptional() @IsEnum(ReviewStatus) status?: ReviewStatus;
  @IsOptional() @IsString() @MaxLength(500) adminNote?: string;
}

// Public list shape — never leaks moderation internals beyond status.
const REVIEW_PUBLIC_SELECT = {
  id: true,
  kind: true,
  revieweeRole: true,
  stars: true,
  text: true,
  createdAt: true,
  editedByAuthorAt: true,
  raterId: true,
  revieweeId: true,
  productId: true,
  rater: { select: { id: true, name: true } },
  reviewee: { select: { id: true, name: true } },
} satisfies Prisma.ReviewSelect;

type PartySide = { role: ReviewRole; revieweeId: string; productId?: string | null };

/** Which FK column carries the subject id for a given kind. */
const FK_FOR_KIND: Record<ReviewKind, keyof Prisma.ReviewUncheckedCreateInput> = {
  order: 'orderId',
  trip: 'tripId',
  loaderjob: 'loaderJobId',
  assignment: 'jobAssignmentId',
  hire: 'hireRequestId',
};

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private events: EventEmitter2,
  ) {}

  // ── Eligibility (the security core) ───────────────────────────────────
  /**
   * Verifies the subject is complete and the caller is a party to it, and
   * returns every counterpart-side the caller is allowed to rate. Throws when
   * the subject is missing / not complete / the caller was not involved.
   */
  private async resolveSides(
    userId: string,
    kind: ReviewKind,
    subjectId: string,
  ): Promise<{ sides: PartySide[]; extraFk?: Partial<Prisma.ReviewUncheckedCreateInput> }> {
    switch (kind) {
      case 'order': {
        const o = await this.prisma.order.findUnique({
          where: { id: subjectId },
          select: { id: true, status: true, buyerId: true, sellerId: true, productId: true },
        });
        if (!o) throw new NotFoundException('Order not found');
        if (o.status !== 'delivered') throw new BadRequestException('You can only review a delivered order');
        if (userId === o.buyerId) {
          const sides: PartySide[] = [{ role: 'seller', revieweeId: o.sellerId }];
          if (o.productId) sides.push({ role: 'product', revieweeId: o.sellerId, productId: o.productId });
          return { sides };
        }
        if (userId === o.sellerId) return { sides: [{ role: 'buyer', revieweeId: o.buyerId }] };
        throw new ForbiddenException('You were not part of this order');
      }
      case 'trip': {
        const t = await this.prisma.trip.findUnique({
          where: { id: subjectId },
          select: {
            id: true,
            status: true,
            transporterId: true,
            order: { select: { buyerId: true, sellerId: true } },
            request: { select: { createdById: true } },
          },
        });
        if (!t) throw new NotFoundException('Trip not found');
        if (t.status !== 'delivered') throw new BadRequestException('You can only review a delivered trip');
        // The transporter's client is the order dispatcher (seller) / buyer, or
        // the standalone transport-request creator.
        const clientId = t.order?.sellerId ?? t.order?.buyerId ?? t.request?.createdById ?? null;
        if (userId === t.transporterId) {
          if (!clientId) throw new BadRequestException('This trip has no client to review');
          return { sides: [{ role: 'client', revieweeId: clientId }] };
        }
        if (clientId && userId === clientId) {
          return { sides: [{ role: 'transporter', revieweeId: t.transporterId }] };
        }
        throw new ForbiddenException('You were not part of this trip');
      }
      case 'loaderjob': {
        const j = await this.prisma.loaderJob.findUnique({
          where: { id: subjectId },
          select: { id: true, status: true, createdById: true, loadercoId: true },
        });
        if (!j) throw new NotFoundException('Loader job not found');
        if (j.status !== 'completed') throw new BadRequestException('You can only review a completed job');
        if (!j.loadercoId) throw new BadRequestException('This job has no loader company');
        if (userId === j.createdById) return { sides: [{ role: 'loaderco', revieweeId: j.loadercoId }] };
        if (userId === j.loadercoId) return { sides: [{ role: 'client', revieweeId: j.createdById }] };
        throw new ForbiddenException('You were not part of this job');
      }
      case 'assignment': {
        const a = await this.prisma.jobAssignment.findUnique({
          where: { id: subjectId },
          select: {
            id: true,
            status: true,
            jobId: true,
            job: { select: { createdById: true } },
            worker: { select: { userId: true } },
          },
        });
        if (!a) throw new NotFoundException('Assignment not found');
        if (a.status !== 'completed') throw new BadRequestException('You can only review a completed assignment');
        const extraFk = { loaderJobId: a.jobId };
        if (userId === a.job.createdById) {
          if (!a.worker.userId) throw new BadRequestException('This worker has no account to review');
          return { sides: [{ role: 'worker', revieweeId: a.worker.userId }], extraFk };
        }
        if (a.worker.userId && userId === a.worker.userId) {
          return { sides: [{ role: 'client', revieweeId: a.job.createdById }], extraFk };
        }
        throw new ForbiddenException('You were not part of this assignment');
      }
      case 'hire': {
        const h = await this.prisma.hireRequest.findUnique({
          where: { id: subjectId },
          select: { id: true, escrowState: true, requesterId: true, targetUserId: true, targetType: true },
        });
        if (!h) throw new NotFoundException('Hire request not found');
        if (h.escrowState !== 'released') throw new BadRequestException('You can only review a completed hire');
        if (userId === h.requesterId) {
          return { sides: [{ role: h.targetType as ReviewRole, revieweeId: h.targetUserId }] };
        }
        if (userId === h.targetUserId) return { sides: [{ role: 'client', revieweeId: h.requesterId }] };
        throw new ForbiddenException('You were not part of this hire');
      }
      default:
        throw new BadRequestException('Unknown review kind');
    }
  }

  // ── Create ────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateReviewDto) {
    const { sides, extraFk } = await this.resolveSides(userId, dto.kind, dto.subjectId);
    const side = sides.find((s) => s.role === dto.revieweeRole);
    if (!side) {
      throw new BadRequestException(
        `You cannot leave a "${dto.revieweeRole}" review for this ${dto.kind}`,
      );
    }
    if (side.revieweeId === userId) throw new BadRequestException('You cannot review yourself');

    const data: Prisma.ReviewUncheckedCreateInput = {
      kind: dto.kind,
      revieweeRole: dto.revieweeRole,
      subjectId: dto.subjectId,
      stars: dto.stars,
      text: dto.text ?? null,
      raterId: userId,
      revieweeId: side.revieweeId,
      productId: side.productId ?? null,
      [FK_FOR_KIND[dto.kind]]: dto.subjectId,
      ...extraFk,
    };
    let review;
    try {
      review = await this.prisma.review.create({ data, select: REVIEW_PUBLIC_SELECT });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('You have already reviewed this');
      }
      throw e;
    }
    await this.recompute(side.revieweeId, side.productId ?? null);
    const author = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await this.notifications.create({
      userId: side.revieweeId,
      system: 'reviews',
      type: 'review.received',
      params: { author: author?.name ?? 'Someone', stars: dto.stars },
      data: { reviewKind: dto.kind, stars: dto.stars, revieweeRole: dto.revieweeRole },
      linkUrl: '/console/reviews',
    });
    if (review.text) this.events.emit(REVIEW_UPSERTED, { id: review.id } satisfies ContentUpsertedEvent);
    return review;
  }

  /**
   * Create, or if the author already reviewed this exact subject/role, edit the
   * existing row. Used by legacy single-endpoint flows (e.g. loader job review)
   * that POST both first-time and updated ratings to one route.
   */
  async createOrEdit(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findFirst({
      where: { kind: dto.kind, subjectId: dto.subjectId, raterId: userId, revieweeRole: dto.revieweeRole },
      select: { id: true },
    });
    if (existing) return this.update(userId, existing.id, { stars: dto.stars, text: dto.text });
    return this.create(userId, dto);
  }

  // ── Author self-edit ──────────────────────────────────────────────────
  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const existing = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, raterId: true, revieweeId: true, productId: true },
    });
    if (!existing) throw new NotFoundException('Review not found');
    // Only the author may edit — the reviewee can never alter it.
    if (existing.raterId !== userId) throw new ForbiddenException('You can only edit your own review');
    const review = await this.prisma.review.update({
      where: { id },
      data: {
        stars: dto.stars ?? undefined,
        text: dto.text ?? undefined,
        editedByAuthorAt: new Date(),
      },
      select: REVIEW_PUBLIC_SELECT,
    });
    await this.recompute(existing.revieweeId, existing.productId);
    if (review.text) this.events.emit(REVIEW_UPSERTED, { id: review.id } satisfies ContentUpsertedEvent);
    return review;
  }

  // ── Public reads ──────────────────────────────────────────────────────
  private summarize(list: Array<{ stars: number }>) {
    const count = list.length;
    const avg = count ? list.reduce((s, r) => s + r.stars, 0) / count : 0;
    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of list) breakdown[r.stars as 1 | 2 | 3 | 4 | 5] += 1;
    return { avg: Math.round(avg * 10) / 10, count, breakdown };
  }

  async forSubject(kind: ReviewKind, subjectId: string) {
    const list = await this.prisma.review.findMany({
      where: { kind, subjectId, status: 'visible' },
      orderBy: { createdAt: 'desc' },
      select: REVIEW_PUBLIC_SELECT,
    });
    return { ...this.summarize(list), list };
  }

  /** Reviews received by a user, optionally narrowed to a single target role. */
  async forUser(userId: string, role?: ReviewRole) {
    const list = await this.prisma.review.findMany({
      where: { revieweeId: userId, status: 'visible', ...(role ? { revieweeRole: role } : {}) },
      orderBy: { createdAt: 'desc' },
      select: REVIEW_PUBLIC_SELECT,
    });
    return { ...this.summarize(list), list };
  }

  async forProduct(productId: string, locale: Lang = 'en') {
    const list = await this.prisma.review.findMany({
      where: { productId, revieweeRole: 'product', status: 'visible' },
      orderBy: { createdAt: 'desc' },
      select: { ...REVIEW_PUBLIC_SELECT, translations: { where: { locale }, select: { text: true } } },
    });
    // Fold the locale-matched translation over each review's text (English → base).
    const localized = list.map(({ translations, ...r }) => {
      const translated = translations[0]?.text;
      return translated ? { ...r, text: translated } : r;
    });
    return { ...this.summarize(localized), list: localized };
  }

  /** Reviews the current user has authored (their own history — read only). */
  async mine(userId: string) {
    return this.prisma.review.findMany({
      where: { raterId: userId },
      orderBy: { createdAt: 'desc' },
      select: REVIEW_PUBLIC_SELECT,
    });
  }

  /**
   * Whether the caller may still leave a review for a subject/role, driving the
   * "Leave a review" prompts. Returns the allowed sides + which are already done.
   */
  async eligibility(userId: string, kind: ReviewKind, subjectId: string) {
    let sides: PartySide[];
    try {
      ({ sides } = await this.resolveSides(userId, kind, subjectId));
    } catch (e) {
      return { eligible: false, reason: (e as Error).message, sides: [] as PartySide[], done: {} as Record<string, boolean> };
    }
    const existing = await this.prisma.review.findMany({
      where: { kind, subjectId, raterId: userId },
      select: { revieweeRole: true },
    });
    const done: Record<string, boolean> = {};
    for (const s of sides) done[s.role] = existing.some((e) => e.revieweeRole === s.role);
    const eligible = sides.some((s) => !done[s.role]);
    return { eligible, sides, done };
  }

  // ── Aggregate maintenance ─────────────────────────────────────────────
  /** Recomputes denormalized rating fields for a reviewee (and product). */
  private async recompute(userId: string, productId?: string | null) {
    const agg = await this.prisma.review.aggregate({
      where: { revieweeId: userId, status: 'visible' },
      _avg: { stars: true },
      _count: true,
    });
    const avg = agg._avg.stars ?? null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { ratingAvg: avg, ratingCount: agg._count },
    });
    // Keep the worker roster's display rating in sync when the user is a worker.
    await this.prisma.worker.updateMany({
      where: { userId },
      data: { rating: avg != null ? avg.toFixed(1) : null },
    });
    if (productId) {
      const pAgg = await this.prisma.review.aggregate({
        where: { productId, revieweeRole: 'product', status: 'visible' },
        _avg: { stars: true },
        _count: true,
      });
      const pAvg = pAgg._avg.stars ?? null;
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          ratingAvg: pAvg,
          ratingCount: pAgg._count,
          ...(pAvg != null ? { rating: pAvg.toFixed(1) } : {}),
        },
      });
    }
  }

  // ── Admin moderation (audited) ────────────────────────────────────────
  async adminList(q: { kind?: string; status?: string; search?: string; take?: number; skip?: number }) {
    const where: Prisma.ReviewWhereInput = {};
    if (q.kind) where.kind = q.kind as ReviewKind;
    if (q.status) where.status = q.status as ReviewStatus;
    if (q.search) {
      where.OR = [
        { text: { contains: q.search, mode: 'insensitive' } },
        { rater: { name: { contains: q.search, mode: 'insensitive' } } },
        { reviewee: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }
    const take = Math.min(q.take ?? 100, 500);
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip: q.skip ?? 0,
        include: {
          rater: { select: { id: true, name: true, email: true } },
          reviewee: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
          editedByAdmin: { select: { id: true, name: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { rows, total };
  }

  async adminUpdate(admin: AuthUser, id: string, dto: AdminUpdateReviewDto) {
    const existing = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, status: true, revieweeId: true, productId: true },
    });
    if (!existing) throw new NotFoundException('Review not found');
    const review = await this.prisma.review.update({
      where: { id },
      data: {
        stars: dto.stars ?? undefined,
        text: dto.text ?? undefined,
        status: dto.status ?? undefined,
        adminNote: dto.adminNote ?? undefined,
        editedByAdminId: admin.id,
      },
      include: { rater: { select: { id: true, name: true } }, reviewee: { select: { id: true, name: true } } },
    });
    const action =
      dto.status && dto.status !== existing.status ? `review.${dto.status}` : 'review.edit';
    await this.audit.log({
      actorId: admin.id,
      action,
      entityType: 'Review',
      entityId: id,
      meta: { status: dto.status, stars: dto.stars, hadNote: !!dto.adminNote },
    });
    await this.recompute(existing.revieweeId, existing.productId);
    return review;
  }

  async adminDelete(admin: AuthUser, id: string) {
    const existing = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, revieweeId: true, productId: true, kind: true, subjectId: true, stars: true },
    });
    if (!existing) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id } });
    await this.audit.log({
      actorId: admin.id,
      action: 'review.delete',
      entityType: 'Review',
      entityId: id,
      meta: { kind: existing.kind, subjectId: existing.subjectId, stars: existing.stars },
    });
    await this.recompute(existing.revieweeId, existing.productId);
    return { ok: true };
  }
}

// ── Public + authenticated controller ─────────────────────────────────────
@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private svc: ReviewsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('subject/:kind/:id')
  subject(@Param('kind') kind: ReviewKind, @Param('id') id: string) {
    return this.svc.forSubject(kind, id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('product/:id')
  product(@Param('id') id: string, @Locale() locale: Lang) {
    return this.svc.forProduct(id, locale);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('user/:id')
  user(@Param('id') id: string, @Query('role') role?: ReviewRole) {
    return this.svc.forUser(id, role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() u: AuthUser) {
    return this.svc.mine(u.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('eligibility')
  eligibility(@CurrentUser() u: AuthUser, @Query('kind') kind: ReviewKind, @Query('subjectId') subjectId: string) {
    return this.svc.eligibility(u.id, kind, subjectId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateReviewDto) {
    return this.svc.create(u.id, dto);
  }

  // Author-only self-edit. There is deliberately NO delete route for users.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  edit(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.svc.update(u.id, id, dto);
  }
}

// ── Admin moderation controller ───────────────────────────────────────────
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('reviews_moderate')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private svc: ReviewsService) {}

  @Get()
  list(
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.svc.adminList({
      kind,
      status,
      search,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Patch(':id')
  update(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: AdminUpdateReviewDto) {
    return this.svc.adminUpdate(admin, id, dto);
  }

  @Post(':id/delete')
  remove(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.svc.adminDelete(admin, id);
  }
}

@Module({
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
