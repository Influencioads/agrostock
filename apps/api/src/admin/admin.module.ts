import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AdminPermission, OrderStatus, Prisma, ProductStatus, Role, RoleRequestStatus, type InvoiceKind, type InvoiceStatus, type KycStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions, RequireAnyPermission } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { monthlySeries, EARNED_STATUSES } from '../me/me.module';
import { StatementsModule, StatementsService } from '../statements/statements.module';
import { assertLegacyFinancialWritesEnabled } from '../common/legacy-finance.guard';

/** "$1,180" → 1180 (dollars); 0 when unparseable. */
const parseAmount = (s: string | null | undefined): number => {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Inclusive date-range bounds. A date-only `to` covers the whole day. */
const rangeStart = (s?: string) => (s ? new Date(s) : undefined);
const rangeEnd = (s?: string) => {
  if (!s) return undefined;
  // A bare "YYYY-MM-DD" parses to that day's midnight; extend to end-of-day so
  // same-day rows are included.
  return /T/.test(s) ? new Date(s) : new Date(new Date(s).getTime() + 86_400_000 - 1);
};

export class DecideKycDto {
  @ApiProperty({ enum: ['verified', 'rejected'] })
  @IsIn(['verified', 'rejected'])
  status!: Extract<KycStatus, 'verified' | 'rejected'>;

  @ApiProperty({ required: false, description: 'Reviewer note (e.g. rejection reason).' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class DecideRoleRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @ApiProperty({ required: false, description: 'Reviewer note (e.g. rejection reason).' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateStaffDto {
  @ApiProperty({ example: 'ops@agrotraders.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Operations Lead' })
  @IsString()
  name!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: AdminPermission, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions?: AdminPermission[];
}

export class UpdateStaffDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ enum: AdminPermission, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions?: AdminPermission[];
}

export class AdjustWalletDto {
  @ApiProperty({ description: 'Positive cents. `type` decides credit vs debit.' })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty({ enum: ['topup', 'refund', 'payout', 'withdraw'] })
  @IsIn(['topup', 'refund', 'payout', 'withdraw'])
  type!: 'topup' | 'refund' | 'payout' | 'withdraw';

  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}

export class DecidePayoutDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['processing', 'paid', 'packed', 'dispatched', 'in_transit', 'delivered', 'dispute', 'cancelled'] })
  @IsIn(['processing', 'paid', 'packed', 'dispatched', 'in_transit', 'delivered', 'dispute', 'cancelled'])
  status!: OrderStatus;

  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['release_to_seller', 'refund_buyer', 'partial'] })
  @IsIn(['release_to_seller', 'refund_buyer', 'partial'])
  resolution!: 'release_to_seller' | 'refund_buyer' | 'partial';

  @ApiProperty({ required: false, description: 'For a partial resolution: cents refunded to the buyer (remainder released to the seller).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}

export class RejectProductDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}

export class UpdateProductDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() price?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() priceCents?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() qty?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() moq?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() grade?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() origin?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() unit?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() delivery?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() safeDeal?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() verified?: boolean;
}

export class UpdateUserDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() country?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateUserDto {
  @ApiProperty({ example: 'buyer@agrotraders.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Buyer Account' })
  @IsString()
  name!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ResetUserPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdateOwnPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class SetUserRoleDto {
  @ApiProperty({ enum: Role }) @IsEnum(Role) role!: Role;
}

export class SetUserKycDto {
  @ApiProperty({ enum: ['pending', 'verified', 'rejected'] })
  @IsIn(['pending', 'verified', 'rejected'])
  status!: KycStatus;
}

export class UpsertMarketDto {
  @ApiProperty({ example: 'Azadpur Mandi' }) @IsString() name!: string;
  @ApiProperty({ example: '🇮🇳 India' }) @IsString() country!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() region?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() flag?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private walletSvc: WalletService,
    private notifications: NotificationsService,
  ) {}

  users(role?: string, search?: string) {
    const where: Prisma.UserWhereInput = {
      role: role && role !== 'all' ? { equals: role as Role, not: Role.admin } : { not: Role.admin },
    };
    if (search)
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, country: true, kycStatus: true, createdAt: true },
    });
  }

  async profile(adminId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, role: true, roles: true, adminPermissions: true, active: true, country: true, kycStatus: true, createdAt: true },
    });
    if (!admin || admin.role !== Role.admin) throw new NotFoundException('Admin profile not found');
    return admin;
  }

  async updateOwnPassword(adminId: string, dto: UpdateOwnPasswordDto) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { id: true, role: true } });
    if (!admin || admin.role !== Role.admin) throw new NotFoundException('Admin profile not found');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const updated = await this.prisma.user.update({
      where: { id: adminId },
      data: { passwordHash },
      select: { id: true, name: true, email: true, role: true, roles: true, adminPermissions: true, active: true, country: true, kycStatus: true, createdAt: true },
    });
    await this.audit.log({ actorId: adminId, action: 'admin.profile.password_update', entityType: 'User', entityId: adminId });
    return updated;
  }

  /**
   * Full user detail for the admin drill-down. This is the ONLY read surface
   * that returns the private Profile contact fields (phone/whatsapp/
   * contactEmail) — everywhere public serves masked hints instead.
   */
  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roles: true,
        active: true,
        adminPermissions: true,
        country: true,
        kycStatus: true,
        createdAt: true,
        profile: {
          include: { market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } } },
        },
        wallet: { select: { balanceCents: true } },
        workerProfile: { select: { id: true, rating: true, status: true, loaderco: { select: { name: true } } } },
        _count: {
          select: {
            products: true,
            buyerOrders: true,
            sellerOrders: true,
            vehicles: true,
            trips: true,
            workers: true,
            teams: true,
            hireRequestsMade: true,
            hireRequestsReceived: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── user management ────────────────────────────────────────────
  private async requireUser(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, roles: true } });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async updateUser(id: string, dto: UpdateUserDto, adminId: string) {
    await this.requireUser(id);
    if (dto.email) {
      const clash = await this.prisma.user.findFirst({ where: { email: dto.email, id: { not: id } }, select: { id: true } });
      if (clash) throw new BadRequestException('Email already in use');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { name: dto.name, email: dto.email, country: dto.country, active: dto.active },
      select: { id: true, name: true, email: true, role: true, roles: true, active: true, country: true, kycStatus: true },
    });
    await this.audit.log({ actorId: adminId, action: 'user.update', entityType: 'User', entityId: id, meta: { ...dto } });
    return updated;
  }

  async createUser(dto: CreateUserDto, adminId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) throw new BadRequestException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role ?? Role.buyer,
        roles: { set: [] },
        active: dto.active ?? true,
        country: dto.country,
        kycStatus: 'pending',
        // Admin-provisioned: there is no confirmation email to click, so the
        // account is trusted from the start and can sign in immediately.
        emailVerifiedAt: new Date(),
      },
      select: { id: true, name: true, email: true, role: true, roles: true, active: true, country: true, kycStatus: true, createdAt: true },
    });
    await this.audit.log({
      actorId: adminId,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      meta: { email: dto.email, role: dto.role ?? Role.buyer },
    });
    return user;
  }

  /** Grant an extra role (added to `roles[]`, leaving the primary role intact). */
  async grantUserRole(id: string, role: Role, adminId: string) {
    const u = await this.requireUser(id);
    if (u.role !== role && !u.roles.includes(role)) {
      await this.prisma.user.update({ where: { id }, data: { roles: { push: role } } });
    }
    if (role === Role.worker) {
      const existing = await this.prisma.worker.findUnique({ where: { userId: id }, select: { id: true } });
      if (!existing) {
        const named = await this.prisma.user.findUnique({ where: { id }, select: { name: true } });
        await this.prisma.worker.create({ data: { userId: id, name: named?.name ?? 'Worker', status: 'available' } });
      }
    }
    await this.audit.log({ actorId: adminId, action: 'user.role_grant', entityType: 'User', entityId: id, meta: { role } });
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, roles: true } });
  }

  /** Revoke an extra role. The primary `role` cannot be revoked here. */
  async revokeUserRole(id: string, role: Role, adminId: string) {
    const u = await this.requireUser(id);
    if (u.role === role) throw new BadRequestException('Cannot revoke the user’s primary role');
    await this.prisma.user.update({ where: { id }, data: { roles: { set: u.roles.filter((r) => r !== role) } } });
    await this.audit.log({ actorId: adminId, action: 'user.role_revoke', entityType: 'User', entityId: id, meta: { role } });
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, roles: true } });
  }

  async setUserKyc(id: string, status: KycStatus, adminId: string) {
    await this.requireUser(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { kycStatus: status },
      select: { id: true, kycStatus: true },
    });
    // Keep the KycRecord (if any) in sync with the manual override.
    await this.prisma.kycRecord.updateMany({ where: { userId: id }, data: { status } });
    await this.audit.log({ actorId: adminId, action: `user.kyc_${status}`, entityType: 'User', entityId: id, meta: { status } });
    if (status === 'verified' || status === 'rejected') await this.notifyKyc(id, status);
    return updated;
  }

  async deleteUser(id: string, adminId: string) {
    if (id === adminId) throw new BadRequestException('You cannot delete your own account.');
    await this.requireUser(id);
    // Soft-delete: deactivate rather than hard-delete (preserves FK/audit integrity).
    await this.prisma.user.update({ where: { id }, data: { active: false } });
    await this.audit.log({ actorId: adminId, action: 'user.delete', entityType: 'User', entityId: id });
    return { ok: true };
  }

  hires() {
    return this.prisma.hireRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        requester: { select: { id: true, name: true, role: true } },
        targetUser: { select: { id: true, name: true, role: true } },
        worker: { select: { name: true } },
      },
    });
  }

  // ── markets CRUD ───────────────────────────────────────────────
  /** `status=pending` drives the seller-proposal review queue. */
  markets(status?: string) {
    return this.prisma.market.findMany({
      where: status === 'pending' || status === 'approved' || status === 'rejected' ? { status } : {},
      // Pending first so a proposal is never buried under the approved list.
      orderBy: [{ status: 'asc' }, { sort: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true, profiles: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  createMarket(dto: UpsertMarketDto) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return this.prisma.market.create({
      // Admin-created markets bypass the proposal queue and go live at once.
      data: { slug, name: dto.name, country: dto.country, city: dto.city, region: dto.region, flag: dto.flag, active: dto.active ?? true, status: 'approved' },
    });
  }

  async decideMarket(id: string, status: 'approved' | 'rejected') {
    const existing = await this.prisma.market.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Market not found');
    const updated = await this.prisma.market.update({
      where: { id },
      // A rejected market is also deactivated so it drops out of every list.
      data: { status, ...(status === 'rejected' ? { active: false } : {}) },
      include: { _count: { select: { products: true, profiles: true } } },
    });
    // Only user-proposed markets have a creator to notify.
    if (existing.createdById) {
      const approved = status === 'approved';
      await this.notifications.create({
        userId: existing.createdById,
        system: 'account',
        type: approved ? 'market.approved' : 'market.declined',
        params: { market: existing.name },
        data: { marketId: id, status },
        linkUrl: '/console',
      });
    }
    return updated;
  }

  async updateMarket(id: string, dto: Partial<UpsertMarketDto>) {
    const existing = await this.prisma.market.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Market not found');
    return this.prisma.market.update({ where: { id }, data: dto });
  }

  async deleteMarket(id: string) {
    const existing = await this.prisma.market.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Market not found');
    // Soft-delete: keep FK integrity for products/profiles already attached.
    await this.prisma.market.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }

  orders(opts: { status?: string; search?: string; from?: string; to?: string; skip?: number; take?: number } = {}) {
    const where: Prisma.OrderWhereInput = {};
    if (opts.status && opts.status !== 'all') where.status = opts.status as OrderStatus;
    if (opts.from || opts.to) {
      where.createdAt = {};
      // Use day-boundary helpers so a bare YYYY-MM-DD `to` includes the whole day
      // (matches reports()/statements() — plain new Date() would cut off at midnight).
      if (opts.from) where.createdAt.gte = rangeStart(opts.from);
      if (opts.to) where.createdAt.lte = rangeEnd(opts.to);
    }
    if (opts.search) {
      where.OR = [
        { reference: { contains: opts.search, mode: 'insensitive' } },
        { buyer: { name: { contains: opts.search, mode: 'insensitive' } } },
        { seller: { name: { contains: opts.search, mode: 'insensitive' } } },
        { product: { name: { contains: opts.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.take ?? 200, 500),
      skip: opts.skip ?? 0,
      include: {
        buyer: { select: { id: true, name: true, country: true } },
        seller: { select: { id: true, name: true, country: true } },
        product: { select: { name: true } },
      },
    });
  }

  async orderDetail(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, email: true, country: true } },
        seller: { select: { id: true, name: true, email: true, country: true } },
        product: { select: { id: true, name: true, emoji: true } },
        events: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } },
        invoices: { select: { id: true, number: true, status: true, kind: true, totalCents: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Admin status override (bypasses the state machine), recording an event. */
  async setOrderStatus(id: string, status: OrderStatus, adminId: string, note?: string) {
    if (status === 'paid') assertLegacyFinancialWritesEnabled('Administrative order payment status');
    const order = await this.prisma.order.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!order) throw new NotFoundException('Order not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({ where: { id }, data: { status } });
      await tx.orderEvent.create({
        data: { orderId: id, type: 'note', actorId: adminId, fromStatus: order.status, toStatus: status, note: note ?? `Admin set status to ${status}` },
      });
      return o;
    });
    await this.audit.log({ actorId: adminId, action: 'order.status', entityType: 'Order', entityId: id, meta: { from: order.status, to: status, note } });
    return updated;
  }

  disputes() {
    return this.prisma.order.findMany({
      where: { status: 'dispute' },
      orderBy: { updatedAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true, country: true } },
        seller: { select: { id: true, name: true, country: true } },
        product: { select: { name: true } },
        events: { where: { type: 'disputed' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  /**
   * Resolve a dispute. The order amount is released to the seller, refunded to
   * the buyer, or split — each as a wallet transaction — and the order leaves
   * `dispute` (delivered on release, cancelled on full refund).
   */
  async resolveDispute(id: string, dto: ResolveDisputeDto, adminId: string) {
    assertLegacyFinancialWritesEnabled('Dispute settlement');
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, amountCents: true, buyerId: true, sellerId: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'dispute') throw new BadRequestException('Order is not in dispute');
    const total = order.amountCents ?? 0;

    // Collected here so the wallet notifications fire AFTER commit (the credits
    // run inside the tx and WalletService stays silent in that case).
    const credits: Array<{ userId: string; cents: number; type: 'refund' | 'escrow_release' }> = [];

    const result = await this.prisma.$transaction(async (tx) => {
      let toStatus: OrderStatus = 'delivered';
      if (dto.resolution === 'refund_buyer') {
        if (total > 0) {
          await this.walletSvc.credit(order.buyerId, total, 'refund', dto.note ?? 'Dispute refund', tx);
          credits.push({ userId: order.buyerId, cents: total, type: 'refund' });
        }
        toStatus = 'cancelled';
      } else if (dto.resolution === 'release_to_seller') {
        if (total > 0 && order.sellerId) {
          await this.walletSvc.credit(order.sellerId, total, 'escrow_release', dto.note ?? 'Dispute release', tx);
          credits.push({ userId: order.sellerId, cents: total, type: 'escrow_release' });
        }
        toStatus = 'delivered';
      } else {
        // partial: refund `amountCents` to buyer, release the remainder to seller.
        const refund = Math.max(0, Math.min(dto.amountCents ?? 0, total));
        const release = total - refund;
        if (refund > 0) {
          await this.walletSvc.credit(order.buyerId, refund, 'refund', dto.note ?? 'Dispute partial refund', tx);
          credits.push({ userId: order.buyerId, cents: refund, type: 'refund' });
        }
        if (release > 0 && order.sellerId) {
          await this.walletSvc.credit(order.sellerId, release, 'escrow_release', dto.note ?? 'Dispute partial release', tx);
          credits.push({ userId: order.sellerId, cents: release, type: 'escrow_release' });
        }
        toStatus = 'delivered';
      }
      const o = await tx.order.update({ where: { id }, data: { status: toStatus } });
      await tx.orderEvent.create({
        data: { orderId: id, type: 'note', actorId: adminId, fromStatus: 'dispute', toStatus, note: `Dispute resolved: ${dto.resolution}${dto.note ? ` — ${dto.note}` : ''}` },
      });
      return o;
    });
    // Fan out the money-moved notifications (transactional → also emails).
    for (const c of credits) {
      await this.notifications.create({
        userId: c.userId,
        system: 'wallet',
        type: c.type === 'refund' ? 'wallet.refund' : 'wallet.escrow_release',
        params: { amount: `$${(c.cents / 100).toFixed(2)}` },
        data: { orderId: id },
        linkUrl: '/console/wallet',
      });
    }
    await this.audit.log({ actorId: adminId, action: 'order.dispute_resolve', entityType: 'Order', entityId: id, meta: { resolution: dto.resolution, amountCents: dto.amountCents, note: dto.note } });
    return result;
  }

  /** `status` filters the queue (pending default) or shows verified/rejected history. */
  kycQueue(status?: string) {
    const where: Prisma.KycRecordWhereInput =
      status === 'verified' || status === 'rejected' || status === 'pending'
        ? { status: status as KycStatus }
        : status === 'all'
          ? {}
          : { status: 'pending' };
    return this.prisma.kycRecord.findMany({
      where,
      include: {
        user: { select: { name: true, role: true, country: true } },
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Full KYC record incl. document metadata for the admin doc viewer. */
  async kycDetail(id: string) {
    const record = await this.prisma.kycRecord.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, country: true } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!record) throw new NotFoundException('KYC record not found');
    return record;
  }

  /** Every invoice on the platform, optionally filtered by status/kind. */
  invoices(status?: string, kind?: string) {
    const where: Prisma.InvoiceWhereInput = {};
    if (status && status !== 'all') where.status = status as InvoiceStatus;
    if (kind && kind !== 'all') where.kind = kind as InvoiceKind;
    return this.prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      include: {
        issuer: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async decideKyc(id: string, status: KycStatus, adminId: string, note?: string) {
    const record = await this.prisma.kycRecord.update({
      where: { id },
      data: { status, ...(note !== undefined ? { notes: note } : {}) },
      include: { user: true },
    });
    await this.prisma.user.update({ where: { id: record.userId }, data: { kycStatus: status } });
    await this.audit.log({
      actorId: adminId,
      action: `kyc.${status}`,
      entityType: 'KycRecord',
      entityId: id,
      meta: { userId: record.userId, note },
    });
    if (status === 'verified' || status === 'rejected') await this.notifyKyc(record.userId, status, note);
    return record;
  }

  /** Notify a user that their identity verification was approved or rejected. */
  private async notifyKyc(userId: string, status: 'verified' | 'rejected', note?: string) {
    const verified = status === 'verified';
    await this.notifications.create({
      userId,
      system: 'account',
      type: `kyc.${status}`,
      params: verified ? undefined : { reason: note },
      data: { kycStatus: status },
      linkUrl: '/console/settings/verification',
    });
  }

  pendingProducts() {
    return this.prisma.product.findMany({
      where: { OR: [{ status: 'pending' }, { approved: false }] },
      orderBy: { createdAt: 'desc' },
      include: { seller: { select: { name: true, country: true } }, category: { select: { name: true } } },
    });
  }

  /** Full moderation list with filters — not just the pending queue. */
  allProducts(opts: { status?: string; search?: string; categoryId?: string; type?: string }) {
    const where: Prisma.ProductWhereInput = {};
    if (opts.status && ['pending', 'live', 'rejected', 'hidden'].includes(opts.status)) where.status = opts.status as ProductStatus;
    if (opts.categoryId) where.categoryId = opts.categoryId;
    if (opts.type === 'auction') where.isAuction = true;
    else if (opts.type === 'offer') where.isOffer = true;
    else if (opts.type === 'safedeal') where.safeDeal = true;
    if (opts.search) where.name = { contains: opts.search, mode: 'insensitive' };
    return this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { seller: { select: { name: true, country: true } }, category: { select: { name: true } } },
    });
  }

  async approveProduct(id: string, adminId: string) {
    const updated = await this.prisma.product.update({
      where: { id },
      data: { approved: true, verified: true, status: 'live', rejectionReason: null },
    });
    await this.audit.log({ actorId: adminId, action: 'product.approve', entityType: 'Product', entityId: id });
    if (updated.sellerId) {
      await this.notifications.create({
        userId: updated.sellerId,
        system: 'account',
        type: 'product.approved',
        params: { product: updated.name },
        data: { productId: id },
        linkUrl: `/product/${updated.slug}`,
      });
    }
    return updated;
  }

  async rejectProduct(id: string, reason: string | undefined, adminId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Product not found');
    const updated = await this.prisma.product.update({
      where: { id },
      data: { approved: false, status: 'rejected', rejectionReason: reason ?? null },
    });
    await this.audit.log({ actorId: adminId, action: 'product.reject', entityType: 'Product', entityId: id, meta: { reason } });
    if (updated.sellerId) {
      await this.notifications.create({
        userId: updated.sellerId,
        system: 'account',
        type: 'product.rejected',
        params: { product: updated.name, reason },
        data: { productId: id },
        linkUrl: '/console/products',
      });
    }
    return updated;
  }

  async updateProduct(id: string, dto: UpdateProductDto, adminId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Product not found');
    const updated = await this.prisma.product.update({ where: { id }, data: dto });
    await this.audit.log({ actorId: adminId, action: 'product.update', entityType: 'Product', entityId: id, meta: { ...dto } });
    return updated;
  }

  /** Takedown: hide from every public list without destroying the record. */
  async deleteProduct(id: string, adminId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Product not found');
    await this.prisma.product.update({ where: { id }, data: { status: 'hidden', approved: false } });
    await this.audit.log({ actorId: adminId, action: 'product.takedown', entityType: 'Product', entityId: id });
    return { ok: true };
  }

  async stats() {
    const [users, products, orders, pendingKyc, pendingProducts, pendingRoleRequests, pendingMarkets, pendingAds, disputes, pendingPayouts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.product.count(),
        this.prisma.order.count(),
        this.prisma.kycRecord.count({ where: { status: 'pending' } }),
        this.prisma.product.count({ where: { OR: [{ status: 'pending' }, { approved: false }] } }),
        this.prisma.roleRequest.count({ where: { status: 'pending' } }),
        this.prisma.market.count({ where: { status: 'pending' } }),
        this.prisma.adCampaign.count({ where: { status: 'pending' } }),
        this.prisma.order.count({ where: { status: 'dispute' } }),
        this.prisma.payoutRequest.count({ where: { status: 'pending' } }),
      ]);
    return { users, products, orders, pendingKyc, pendingProducts, pendingRoleRequests, pendingMarkets, pendingAds, disputes, pendingPayouts };
  }

  /** Platform order volume as trailing 8/12-month series (dollars) for charts. */
  async volumeSeries() {
    const orders = await this.prisma.order.findMany({
      where: { status: { in: [...EARNED_STATUSES] } },
      select: { amount: true, createdAt: true },
    });
    const rows = orders.map((o) => ({ createdAt: o.createdAt, value: parseAmount(o.amount) }));
    return { data8: monthlySeries(rows, 8), data12: monthlySeries(rows, 12) };
  }

  /** Rich reports payload: KPIs + order-volume & user-growth series, date-filtered. */
  async reports(from?: string, to?: string) {
    const gte = rangeStart(from);
    const lte = rangeEnd(to);
    const dateWhere = gte || lte ? { createdAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {};

    const [newUsers, ordersInRange, paidOrders, byRole, byStatus, txAgg] = await Promise.all([
      this.prisma.user.count({ where: dateWhere }),
      this.prisma.order.count({ where: dateWhere }),
      this.prisma.order.findMany({
        where: { ...dateWhere, status: { in: [...EARNED_STATUSES] } },
        select: { amount: true, amountCents: true, createdAt: true },
      }),
      this.prisma.user.groupBy({ by: ['role'], _count: true, where: dateWhere }),
      this.prisma.order.groupBy({ by: ['status'], _count: true, where: dateWhere }),
      this.prisma.walletTx.aggregate({ _sum: { amountCents: true }, where: { type: 'escrow_release', ...(gte || lte ? { createdAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}) } }),
    ]);

    const gmvCents = paidOrders.reduce((s, o) => s + (o.amountCents ?? Math.round(parseAmount(o.amount) * 100)), 0);
    const volumeRows = paidOrders.map((o) => ({ createdAt: o.createdAt, value: parseAmount(o.amount) }));
    const growthRows = (await this.prisma.user.findMany({ where: dateWhere, select: { createdAt: true } })).map((u) => ({ createdAt: u.createdAt, value: 1 }));

    return {
      kpis: {
        newUsers,
        orders: ordersInRange,
        gmvCents,
        escrowReleasedCents: txAgg._sum.amountCents ?? 0,
      },
      usersByRole: Object.fromEntries(byRole.map((r) => [r.role, r._count])),
      ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      volumeSeries: monthlySeries(volumeRows, 12),
      growthSeries: monthlySeries(growthRows, 12),
    };
  }

  /** Filtered audit-log read for the admin console. */
  auditLog(filter: { actorId?: string; action?: string; entityType?: string; from?: string; to?: string; skip?: number; take?: number }) {
    return this.audit.list(filter);
  }

  /** Payments overview: wallet totals, per-role breakdown, date-filtered txns. */
  async payments(opts: { from?: string; to?: string } = {}) {
    const txWhere: Prisma.WalletTxWhereInput = {};
    if (opts.from || opts.to) {
      txWhere.createdAt = {};
      if (opts.from) txWhere.createdAt.gte = rangeStart(opts.from);
      if (opts.to) txWhere.createdAt.lte = rangeEnd(opts.to);
    }
    const [agg, txns, wallets, escrowOrders] = await Promise.all([
      this.prisma.wallet.aggregate({ _sum: { balanceCents: true }, _count: true }),
      this.prisma.walletTx.findMany({
        where: txWhere,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { wallet: { include: { user: { select: { id: true, name: true, role: true } } } } },
      }),
      this.prisma.wallet.findMany({ include: { user: { select: { role: true } } } }),
      // Money held in escrow = paid orders not yet released/delivered. Computed
      // server-side (finance-gated) so the SafeDeal page never needs orders_manage,
      // over ALL such orders rather than the first page. `amountCents` is nullable,
      // so fall back to parsing the string amount, matching reports().
      this.prisma.order.findMany({ where: { status: 'paid' }, select: { amountCents: true, amount: true } }),
    ]);
    const byType: Record<string, number> = {};
    for (const t of txns) byType[t.type] = (byType[t.type] ?? 0) + t.amountCents;
    const byRole: Record<string, number> = {};
    for (const w of wallets) byRole[w.user.role] = (byRole[w.user.role] ?? 0) + w.balanceCents;
    const escrowHeldCents = escrowOrders.reduce((s, o) => s + (o.amountCents ?? Math.round(parseAmount(o.amount) * 100)), 0);
    return {
      totalBalanceCents: agg._sum.balanceCents ?? 0,
      walletCount: agg._count,
      escrowHeldCents,
      byType,
      byRole,
      txns: txns.map((t) => ({
        id: t.id,
        amountCents: t.amountCents,
        type: t.type,
        note: t.note,
        createdAt: t.createdAt,
        user: t.wallet.user,
      })),
    };
  }

  // ── wallets (financial oversight) ──────────────────────────────
  /** Every wallet with its owner and role — buyers, sellers, loaders, all. */
  async wallets(search?: string, role?: string) {
    const userWhere: Prisma.UserWhereInput = {};
    if (role && role !== 'all') userWhere.role = role as never;
    if (search)
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    const wallets = await this.prisma.wallet.findMany({
      where: { user: userWhere },
      orderBy: { balanceCents: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, role: true, country: true } } },
    });
    return wallets.map((w) => ({ userId: w.userId, balanceCents: w.balanceCents, user: w.user }));
  }

  /** One user's full wallet ledger (transaction history). */
  async walletLedger(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        txns: { orderBy: { createdAt: 'desc' }, take: 200 },
      },
    });
    if (!wallet) return { userId, balanceCents: 0, user: null, txns: [] };
    return { userId, balanceCents: wallet.balanceCents, user: wallet.user, txns: wallet.txns };
  }

  /** Manually credit or debit any wallet (admin adjustment / manual refund). */
  async adjustWallet(userId: string, dto: AdjustWalletDto, adminId: string) {
    assertLegacyFinancialWritesEnabled('Manual wallet adjustment');
    if (dto.amountCents <= 0) throw new BadRequestException('Amount must be positive');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    // topup/refund credit the wallet; payout/withdraw debit it.
    const isCredit = dto.type === 'topup' || dto.type === 'refund';
    if (isCredit) await this.walletSvc.credit(userId, dto.amountCents, dto.type, dto.note ?? 'Admin adjustment');
    else await this.walletSvc.debit(userId, dto.amountCents, dto.type, dto.note ?? 'Admin adjustment');
    await this.audit.log({ actorId: adminId, action: `wallet.${dto.type}`, entityType: 'Wallet', entityId: userId, meta: { amountCents: dto.amountCents, note: dto.note } });
    return this.walletLedger(userId);
  }

  // ── payouts ────────────────────────────────────────────────────
  payouts(status?: string) {
    const where: Prisma.PayoutRequestWhereInput =
      status && status !== 'all' ? { status: status as never } : {};
    return this.prisma.payoutRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
  }

  async decidePayout(id: string, status: 'approved' | 'rejected', adminId: string, note?: string) {
    if (status === 'approved') assertLegacyFinancialWritesEnabled('Payout approval');
    const req = await this.prisma.payoutRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Payout request not found');
    if (req.status !== 'pending') throw new BadRequestException('Payout already decided');
    if (status === 'approved') {
      // Debit now; throws (and aborts) if the balance no longer covers it.
      await this.walletSvc.debit(req.userId, req.amountCents, 'payout', note ?? 'Payout approved');
    }
    const updated = await this.prisma.payoutRequest.update({
      where: { id },
      data: { status: status === 'approved' ? 'paid' : 'rejected', decidedById: adminId, decidedAt: new Date(), note: note ?? req.note },
      include: { user: { select: { id: true, name: true } } },
    });
    await this.audit.log({ actorId: adminId, action: `payout.${status}`, entityType: 'PayoutRequest', entityId: id, meta: { userId: req.userId, amountCents: req.amountCents, note } });
    const paid = status === 'approved';
    await this.notifications.create({
      userId: req.userId,
      system: 'wallet',
      type: paid ? 'wallet.payout_approved' : 'wallet.payout_declined',
      params: paid ? { amount: `${(req.amountCents / 100).toFixed(2)}` } : { reason: note },
      data: { payoutId: id, amountCents: req.amountCents },
      linkUrl: '/console/wallet',
    });
    return updated;
  }

  // ── role requests ──────────────────────────────────────────────
  roleRequests(status?: string) {
    return this.prisma.roleRequest.findMany({
      where: status && status !== 'all' ? { status: status as RoleRequestStatus } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { user: { select: { id: true, name: true, email: true, role: true, roles: true, country: true } } },
    });
  }

  async decideRoleRequest(id: string, status: 'approved' | 'rejected', adminId: string, note?: string) {
    const req = await this.prisma.roleRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'pending') throw new BadRequestException('Request already decided');
    if (status === 'approved') {
      const user = await this.prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, name: true, role: true, roles: true } });
      if (!user) throw new NotFoundException('User not found');
      // Grant the role if it isn't already the primary or an existing extra.
      if (user.role !== req.role && !user.roles.includes(req.role)) {
        await this.prisma.user.update({ where: { id: req.userId }, data: { roles: { push: req.role } } });
      }
      if (req.role === Role.worker) {
        await this.prisma.worker.upsert({
          where: { userId: req.userId },
          update: {},
          create: { userId: req.userId, name: user.name, status: 'available' },
        });
      }
    }
    const updated = await this.prisma.roleRequest.update({
      where: { id },
      data: { status, decidedAt: new Date(), decidedById: adminId, ...(note !== undefined ? { note } : {}) },
      include: { user: { select: { name: true, email: true } } },
    });
    await this.audit.log({
      actorId: adminId,
      action: `role_request.${status}`,
      entityType: 'RoleRequest',
      entityId: id,
      meta: { userId: req.userId, role: req.role, note },
    });
    const granted = status === 'approved';
    await this.notifications.create({
      userId: req.userId,
      system: 'account',
      type: granted ? 'role_request.approved' : 'role_request.declined',
      params: { role: { enum: 'role', value: req.role }, ...(granted ? {} : { reason: note }) },
      data: { role: req.role, status },
      linkUrl: '/console',
    });
    return updated;
  }

  // ── staff (internal ops team) ──────────────────────────────────
  staff() {
    return this.prisma.user.findMany({
      where: { role: 'admin' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, active: true, adminPermissions: true, createdAt: true },
    });
  }

  async createStaff(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: Role.admin,
        kycStatus: 'verified',
        // Staff are provisioned by an admin, not self-registered — no link to click.
        emailVerifiedAt: new Date(),
        // Default a new staff account to no permissions unless granted explicitly.
        adminPermissions: dto.permissions ?? [],
      },
      select: { id: true, name: true, email: true, role: true, active: true, adminPermissions: true, createdAt: true },
    });
    return user;
  }

  private async staffMember(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!u || u.role !== 'admin') throw new NotFoundException('Staff member not found');
    return u;
  }

  async updateStaff(id: string, dto: UpdateStaffDto) {
    await this.staffMember(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        active: dto.active,
        ...(dto.permissions ? { adminPermissions: { set: dto.permissions } } : {}),
      },
      select: { id: true, name: true, email: true, role: true, active: true, adminPermissions: true },
    });
  }

  async deleteStaff(id: string, adminId: string) {
    if (id === adminId) throw new BadRequestException('You cannot remove your own account.');
    await this.staffMember(id);
    // Soft-delete: deactivate rather than hard-delete (preserves audit/FK integrity).
    await this.prisma.user.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private statements: StatementsService,
  ) {}

  @Get('products')
  @RequirePermissions('products_moderate')
  pendingProducts() {
    return this.admin.pendingProducts();
  }

  @Get('products/all')
  @RequirePermissions('products_moderate')
  allProducts(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: string,
  ) {
    return this.admin.allProducts({ status, search, categoryId, type });
  }

  @Patch('products/:id/approve')
  @RequirePermissions('products_moderate')
  approveProduct(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.admin.approveProduct(id, admin.id);
  }

  @Patch('products/:id/reject')
  @RequirePermissions('products_moderate')
  rejectProduct(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: RejectProductDto) {
    return this.admin.rejectProduct(id, body.reason, admin.id);
  }

  @Patch('products/:id')
  @RequirePermissions('products_moderate')
  updateProduct(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.admin.updateProduct(id, body, admin.id);
  }

  @Delete('products/:id')
  @RequirePermissions('products_moderate')
  deleteProduct(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.admin.deleteProduct(id, admin.id);
  }

  @Get('users')
  @RequirePermissions('users_manage')
  users(@Query('role') role?: string, @Query('search') search?: string) {
    return this.admin.users(role, search);
  }

  @Get('profile')
  profile(@CurrentUser() admin: AuthUser) {
    return this.admin.profile(admin.id);
  }

  @Patch('profile/password')
  updateOwnPassword(@CurrentUser() admin: AuthUser, @Body() body: UpdateOwnPasswordDto) {
    return this.admin.updateOwnPassword(admin.id, body);
  }

  @Post('users')
  @RequirePermissions('users_manage')
  createUser(@CurrentUser() admin: AuthUser, @Body() body: CreateUserDto) {
    return this.admin.createUser(body, admin.id);
  }

  @Get('users/:id')
  @RequirePermissions('users_manage')
  user(@Param('id') id: string) {
    return this.admin.user(id);
  }

  @Patch('users/:id')
  @RequirePermissions('users_manage')
  updateUser(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.admin.updateUser(id, body, admin.id);
  }

  @Post('users/:id/roles')
  @RequirePermissions('users_manage')
  grantRole(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: SetUserRoleDto) {
    return this.admin.grantUserRole(id, body.role, admin.id);
  }

  @Delete('users/:id/roles/:role')
  @RequirePermissions('users_manage')
  revokeRole(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Param('role') role: Role) {
    return this.admin.revokeUserRole(id, role, admin.id);
  }

  @Patch('users/:id/kyc')
  @RequirePermissions('users_manage')
  setUserKyc(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: SetUserKycDto) {
    return this.admin.setUserKyc(id, body.status, admin.id);
  }

  @Delete('users/:id')
  @RequirePermissions('users_manage')
  deleteUser(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.admin.deleteUser(id, admin.id);
  }

  @Get('hires')
  @RequireAnyPermission('transport_manage', 'loaders_manage')
  hires() {
    return this.admin.hires();
  }

  // markets
  @Get('markets')
  @RequirePermissions('markets_manage')
  markets(@Query('status') status?: string) {
    return this.admin.markets(status);
  }

  @Post('markets')
  @RequirePermissions('markets_manage')
  createMarket(@Body() dto: UpsertMarketDto) {
    return this.admin.createMarket(dto);
  }

  @Patch('markets/:id/approve')
  @RequirePermissions('markets_manage')
  approveMarket(@Param('id') id: string) {
    return this.admin.decideMarket(id, 'approved');
  }

  @Patch('markets/:id/reject')
  @RequirePermissions('markets_manage')
  rejectMarket(@Param('id') id: string) {
    return this.admin.decideMarket(id, 'rejected');
  }

  @Patch('markets/:id')
  @RequirePermissions('markets_manage')
  updateMarket(@Param('id') id: string, @Body() dto: Partial<UpsertMarketDto>) {
    return this.admin.updateMarket(id, dto);
  }

  @Delete('markets/:id')
  @RequirePermissions('markets_manage')
  deleteMarket(@Param('id') id: string) {
    return this.admin.deleteMarket(id);
  }

  @Get('orders')
  @RequirePermissions('orders_manage')
  orders(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.admin.orders({ status, search, from, to, skip: skip ? Number(skip) : undefined, take: take ? Number(take) : undefined });
  }

  @Get('orders/:id')
  @RequirePermissions('orders_manage')
  orderDetail(@Param('id') id: string) {
    return this.admin.orderDetail(id);
  }

  @Patch('orders/:id/status')
  @RequirePermissions('orders_manage')
  setOrderStatus(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.admin.setOrderStatus(id, body.status, admin.id, body.note);
  }

  @Get('disputes')
  @RequirePermissions('disputes_manage')
  disputes() {
    return this.admin.disputes();
  }

  @Post('orders/:id/dispute/resolve')
  @RequirePermissions('disputes_manage')
  resolveDispute(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: ResolveDisputeDto) {
    return this.admin.resolveDispute(id, body, admin.id);
  }

  @Get('kyc')
  @RequirePermissions('kyc_review')
  kyc(@Query('status') status?: string) {
    return this.admin.kycQueue(status);
  }

  @Get('kyc/:id')
  @RequirePermissions('kyc_review')
  kycDetail(@Param('id') id: string) {
    return this.admin.kycDetail(id);
  }

  @Patch('kyc/:id')
  @RequirePermissions('kyc_review')
  decide(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: DecideKycDto) {
    return this.admin.decideKyc(id, body.status, admin.id, body.note);
  }

  @Get('invoices')
  @RequirePermissions('finance_manage')
  invoices(@Query('status') status?: string, @Query('kind') kind?: string) {
    return this.admin.invoices(status, kind);
  }

  @Get('payments/statement.csv')
  @RequirePermissions('finance_manage')
  paymentsCsv(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    return this.statements.streamPlatformCsv(res, from, to);
  }

  @Get('payments/statement.pdf')
  @RequirePermissions('finance_manage')
  paymentsPdf(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    return this.statements.streamPlatformPdf(res, from, to);
  }

  @Get('stats')
  @RequirePermissions('reports_view')
  stats() {
    return this.admin.stats();
  }

  @Get('stats/volume')
  @RequirePermissions('reports_view')
  volume() {
    return this.admin.volumeSeries();
  }

  @Get('reports')
  @RequirePermissions('reports_view')
  reports(@Query('from') from?: string, @Query('to') to?: string) {
    return this.admin.reports(from, to);
  }

  @Get('audit')
  @RequirePermissions('audit_view')
  audit(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.admin.auditLog({ actorId, action, entityType, from, to, skip: skip ? Number(skip) : undefined, take: take ? Number(take) : undefined });
  }

  @Get('payments')
  @RequirePermissions('finance_manage')
  payments(@Query('from') from?: string, @Query('to') to?: string) {
    return this.admin.payments({ from, to });
  }

  @Get('wallets')
  @RequirePermissions('finance_manage')
  wallets(@Query('search') search?: string, @Query('role') role?: string) {
    return this.admin.wallets(search, role);
  }

  @Get('wallets/:userId')
  @RequirePermissions('finance_manage')
  walletLedger(@Param('userId') userId: string) {
    return this.admin.walletLedger(userId);
  }

  @Post('wallets/:userId/adjust')
  @RequirePermissions('finance_manage')
  adjustWallet(@CurrentUser() admin: AuthUser, @Param('userId') userId: string, @Body() body: AdjustWalletDto) {
    return this.admin.adjustWallet(userId, body, admin.id);
  }

  @Get('payouts')
  @RequirePermissions('finance_manage')
  payouts(@Query('status') status?: string) {
    return this.admin.payouts(status);
  }

  @Post('payouts/:id/decide')
  @RequirePermissions('finance_manage')
  decidePayout(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: DecidePayoutDto) {
    return this.admin.decidePayout(id, body.status, admin.id, body.note);
  }

  // role requests
  @Get('role-requests')
  @RequirePermissions('role_requests')
  roleRequests(@Query('status') status?: string) {
    return this.admin.roleRequests(status);
  }

  @Patch('role-requests/:id')
  @RequirePermissions('role_requests')
  decideRoleRequest(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() body: DecideRoleRequestDto,
  ) {
    return this.admin.decideRoleRequest(id, body.status, admin.id, body.note);
  }

  // staff (internal team)
  @Get('staff')
  @RequirePermissions('staff_manage')
  staffList() {
    return this.admin.staff();
  }

  @Post('staff')
  @RequirePermissions('staff_manage')
  createStaff(@Body() body: CreateStaffDto) {
    return this.admin.createStaff(body);
  }

  @Patch('staff/:id')
  @RequirePermissions('staff_manage')
  updateStaff(@Param('id') id: string, @Body() body: UpdateStaffDto) {
    return this.admin.updateStaff(id, body);
  }

  @Delete('staff/:id')
  @RequirePermissions('staff_manage')
  deleteStaff(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.admin.deleteStaff(id, admin.id);
  }
}

@Module({
  imports: [StatementsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
