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

const ref = (p: string) => `${p}-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

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
    const hire = await this.prisma.$transaction(async (tx) => {
      if (budget > 0) {
        await this.wallets.debit(requester.id, budget, 'escrow_hold', 'Hire budget held in escrow', tx);
      }
      return tx.hireRequest.create({
        data: {
          reference: ref('HR'),
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
    });
    await this.notify(
      dto.targetUserId,
      'hire.request',
      { requester: hire.requester.name, detail: dto.cargo ? ` — ${dto.cargo}` : dto.location ? ` — ${dto.location}` : '' },
      { hireId: hire.id, reference: hire.reference },
    );
    return hire;
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
    return this.localizeHires(rows, locale);
  }

  async incoming(userId: string, locale: Lang = 'en') {
    const rows = await this.prisma.hireRequest.findMany({
      where: { targetUserId: userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: HIRE_INCLUDE,
    });
    return this.localizeHires(rows, locale);
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
            otp: String(Math.floor(1000 + Math.random() * 9000)),
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
          otp: String(Math.floor(1000 + Math.random() * 9000)),
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

  /** Return a still-held escrow budget to the requester (decline / cancel). */
  private async refundEscrow(hire: { id: string; requesterId: string; budgetCents: number | null; escrowState: string | null }) {
    if (hire.escrowState !== 'held' || !hire.budgetCents) return;
    await this.prisma.$transaction(async (tx) => {
      await this.wallets.credit(hire.requesterId, hire.budgetCents!, 'refund', 'Hire budget refunded', tx);
      await tx.hireRequest.update({ where: { id: hire.id }, data: { escrowState: 'refunded' } });
    });
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
}

@Module({
  controllers: [HiresController],
  providers: [HiresService],
  exports: [HiresService],
})
export class HiresModule {}
