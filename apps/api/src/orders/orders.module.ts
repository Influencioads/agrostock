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
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { DispatchMode, OrderEventType, OrderStatus, Prisma } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { secureOtp, secureReference } from '../common/secure-random';
import { NotificationsService, type NotificationParams } from '../notifications/notifications.service';
import { TextTranslationService } from '../translation/text-translation.service';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';
import { assertLegacyFinancialWritesEnabled } from '../common/legacy-finance.guard';

/** "$1,180" → 1180 (dollars); 0 when unparseable. */
const money = (s: string) => Number(String(s).replace(/[^0-9.]/g, '')) || 0;
const ref = () => secureReference('AG');
const otp = () => secureOtp();
/** F36: wrong dispatch-OTP guesses allowed before the code locks. */
const DISPATCH_OTP_MAX_ATTEMPTS = 5;
/** The display string every money-mutating path must keep in sync with `amountCents`. */
const usd = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

// ── DTOs ─────────────────────────────────────────────────────────

export class PlaceOrderDto {
  @ApiProperty() @IsString() productSlug!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) qty!: number;
}

export class EnquiryDto {
  @ApiProperty() @IsString() productSlug!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) qty!: number;
  @ApiProperty({ required: false, maxLength: 600 }) @IsOptional() @IsString() @MaxLength(600) note?: string;
}

export class RespondDto {
  @ApiProperty({ required: false, description: 'Offered price per unit, USD cents' })
  @IsOptional() @IsInt() @Min(0) unitPriceCents?: number;
  @ApiProperty({ required: false, description: 'Total order value, USD cents' })
  @IsOptional() @IsInt() @Min(0) amountCents?: number;
  @ApiProperty({ required: false, maxLength: 600 }) @IsOptional() @IsString() @MaxLength(600) note?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: OrderStatus }) @IsIn(Object.values(OrderStatus)) status!: OrderStatus;
}

export class DispatchDto {
  @ApiProperty({ enum: ['platform', 'external'] })
  @IsIn(['platform', 'external'])
  mode!: DispatchMode;

  // mode = platform
  @ApiProperty({ required: false, description: 'AgroTraders transporter user id' })
  @IsOptional() @IsString() transporterUserId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() vehicleId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() routeId?: string;

  // mode = external
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) transporterName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) transporterPhone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) vehiclePlate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) driverName?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) fromCity?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) toCity?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '4821' }) @IsString() @MaxLength(8) otp!: string;
}

// ── State machine ────────────────────────────────────────────────

export type OrderParty = 'buyer' | 'seller' | 'transporter';

/**
 * The only legal status edges, and which party may drive each one.
 *
 * `dispatched`, `in_transit` and `delivered` are intentionally NOT reachable
 * from here — they are owned by `dispatch()` / `verifyPickup()` /
 * `verifyDelivery()` so the OTP handshake can never be bypassed by a plain
 * PATCH. `shipped` is legacy: old rows can still move off it, nothing enters it.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, { to: OrderStatus; by: OrderParty[] }[]> = {
  enquiry: [
    { to: 'quote', by: ['seller'] },
    { to: 'cancelled', by: ['buyer', 'seller'] },
  ],
  quote: [
    { to: 'processing', by: ['buyer'] },
    { to: 'cancelled', by: ['buyer', 'seller'] },
  ],
  processing: [
    { to: 'packed', by: ['seller'] },
    { to: 'cancelled', by: ['buyer', 'seller'] },
    { to: 'dispute', by: ['buyer', 'seller'] },
  ],
  paid: [
    { to: 'packed', by: ['seller'] },
    { to: 'dispute', by: ['buyer', 'seller'] },
  ],
  packed: [
    { to: 'dispute', by: ['buyer', 'seller'] },
  ],
  dispatched: [
    { to: 'dispute', by: ['buyer', 'seller'] },
  ],
  // Legacy rows only. They were never dispatched, so they carry no OTPs and
  // cannot re-enter the handshake — an admin (who bypasses this table) is the
  // escape hatch. Offering a forward edge here would both skip the OTP and
  // strand the order in `in_transit`, which only a delivery OTP can leave.
  shipped: [
    { to: 'dispute', by: ['buyer', 'seller'] },
  ],
  in_transit: [
    { to: 'dispute', by: ['buyer', 'seller'] },
  ],
  delivered: [],
  dispute: [
    { to: 'processing', by: ['seller'] },
    { to: 'cancelled', by: ['buyer', 'seller'] },
  ],
  cancelled: [],
};

/** Status → the timeline event we record when an order lands on it. */
const EVENT_FOR_STATUS: Partial<Record<OrderStatus, OrderEventType>> = {
  enquiry: 'enquiry_raised',
  quote: 'seller_quoted',
  processing: 'order_placed',
  paid: 'paid',
  packed: 'packed',
  dispatched: 'dispatched',
  in_transit: 'pickup_verified',
  delivered: 'delivery_verified',
  cancelled: 'cancelled',
  dispute: 'disputed',
};

const ORDER_INCLUDE = {
  product: { select: { id: true, name: true, slug: true, emoji: true, imageUrl: true, unit: true } },
  buyer: { select: { id: true, name: true, country: true } },
  seller: { select: { id: true, name: true, country: true } },
} as const;

const ORDER_DETAIL_INCLUDE = {
  ...ORDER_INCLUDE,
  events: {
    orderBy: { createdAt: 'asc' as const },
    include: { actor: { select: { id: true, name: true } } },
  },
  trip: {
    include: {
      transporter: { select: { id: true, name: true, country: true } },
      vehicle: true,
      route: true,
    },
  },
  invoices: {
    orderBy: { issuedAt: 'desc' as const },
    select: { id: true, number: true, kind: true, status: true, totalCents: true, currency: true, issuedAt: true },
  },
} as const;

type OrderWithParties = { buyerId: string; sellerId: string; trip?: { transporterId: string } | null };

const isAdmin = (u: AuthUser) => (u.roles ?? [u.role]).includes('admin');

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private text: TextTranslationService,
  ) {}

  // ── helpers ────────────────────────────────────────────────────

  private async notify(userId: string, type: string, params?: NotificationParams, data?: Record<string, unknown>) {
    // Persist + fan-out (realtime/push/email) is all handled by create(); title/body
    // are rendered from the `notification:<type>` catalog in the recipient's locale.
    await this.notifications.create({ userId, system: 'orders', type, params, data });
  }

  /**
   * Which party is this user on this order? Role guards are OR-over-effective-
   * roles, so a buyer+seller account passes @Roles('seller') on somebody else's
   * order — ownership must always be re-checked here.
   */
  private partiesOf(order: OrderWithParties, user: AuthUser): OrderParty[] {
    const parties: OrderParty[] = [];
    if (order.buyerId === user.id) parties.push('buyer');
    if (order.sellerId === user.id) parties.push('seller');
    if (order.trip?.transporterId === user.id) parties.push('transporter');
    return parties;
  }

  private assertParty(order: OrderWithParties, user: AuthUser): OrderParty[] {
    const parties = this.partiesOf(order, user);
    if (parties.length === 0 && !isAdmin(user)) throw new ForbiddenException('Not your order');
    return parties;
  }

  private event(
    tx: Prisma.TransactionClient,
    orderId: string,
    type: OrderEventType,
    actorId: string | null,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus | null,
    note?: string,
    meta?: Prisma.InputJsonValue,
  ) {
    return tx.orderEvent.create({
      data: { orderId, type, actorId, fromStatus, toStatus, note, meta },
    });
  }

  /**
   * OTPs are single-party secrets: the seller reads the pickup OTP off their
   * dispatch screen, the buyer reads the delivery OTP off theirs, and the
   * transporter types each one in. Nobody ever receives both, and the
   * transporter receives neither.
   */
  private maskOtps<T extends { pickupOtp: string | null; deliveryOtp: string | null }>(
    order: T,
    parties: OrderParty[],
    user: AuthUser,
  ): T {
    const admin = isAdmin(user);
    return {
      ...order,
      pickupOtp: admin || parties.includes('seller') ? order.pickupOtp : null,
      deliveryOtp: admin || parties.includes('buyer') ? order.deliveryOtp : null,
    };
  }

  // ── enquiry → quote → order ────────────────────────────────────

  /** Step 1: buyer raises an enquiry against a listing. No price is committed yet. */
  async enquiry(buyer: AuthUser, dto: EnquiryDto) {
    const product = await this.prisma.product.findUnique({ where: { slug: dto.productSlug } });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.sellerId) throw new ForbiddenException('Product has no seller');

    const unitPriceCents = product.priceCents ?? Math.round(money(product.price) * 100);
    const amountCents = unitPriceCents * dto.qty;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          reference: ref(),
          status: 'enquiry',
          amount: usd(amountCents),
          qty: `${dto.qty} MT`,
          amountCents,
          unitPriceCents,
          qtyValue: dto.qty,
          qtyUnit: 'MT',
          note: dto.note,
          productId: product.id,
          buyerId: buyer.id,
          sellerId: product.sellerId!,
        },
        include: ORDER_INCLUDE,
      });
      await this.event(tx, created.id, 'enquiry_raised', buyer.id, null, 'enquiry', dto.note);
      return created;
    });

    await this.notify(order.sellerId, 'order.new_enquiry', { buyer: order.buyer.name, product: product.name }, {
      orderId: order.id,
    });
    return order;
  }

  /** Step 2: seller responds with terms; the order becomes a quote the buyer can accept. */
  async respond(id: string, user: AuthUser, dto: RespondDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== user.id && !isAdmin(user)) throw new ForbiddenException('Not your order');
    if (order.status !== 'enquiry') throw new BadRequestException('Only an enquiry can be responded to.');

    const qty = order.qtyValue ?? 1;
    const unitPriceCents = dto.unitPriceCents ?? order.unitPriceCents ?? null;
    const amountCents =
      dto.amountCents ?? (unitPriceCents !== null ? Math.round(unitPriceCents * qty) : order.amountCents ?? 0);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id },
        data: {
          status: 'quote',
          unitPriceCents,
          amountCents,
          // Display string and cents move together, or seller revenue charts zero out.
          amount: usd(amountCents),
        },
        include: ORDER_INCLUDE,
      });
      await this.event(tx, id, 'seller_quoted', user.id, 'enquiry', 'quote', dto.note);
      return next;
    });

    await this.notify(updated.buyerId, 'order.seller_responded', { seller: updated.seller.name, amount: updated.amount ?? '', product: updated.product?.name ?? 'your enquiry' }, {
      orderId: id,
    });
    return updated;
  }

  /** Legacy direct purchase (skips the enquiry stage) — still used by "Buy now". */
  async place(buyerId: string, dto: PlaceOrderDto) {
    const product = await this.prisma.product.findUnique({ where: { slug: dto.productSlug } });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.sellerId) throw new ForbiddenException('Product has no seller');
    const unitPriceCents = product.priceCents ?? Math.round(money(product.price) * 100);
    const amountCents = unitPriceCents * dto.qty;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          reference: ref(),
          amount: usd(amountCents),
          qty: `${dto.qty} MT`,
          status: 'processing',
          amountCents,
          unitPriceCents,
          qtyValue: dto.qty,
          qtyUnit: 'MT',
          productId: product.id,
          buyerId,
          sellerId: product.sellerId!,
        },
        include: ORDER_INCLUDE,
      });
      await this.event(tx, created.id, 'order_placed', buyerId, null, 'processing');
      return created;
    });

    // Notify the seller of the new direct ("buy now") order.
    await this.notify(
      order.sellerId,
      'order.new_order',
      { reference: order.reference, buyer: order.buyer.name, product: product.name },
      { orderId: order.id },
    );
    return order;
  }

  // ── reads ──────────────────────────────────────────────────────

  /**
   * Localize the embedded `product.name` across a batch of orders in ONE round-
   * trip. Product names are English in the DB with no per-type translation table,
   * so they ride the generic translate-on-read cache. Mutates the joined product
   * objects in place (the same references returned to the client). No-op for en.
   */
  private async localizeOrders<T extends { product?: { name?: string | null } | null }>(
    rows: T[],
    locale: Lang,
  ): Promise<T[]> {
    const names = await this.text.localizeMany(rows.map((r) => r.product?.name), locale);
    rows.forEach((r, i) => {
      if (typeof names[i] === 'string' && r.product) r.product.name = names[i] as string;
    });
    return rows;
  }

  async mine(buyerId: string, locale: Lang = 'en') {
    const rows = await this.prisma.order.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    });
    return this.localizeOrders(rows, locale);
  }

  async incoming(sellerId: string, locale: Lang = 'en') {
    const rows = await this.prisma.order.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    });
    return this.localizeOrders(rows, locale);
  }

  /** A transporter's work queue: orders riding on one of their trips. */
  async transporting(transporterId: string, locale: Lang = 'en') {
    const rows = await this.prisma.order.findMany({
      where: { trip: { transporterId } },
      orderBy: { createdAt: 'desc' },
      include: { ...ORDER_INCLUDE, trip: { include: { vehicle: true, route: true } } },
    });
    return this.localizeOrders(rows, locale);
  }

  async one(id: string, user: AuthUser, locale: Lang = 'en') {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_DETAIL_INCLUDE });
    if (!order) throw new NotFoundException('Order not found');
    const parties = this.assertParty(order, user);
    const name = await this.text.localize(order.product?.name, locale);
    if (typeof name === 'string' && order.product) order.product.name = name;
    return { ...this.maskOtps(order, parties, user), parties };
  }

  // ── generic transitions ────────────────────────────────────────

  async setStatus(id: string, user: AuthUser, status: OrderStatus) {
    if (status === 'paid') assertLegacyFinancialWritesEnabled('Order payment status');
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { trip: { select: { transporterId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    const parties = this.assertParty(order, user);

    if (!isAdmin(user)) {
      const edge = ORDER_TRANSITIONS[order.status].find((e) => e.to === status);
      if (!edge) {
        throw new BadRequestException(
          `Cannot move an order from "${order.status}" to "${status}".` +
            (['dispatched', 'in_transit', 'delivered'].includes(status)
              ? ' Use the dispatch / OTP verification endpoints.'
              : ''),
        );
      }
      if (!edge.by.some((p) => parties.includes(p))) {
        throw new ForbiddenException(`Only the ${edge.by.join(' or ')} can move this order to "${status}".`);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.order.update({ where: { id }, data: { status }, include: ORDER_INCLUDE });
      await this.event(tx, id, EVENT_FOR_STATUS[status] ?? 'note', user.id, order.status, status);
      return next;
    });

    const counterparty = order.buyerId === user.id ? order.sellerId : order.buyerId;
    await this.notify(counterparty, 'order.status_changed', { reference: updated.reference, status: { enum: 'order_status', value: status } }, { orderId: id });
    return updated;
  }

  // ── dispatch ───────────────────────────────────────────────────

  /**
   * Seller hands the goods over. Two shapes:
   *   platform → an AgroTraders transporter; a Trip is created and linked.
   *   external → a third party typed in; no Trip exists at all.
   * Both mint the pickup + delivery OTPs, which live on the Order precisely
   * because the external case has no Trip to hang them on.
   */
  async dispatch(id: string, user: AuthUser, dto: DispatchDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { product: { select: { name: true } }, buyer: { select: { country: true } }, seller: { select: { country: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== user.id && !isAdmin(user)) throw new ForbiddenException('Only the seller can dispatch this order.');
    if (order.status !== 'packed' && order.status !== 'paid') {
      throw new BadRequestException('Mark the order packed (or paid) before dispatching it.');
    }
    if (order.dispatchedAt) throw new BadRequestException('This order was already dispatched.');

    const fromCity = dto.fromCity ?? order.seller.country ?? 'Origin';
    const toCity = dto.toCity ?? order.buyer.country ?? 'Destination';
    const cargo = order.product?.name ?? 'Cargo';
    const pickupOtp = otp();
    const deliveryOtp = otp();

    let transporterUserId: string | null = null;
    let transporterName = dto.transporterName ?? null;
    let vehiclePlate = dto.vehiclePlate ?? null;

    if (dto.mode === 'platform') {
      if (!dto.transporterUserId) throw new BadRequestException('Pick a transporter.');
      const transporter = await this.prisma.user.findFirst({ where: { id: dto.transporterUserId, active: true } });
      if (!transporter) throw new NotFoundException('Transporter not found');
      if (!new Set([transporter.role, ...transporter.roles]).has('transporter')) {
        throw new BadRequestException('That user is not a transporter.');
      }
      transporterUserId = transporter.id;
      transporterName = transporter.name;
      if (dto.vehicleId) {
        const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
        if (!vehicle || vehicle.ownerId !== transporter.id) throw new BadRequestException('That vehicle is not owned by this transporter.');
        vehiclePlate = vehicle.plate;
      }
    } else if (!dto.transporterName) {
      throw new BadRequestException('Enter the transporter name.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let tripId: string | null = null;
      if (dto.mode === 'platform') {
        const trip = await tx.trip.create({
          data: {
            reference: secureReference('TRP'),
            fromCity,
            toCity,
            cargo,
            status: 'pending',
            transporterId: transporterUserId!,
            vehicleId: dto.vehicleId ?? null,
            routeId: dto.routeId ?? null,
          },
        });
        tripId = trip.id;
      }
      const next = await tx.order.update({
        where: { id },
        data: {
          status: 'dispatched',
          dispatchMode: dto.mode,
          dispatchedAt: new Date(),
          transporterName,
          transporterPhone: dto.transporterPhone ?? null,
          vehiclePlate,
          driverName: dto.driverName ?? null,
          pickupOtp,
          deliveryOtp,
          tripId,
        },
        include: ORDER_DETAIL_INCLUDE,
      });
      await this.event(tx, id, 'dispatched', user.id, order.status, 'dispatched', undefined, {
        mode: dto.mode,
        transporterName,
        vehiclePlate,
      } as Prisma.InputJsonValue);
      return next;
    });

    await this.notify(order.buyerId, 'order.dispatched', { cargo }, { orderId: id });
    if (transporterUserId) {
      await this.notify(transporterUserId, 'order.load_assigned', { cargo, fromCity }, { orderId: id });
    }

    // The seller is the caller here, so they legitimately see the pickup OTP.
    const parties = this.partiesOf({ buyerId: order.buyerId, sellerId: order.sellerId, trip: null }, user);
    return this.maskOtps(updated, parties.length ? parties : ['seller'], user);
  }

  // ── OTP handshakes ─────────────────────────────────────────────

  /** Transporter (or, for external dispatch, the seller) confirms the load was collected. */
  async verifyPickup(id: string, user: AuthUser, code: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { trip: { select: { id: true, transporterId: true } } } });
    if (!order) throw new NotFoundException('Order not found');

    const allowed =
      order.dispatchMode === 'platform' ? order.trip?.transporterId === user.id : order.sellerId === user.id;
    if (!allowed && !isAdmin(user)) {
      throw new ForbiddenException(
        order.dispatchMode === 'platform'
          ? 'Only the assigned transporter can confirm pickup.'
          : 'Only the seller can confirm pickup for an external carrier.',
      );
    }
    if (order.status !== 'dispatched') throw new BadRequestException('This order is not awaiting pickup.');
    if (order.pickupVerifiedAt) throw new BadRequestException('Pickup was already confirmed.');
    // F36: lock the code once wrong guesses are exhausted so a 6-digit code
    // can't be brute-forced; the seller must re-dispatch to rotate it.
    if (order.pickupOtpAttempts >= DISPATCH_OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many incorrect attempts. Ask the seller to re-dispatch this order.');
    }
    if (!order.pickupOtp || order.pickupOtp !== code.trim()) {
      await this.prisma.order.update({ where: { id }, data: { pickupOtpAttempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect pickup OTP.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: 'in_transit', pickupVerifiedAt: new Date() } });
      if (order.trip) await tx.trip.update({ where: { id: order.trip.id }, data: { status: 'in_transit' } });
      await this.event(tx, id, 'pickup_verified', user.id, 'dispatched', 'in_transit');
    });

    await this.notify(order.buyerId, 'order.picked_up', { reference: order.reference }, { orderId: id });
    await this.notify(order.sellerId, 'order.picked_up', { reference: order.reference }, { orderId: id });
    return { ok: true as const, status: 'in_transit' as const };
  }

  /** Transporter (or, for external dispatch, the buyer) closes the order with the buyer's OTP. */
  async verifyDelivery(id: string, user: AuthUser, code: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { trip: { select: { id: true, transporterId: true } } } });
    if (!order) throw new NotFoundException('Order not found');

    const allowed =
      order.dispatchMode === 'platform' ? order.trip?.transporterId === user.id : order.buyerId === user.id;
    if (!allowed && !isAdmin(user)) {
      throw new ForbiddenException(
        order.dispatchMode === 'platform'
          ? 'Only the assigned transporter can confirm delivery.'
          : 'Only the buyer can confirm delivery from an external carrier.',
      );
    }
    if (order.status !== 'in_transit') throw new BadRequestException('This order is not in transit.');
    if (order.deliveryVerifiedAt) throw new BadRequestException('Delivery was already confirmed.');
    // F36: meter wrong guesses on the buyer's delivery code too.
    if (order.deliveryOtpAttempts >= DISPATCH_OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many incorrect attempts. Ask the seller to re-dispatch this order.');
    }
    if (!order.deliveryOtp || order.deliveryOtp !== code.trim()) {
      await this.prisma.order.update({ where: { id }, data: { deliveryOtpAttempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect delivery OTP.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: 'delivered', deliveryVerifiedAt: new Date() } });
      if (order.trip) await tx.trip.update({ where: { id: order.trip.id }, data: { status: 'delivered' } });
      await this.event(tx, id, 'delivery_verified', user.id, 'in_transit', 'delivered');
    });

    await this.notify(order.buyerId, 'order.delivered_buyer', { reference: order.reference }, { orderId: id });
    await this.notify(order.sellerId, 'order.delivered_seller', { reference: order.reference }, { orderId: id });
    return { ok: true as const, status: 'delivered' as const };
  }
}

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Roles('buyer')
  @Post()
  place(@CurrentUser() user: AuthUser, @Body() dto: PlaceOrderDto) {
    return this.orders.place(user.id, dto);
  }

  @Roles('buyer')
  @Post('enquiry')
  enquiry(@CurrentUser() user: AuthUser, @Body() dto: EnquiryDto) {
    return this.orders.enquiry(user, dto);
  }

  @Roles('buyer')
  @Get('mine')
  mine(@CurrentUser() user: AuthUser, @Locale() locale: Lang) {
    return this.orders.mine(user.id, locale);
  }

  @Roles('seller')
  @Get('incoming')
  incoming(@CurrentUser() user: AuthUser, @Locale() locale: Lang) {
    return this.orders.incoming(user.id, locale);
  }

  @Roles('transporter')
  @Get('transporting')
  transporting(@CurrentUser() user: AuthUser, @Locale() locale: Lang) {
    return this.orders.transporting(user.id, locale);
  }

  @Roles('seller')
  @Patch(':id/respond')
  respond(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RespondDto) {
    return this.orders.respond(id, user, dto);
  }

  @Patch(':id/status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.orders.setStatus(id, user, dto.status);
  }

  @Roles('seller')
  @Post(':id/dispatch')
  dispatch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DispatchDto) {
    return this.orders.dispatch(id, user, dto);
  }

  @Post(':id/pickup/verify')
  verifyPickup(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VerifyOtpDto) {
    return this.orders.verifyPickup(id, user, dto.otp);
  }

  @Post(':id/delivery/verify')
  verifyDelivery(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VerifyOtpDto) {
    return this.orders.verifyDelivery(id, user, dto.otp);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string, @Locale() locale: Lang) {
    return this.orders.one(id, user, locale);
  }
}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
