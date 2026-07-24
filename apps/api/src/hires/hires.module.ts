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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { HireTargetType } from '@prisma/client';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { Locale } from '../common/locale';
import { NotificationsService, type NotificationParams } from '../notifications/notifications.service';
import { TextTranslationService } from '../translation/text-translation.service';
import { WalletService } from '../wallet/wallet.service';
import { secureOtp, secureReference } from '../common/secure-random';

export class CreateHireDto {
  @ApiProperty({ enum: ['transporter', 'loaderco', 'worker'] })
  @IsIn(['transporter', 'loaderco', 'worker'])
  targetType!: HireTargetType;

  @ApiProperty({ description: 'User id of the transporter / loader company / worker to hire' })
  @IsString()
  targetUserId!: string;

  @ApiProperty({ required: false, description: 'Worker record id (targetType=worker)' })
  @IsOptional()
  @IsString()
  workerId?: string;

  @ApiProperty({ required: false, maxLength: 600 })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  message?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() fromCity?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() toCity?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() cargo?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() location?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) workersNeeded?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() neededDate?: string;
  @ApiProperty({ required: false, description: 'Budget in USD cents' }) @IsOptional() @IsInt() @Min(0) budgetCents?: number;

  @ApiProperty({ required: false, description: 'Source logistics for one of your orders (seller only)' })
  @IsOptional() @IsString() orderId?: string;

  // BL-15: a client-supplied key makes a double-submitted hire create (and hold)
  // a no-op on retry instead of a second hire with a second escrow debit.
  @ApiProperty({ required: false })
  @IsOptional() @IsString() idempotencyKey?: string;
}

// Both parties in a hire negotiation need enough to vet and contact each other
// before accepting — name, country, email and (private) profile phone/whatsapp,
// plus the linked order's product and value when the hire was sourced from one.
const PARTY_SELECT = {
  id: true,
  name: true,
  country: true,
  role: true,
  email: true,
  kycStatus: true,
  profile: { select: { phone: true, whatsapp: true, contactEmail: true, avatarUrl: true, avatarEmoji: true, location: true } },
} as const;

const HIRE_INCLUDE = {
  requester: { select: PARTY_SELECT },
  targetUser: { select: PARTY_SELECT },
  worker: { select: { id: true, name: true, rating: true, status: true } },
  order: { select: { id: true, reference: true, status: true, amount: true, product: { select: { name: true } } } },
} as const;

// SEC-06/BL-15: CSPRNG references and OTPs — the old `Math.random` 4-digit codes
// were guessable and collided against the unique columns.
const ref = (p: string) => secureReference(p);

/**
 * Direct hiring: anyone can send a HireRequest to a transporter, loader
 * company or worker from the public directories. On accept the request is
 * converted (transactionally) into the existing operational flows —
 * TransportRequest+Trip or LoaderJob+JobAssignment — so tracking, OTPs and
 * attendance keep working unchanged.
 */
@Injectable()
export class HiresService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private wallets: WalletService,
    private text: TextTranslationService,
  ) {}

  /**
   * Translate a batch of hire rows' own free-text (`cargo`, `message`) plus the
   * embedded order product name into `locale`, in as few round-trips as possible.
   * Person/company names, cities, references, phones and emails are left as-is.
   * No-op for English. `localizeRows` returns shallow copies with the named
   * fields swapped; nested `order.product.name` is folded in place afterwards.
   */
  private async localizeHires<
    T extends Record<string, unknown> & { order?: { product?: { name: string } | null } | null },
  >(rows: T[], locale: Lang): Promise<T[]> {
    const out = await this.text.localizeRows(rows, ['cargo', 'message'], locale);
    const names = await this.text.localizeMany(
      out.map((h) => h.order?.product?.name),
      locale,
    );
    out.forEach((h, i) => {
      if (typeof names[i] === 'string' && h.order?.product) h.order.product.name = names[i] as string;
    });
    return out;
  }

  /**
   * API-02: private contact details (email, phone, whatsapp, contactEmail) are
   * revealed only once a hire is ACCEPTED. While pending/declined/cancelled they
   * are masked on both parties — otherwise anyone could POST /hires (no budget
   * required) at any provider from the public directory and scrape their private
   * contact straight out of the response, bypassing the directory's own rule that
   * contact is never public.
   */
  private maskHireContact<T extends Record<string, unknown>>(hire: T): T {
    if ((hire as { status?: string }).status === 'accepted') return hire;
    const strip = (p: unknown) => {
      if (!p || typeof p !== 'object') return p;
      const party = p as { profile?: Record<string, unknown> | null } & Record<string, unknown>;
      return {
        ...party,
        email: null,
        profile: party.profile ? { ...party.profile, phone: null, whatsapp: null, contactEmail: null } : party.profile,
      };
    };
    return { ...hire, requester: strip((hire as Record<string, unknown>).requester), targetUser: strip((hire as Record<string, unknown>).targetUser) };
  }

  /** JWT payload carries no display name — read it for notification copy. */
  private async nameOf(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return u?.name ?? 'A user';
  }

  private async notify(userId: string, type: string, params: NotificationParams, data?: Record<string, unknown>) {
    // Persist + fan-out (realtime/push/email) is all handled by create(); title/body
    // are rendered from the `notification:<type>` catalog in the recipient's locale.
    await this.notifications.create({
      userId,
      system: 'hire',
      type,
      params,
      data,
    });
  }

  async create(requester: AuthUser, dto: CreateHireDto) {
    if (dto.targetUserId === requester.id) throw new BadRequestException('You cannot hire yourself.');
    // BL-15: a retry carrying the same key returns the original hire instead of
    // creating a second one (and a second escrow hold). Scoped to the requester.
    const idemKey = dto.idempotencyKey ? `${requester.id}:${dto.idempotencyKey}` : null;
    if (idemKey) {
      const prior = await this.prisma.hireRequest.findUnique({ where: { idempotencyKey: idemKey }, include: HIRE_INCLUDE });
      if (prior) return this.maskHireContact(prior);
    }
    const target = await this.prisma.user.findFirst({ where: { id: dto.targetUserId, active: true } });
    if (!target) throw new NotFoundException('User not found');
    const targetRoles = new Set([target.role, ...target.roles]);
    if (!targetRoles.has(dto.targetType)) {
      throw new BadRequestException(`This user is not a ${dto.targetType}.`);
    }

    // Order-linked hire: only that order's seller may source logistics for it,
    // and we prefill the cargo from the order so the provider sees the context.
    let order: { id: string; qty: string | null; product: { name: string } | null } | null = null;
    if (dto.orderId) {
      const found = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        select: { id: true, sellerId: true, qty: true, product: { select: { name: true } } },
      });
      if (!found) throw new NotFoundException('Order not found');
      if (found.sellerId !== requester.id) throw new ForbiddenException('Not your order');
      order = { id: found.id, qty: found.qty, product: found.product };
    }

    let workerId: string | null = null;
    if (dto.targetType === 'worker') {
      const worker = dto.workerId
        ? await this.prisma.worker.findUnique({ where: { id: dto.workerId } })
        : await this.prisma.worker.findUnique({ where: { userId: dto.targetUserId } });
      if (!worker || (worker.userId && worker.userId !== dto.targetUserId)) {
        throw new BadRequestException('Worker record not found for this user.');
      }
      workerId = worker.id;
    }

    // Hiring spends money: hold the budget from the requester's wallet up front
    // (they must add funds first). It's released to the provider on completion,
    // or refunded if the hire is declined/cancelled.
    const budget = dto.budgetCents ?? 0;
    let hire;
    try {
      hire = await this.prisma.$transaction(async (tx) => {
        // Create first so the escrow debit can be keyed on the hire id (a failed
        // debit rolls the create back — same transaction — so ordering is safe).
        const created = await tx.hireRequest.create({
          data: {
            reference: ref('HR'),
            idempotencyKey: idemKey,
            targetType: dto.targetType,
            message: dto.message,
            fromCity: dto.fromCity,
            toCity: dto.toCity,
            cargo: dto.cargo ?? (order ? [order.product?.name, order.qty].filter(Boolean).join(' · ') || null : null),
            location: dto.location,
            workersNeeded: dto.workersNeeded,
            neededDate: dto.neededDate ? new Date(dto.neededDate) : null,
            budgetCents: dto.budgetCents,
            escrowState: budget > 0 ? 'held' : null,
            requesterId: requester.id,
            targetUserId: dto.targetUserId,
            workerId,
            orderId: order?.id ?? null,
          },
          include: HIRE_INCLUDE,
        });
        if (budget > 0) {
          await this.wallets.debit(requester.id, budget, 'escrow_hold', 'Hire budget held in escrow', tx, `escrow:hold:hire:${created.id}`);
        }
        return created;
      });
    } catch (e) {
      // BL-15: a concurrent double-tap loses the unique-key race — return the
      // winner's hire (its hold stands) instead of surfacing the P2002.
      if (idemKey && (e as { code?: string }).code === 'P2002') {
        const prior = await this.prisma.hireRequest.findUnique({ where: { idempotencyKey: idemKey }, include: HIRE_INCLUDE });
        if (prior) return this.maskHireContact(prior);
      }
      throw e;
    }
    await this.notify(
      dto.targetUserId,
      'hire.request',
      { requester: hire.requester.name, detail: dto.cargo ? ` — ${dto.cargo}` : dto.location ? ` — ${dto.location}` : '' },
      { hireId: hire.id, reference: hire.reference },
    );
    return this.maskHireContact(hire);
  }

  /** Hires this user SENT, optionally narrowed to a target type or one order. */
  async mine(userId: string, filter: { targetType?: HireTargetType; orderId?: string } = {}, locale: Lang = 'en') {
    const rows = await this.prisma.hireRequest.findMany({
      where: {
        requesterId: userId,
        ...(filter.targetType ? { targetType: filter.targetType } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: HIRE_INCLUDE,
    });
    return (await this.localizeHires(rows, locale)).map((h) => this.maskHireContact(h));
  }

  async incoming(userId: string, locale: Lang = 'en') {
    const rows = await this.prisma.hireRequest.findMany({
      where: { targetUserId: userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: HIRE_INCLUDE,
    });
    return (await this.localizeHires(rows, locale)).map((h) => this.maskHireContact(h));
  }

  private async pendingOwned(id: string, targetUserId: string) {
    const hire = await this.prisma.hireRequest.findUnique({ where: { id } });
    if (!hire) throw new NotFoundException('Hire request not found');
    if (hire.targetUserId !== targetUserId) throw new ForbiddenException('Not your hire request');
    if (hire.status !== 'pending') throw new BadRequestException('This request was already decided.');
    return hire;
  }

  async accept(user: AuthUser, id: string) {
    const hire = await this.pendingOwned(id, user.id);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (hire.targetType === 'transporter') {
        const request = await tx.transportRequest.create({
          data: {
            reference: ref('RQ'),
            fromCity: hire.fromCity ?? 'TBD',
            toCity: hire.toCity ?? 'TBD',
            cargo: hire.cargo ?? hire.message ?? 'Cargo',
            status: 'assigned',
            createdById: hire.requesterId,
          },
        });
        const trip = await tx.trip.create({
          data: {
            reference: ref('TRP'),
            fromCity: request.fromCity,
            toCity: request.toCity,
            cargo: request.cargo,
            status: 'pending',
            otp: secureOtp(),
            transporterId: hire.targetUserId,
            requestId: request.id,
          },
        });
        // Attach the trip back to the order the seller hired for, so the
        // existing dispatch / pickup-OTP / delivery-OTP machinery picks it up.
        // `Order.tripId` is unique, so never clobber an existing dispatch.
        if (hire.orderId) {
          const order = await tx.order.findUnique({ where: { id: hire.orderId }, select: { tripId: true } });
          if (order && !order.tripId) {
            await tx.order.update({ where: { id: hire.orderId }, data: { tripId: trip.id } });
          }
        }
        return tx.hireRequest.update({
          where: { id },
          data: { status: 'accepted', decidedAt: new Date(), transportRequestId: request.id },
          include: HIRE_INCLUDE,
        });
      }

      // loaderco or worker → LoaderJob (+ direct assignment for a worker hire)
      const worker = hire.workerId ? await tx.worker.findUnique({ where: { id: hire.workerId } }) : null;
      const job = await tx.loaderJob.create({
        data: {
          reference: ref('LD'),
          location: hire.location ?? hire.fromCity ?? 'TBD',
          workersNeeded: hire.workersNeeded ?? 1,
          status: 'assigned',
          // BL-15: CSPRNG OTP — the transporter branch above already uses
          // secureOtp(); this loader-job branch was the last Math.random() holdout.
          otp: secureOtp(),
          payCents: hire.budgetCents,
          // Carry the hire context so the loader sees what the job is for.
          cargo: hire.cargo,
          neededDate: hire.neededDate,
          notes: hire.message,
          orderId: hire.orderId,
          createdById: hire.requesterId,
          loadercoId: hire.targetType === 'loaderco' ? hire.targetUserId : worker?.loadercoId ?? null,
        },
      });
      if (hire.targetType === 'worker' && worker) {
        await tx.jobAssignment.create({ data: { jobId: job.id, workerId: worker.id, status: 'assigned' } });
      }
      return tx.hireRequest.update({
        where: { id },
        data: { status: 'accepted', decidedAt: new Date(), loaderJobId: job.id },
        include: HIRE_INCLUDE,
      });
    });
    await this.notify(
      hire.requesterId,
      'hire.accepted',
      { actor: await this.nameOf(user.id), reference: hire.reference },
      { hireId: hire.id, reference: hire.reference },
    );
    return updated;
  }

  async decline(user: AuthUser, id: string) {
    const hire = await this.pendingOwned(id, user.id);
    await this.refundEscrow(hire);
    const updated = await this.prisma.hireRequest.update({
      where: { id },
      data: { status: 'declined', decidedAt: new Date() },
      include: HIRE_INCLUDE,
    });
    await this.notify(
      updated.requesterId,
      'hire.declined',
      { actor: await this.nameOf(user.id), reference: updated.reference },
      { hireId: updated.id },
    );
    return updated;
  }

  async cancel(user: AuthUser, id: string) {
    const hire = await this.prisma.hireRequest.findUnique({ where: { id } });
    if (!hire) throw new NotFoundException('Hire request not found');
    if (hire.requesterId !== user.id) throw new ForbiddenException('Not your hire request');
    if (hire.status !== 'pending') throw new BadRequestException('Only pending requests can be cancelled.');
    await this.refundEscrow(hire);
    const updated = await this.prisma.hireRequest.update({
      where: { id },
      data: { status: 'cancelled', decidedAt: new Date() },
      include: HIRE_INCLUDE,
    });
    // Let the provider know the requester withdrew (transactional → also emails).
    await this.notify(
      updated.targetUserId,
      'hire.cancelled',
      { actor: await this.nameOf(user.id), reference: updated.reference },
      { hireId: updated.id },
    );
    return updated;
  }

  /**
   * Return a still-held escrow budget to the requester (decline / cancel).
   * BL-05: race-safe. The `held → refunded` transition is a conditional
   * `updateMany` claim done INSIDE the transaction — a concurrent decline+cancel
   * (or decline racing a completion) can no longer both pass a stale
   * `escrowState === 'held'` read and double-credit. The credit is keyed so even a
   * retry of the winning path is idempotent.
   */
  private async refundEscrow(hire: { id: string; requesterId: string; budgetCents: number | null; escrowState: string | null }) {
    if (hire.escrowState !== 'held' || !hire.budgetCents) return;
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.hireRequest.updateMany({ where: { id: hire.id, escrowState: 'held' }, data: { escrowState: 'refunded' } });
      if (claimed.count === 0) return; // lost the race — the other path already settled this hold
      await this.wallets.credit(hire.requesterId, hire.budgetCents!, 'refund', 'Hire budget refunded', tx, `escrow:refund:hire:${hire.id}`);
    });
  }

  /**
   * BL-04: the REQUESTER (payer) confirms the hired work is complete, releasing
   * the held budget to the provider. This is now the SOLE escrow-release
   * authority — a provider marking their own trip/job/checkout done can no longer
   * pay themselves. Race-safe: the held→released transition is a conditional claim
   * and the credit is keyed, so a double confirm can never pay twice.
   */
  async confirmCompletion(user: AuthUser, id: string) {
    const hire = await this.prisma.hireRequest.findUnique({ where: { id } });
    if (!hire) throw new NotFoundException('Hire request not found');
    if (hire.requesterId !== user.id) throw new ForbiddenException('Only the requester can confirm completion.');
    if (hire.status !== 'accepted') throw new BadRequestException('Only an accepted hire can be completed.');
    if (hire.escrowState !== 'held' || !hire.budgetCents) {
      throw new BadRequestException('This hire has no held budget to release.');
    }
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.hireRequest.updateMany({ where: { id, escrowState: 'held' }, data: { escrowState: 'released' } });
      if (claimed.count === 0) throw new BadRequestException('This hire budget was already settled.');
      await this.wallets.credit(hire.targetUserId, hire.budgetCents!, 'escrow_release', 'Hire completed — payout', tx, `escrow:release:hire:${id}`);
    });
    // The credit ran inside the tx (silent) — notify the provider of the payout now.
    await this.notifications.create({
      userId: hire.targetUserId,
      system: 'wallet',
      type: 'wallet.escrow_release',
      params: { amount: `$${(hire.budgetCents / 100).toFixed(2)}` },
      data: { hireId: id },
      linkUrl: '/console/wallet',
    });
    return this.prisma.hireRequest.findUniqueOrThrow({ where: { id }, include: HIRE_INCLUDE });
  }
}

@ApiTags('hires')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hires')
export class HiresController {
  constructor(private hires: HiresService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHireDto) {
    return this.hires.create(user, dto);
  }

  @Get('mine')
  mine(
    @CurrentUser() user: AuthUser,
    @Locale() locale: Lang,
    @Query('targetType') targetType?: string,
    @Query('orderId') orderId?: string,
  ) {
    const valid = targetType === 'transporter' || targetType === 'loaderco' || targetType === 'worker';
    return this.hires.mine(user.id, { targetType: valid ? (targetType as HireTargetType) : undefined, orderId }, locale);
  }

  @Roles('transporter', 'loaderco', 'worker')
  @Get('incoming')
  incoming(@CurrentUser() user: AuthUser, @Locale() locale: Lang) {
    return this.hires.incoming(user.id, locale);
  }

  @Roles('transporter', 'loaderco', 'worker')
  @Post(':id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hires.accept(user, id);
  }

  @Roles('transporter', 'loaderco', 'worker')
  @Post(':id/decline')
  decline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hires.decline(user, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hires.cancel(user, id);
  }

  // BL-04: requester-only completion confirmation — the sole escrow-release path.
  @Post(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hires.confirmCompletion(user, id);
  }
}

@Module({
  controllers: [HiresController],
  providers: [HiresService],
  exports: [HiresService],
})
export class HiresModule {}
