import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { uploadLimits } from '../uploads/upload-limits';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Prisma, TripStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { VEHICLE_TYPES } from '@agrotraders/types';
import { PUBLIC_VEHICLE_SELECT, toPublicVehicle } from './vehicle-public';
import { MAX_MONEY_CENTS } from '../common/limits';
import { Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { secureOtp, secureReference } from '../common/secure-random';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit.service';
import { UploadsService } from '../uploads/uploads.service';
import { TextTranslationService } from '../translation/text-translation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';

const otp = () => secureOtp();
const ref = (p: string) => secureReference(p);

/**
 * API-08: real DTOs for two bodies that were declared as inline TypeScript object
 * types. Those erase at runtime, so the global ValidationPipe saw `Object`, skipped
 * validation entirely, and let a negative/fractional/string price — or any random
 * status string — through to Prisma (a 500, not a 400).
 */
export class CreateQuoteDto {
  @ApiProperty({ description: 'Freight price, USD cents', minimum: 1, maximum: MAX_MONEY_CENTS })
  @IsInt() @Min(1) @Max(MAX_MONEY_CENTS)
  priceCents!: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 365 })
  @IsOptional() @IsInt() @Min(0) @Max(365)
  etaDays?: number;
}

export class TripStatusDto {
  @ApiProperty({ enum: ['pending', 'loading', 'in_transit', 'delivered', 'delayed'] })
  @IsIn(['pending', 'loading', 'in_transit', 'delayed', 'delivered'])
  status!: TripStatus;
}

/**
 * API-08: a trip had no state machine at all — `delivered → pending → delivered`
 * was legal, and repeated `delivered` re-ran the completion side effects. Terminal
 * states stay terminal; everything else may only move forward or to `delayed`.
 */
const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  pending: ['loading', 'in_transit', 'delayed'],
  loading: ['in_transit', 'delayed'],
  in_transit: ['delivered', 'delayed'],
  delayed: ['loading', 'in_transit', 'delivered'],
  delivered: [],
};

/** Gallery cap, mirroring MAX_PRODUCT_IMAGES. */
export const MAX_VEHICLE_PHOTOS = 6;

export class CreateVehicleDto {
  @IsString() @MinLength(1) type!: string;
  @IsString() @MinLength(1) plate!: string;
  @IsOptional() @IsString() capacityMt?: string;
  @IsOptional() @IsString() makeModel?: string;
  @IsOptional() @IsInt() @Min(1900) year?: number;
  @IsOptional() @IsDateString() insuranceExpiry?: string;
  @IsOptional() @IsString() notes?: string;
  /** Structured body type buyers filter on; the free-text `type` stays as typed. */
  @ApiProperty({ required: false, enum: VEHICLE_TYPES })
  @IsOptional() @IsIn(VEHICLE_TYPES as unknown as string[]) vehicleType?: string;
  /** Canonical payload capacity. `capacityMt` is the legacy display fallback. */
  @IsOptional() @IsNumber() @Min(0) @Max(1000) capacityTons?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(200) bodyLengthFt?: number;
  @IsOptional() @IsBoolean() refrigerated?: boolean;
  /** Reefer range in whole °C. Stored as two numbers so buyers can filter it. */
  @IsOptional() @IsInt() @Min(-100) @Max(100) tempMinC?: number;
  @IsOptional() @IsInt() @Min(-100) @Max(100) tempMaxC?: number;
  @IsOptional() @IsBoolean() gpsTracking?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(50) driverCount?: number;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(120, { each: true })
  servicingCities?: string[];
  /** Rates in minor units of `rateCurrency`, like every other money column. */
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) ratePerKmCents?: number;
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) ratePerTripCents?: number;
  @IsOptional() @IsString() @MaxLength(8) rateCurrency?: string;
  @IsOptional() @IsBoolean() loadingIncluded?: boolean;
  @IsOptional() @IsDateString() permitExpiry?: string;
  @IsOptional() @IsDateString() availableFrom?: string;
  /** Gallery, ordered — the first entry becomes the cover (`photoUrl`). */
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_VEHICLE_PHOTOS) @IsString({ each: true }) photos?: string[];
}

export class UpdateVehicleDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() plate?: string;
  @IsOptional() @IsString() capacityMt?: string;
  @IsOptional() @IsString() makeModel?: string;
  @IsOptional() @IsInt() @Min(1900) year?: number;
  @IsOptional() @IsDateString() insuranceExpiry?: string;
  @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, enum: ['available', 'on_trip', 'maintenance'] })
  @IsOptional() @IsIn(['available', 'on_trip', 'maintenance']) status?: string;
  /** Structured body type buyers filter on; the free-text `type` stays as typed. */
  @ApiProperty({ required: false, enum: VEHICLE_TYPES })
  @IsOptional() @IsIn(VEHICLE_TYPES as unknown as string[]) vehicleType?: string;
  /** Canonical payload capacity. `capacityMt` is the legacy display fallback. */
  @IsOptional() @IsNumber() @Min(0) @Max(1000) capacityTons?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(200) bodyLengthFt?: number;
  @IsOptional() @IsBoolean() refrigerated?: boolean;
  /** Reefer range in whole °C. Stored as two numbers so buyers can filter it. */
  @IsOptional() @IsInt() @Min(-100) @Max(100) tempMinC?: number;
  @IsOptional() @IsInt() @Min(-100) @Max(100) tempMaxC?: number;
  @IsOptional() @IsBoolean() gpsTracking?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(50) driverCount?: number;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(120, { each: true })
  servicingCities?: string[];
  /** Rates in minor units of `rateCurrency`, like every other money column. */
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) ratePerKmCents?: number;
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) ratePerTripCents?: number;
  @IsOptional() @IsString() @MaxLength(8) rateCurrency?: string;
  @IsOptional() @IsBoolean() loadingIncluded?: boolean;
  @IsOptional() @IsDateString() permitExpiry?: string;
  @IsOptional() @IsDateString() availableFrom?: string;
  /** Gallery, ordered — the first entry becomes the cover (`photoUrl`). */
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_VEHICLE_PHOTOS) @IsString({ each: true }) photos?: string[];
}

export class CreateRouteDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) fromCity!: string;
  @IsString() @MinLength(1) toCity!: string;
  @IsOptional() @IsString() fromCountry?: string;
  @IsOptional() @IsString() toCountry?: string;
  @IsOptional() @IsInt() @Min(0) distanceKm?: number;
  @IsOptional() @IsInt() @Min(0) baseRateCents?: number;
}

export class UpdateRouteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() fromCity?: string;
  @IsOptional() @IsString() toCity?: string;
  @IsOptional() @IsString() fromCountry?: string;
  @IsOptional() @IsString() toCountry?: string;
  @IsOptional() @IsInt() @Min(0) distanceKm?: number;
  @IsOptional() @IsInt() @Min(0) baseRateCents?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateTransportRequestDto {
  @IsString() @MinLength(1) fromCity!: string;
  @IsString() @MinLength(1) toCity!: string;
  @IsString() @MinLength(1) cargo!: string;
  // Free-text weight (e.g. "500"); optional. Validated as a string so a
  // stray number can't reach Prisma's String? column and 500 the request.
  @IsOptional() @IsString() weightMt?: string;
}

@Injectable()
export class TransportService {
  constructor(
    private prisma: PrismaService,
    private text: TextTranslationService,
    private notifications: NotificationsService,
    private entitlements: EntitlementsService,
  ) {}

  // requests
  createRequest(userId: string, b: { fromCity: string; toCity: string; cargo: string; weightMt?: string }) {
    return this.prisma.transportRequest.create({
      data: { reference: ref('RQ'), fromCity: b.fromCity, toCity: b.toCity, cargo: b.cargo, weightMt: b.weightMt, createdById: userId },
    });
  }
  async openRequests(locale: Lang = 'en') {
    const rows = await this.prisma.transportRequest.findMany({
      where: { status: { in: ['open', 'quoted'] } },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } }, _count: { select: { quotes: true } } },
    });
    return this.text.localizeRows(rows, ['cargo'], locale);
  }
  async myRequests(userId: string, locale: Lang = 'en') {
    const rows = await this.prisma.transportRequest.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      include: { quotes: { include: { transporter: { select: { name: true } } } }, trip: true },
    });
    return this.text.localizeRows(rows, ['cargo'], locale);
  }

  // quotes
  async quote(requestId: string, transporterId: string, priceCents: number, etaDays?: number) {
    // Quoting a freight request is a "response to a hire request" for quota purposes.
    await this.entitlements.assertWithin(transporterId, 'transporter', 'hireResponsesPerMonth');
    const req = await this.prisma.transportRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    const q = await this.prisma.transportQuote.create({ data: { requestId, transporterId, priceCents, etaDays } });
    if (req.status === 'open') await this.prisma.transportRequest.update({ where: { id: requestId }, data: { status: 'quoted' } });
    // Tell the request owner a new quote landed (transactional → also emails).
    await this.notifications.create({
      userId: req.createdById,
      system: 'transport',
      type: 'transport.quote_new',
      params: { amount: `$${(priceCents / 100).toFixed(2)}` },
      data: { requestId, quoteId: q.id },
      linkUrl: '/console/transport',
    });
    return q;
  }
  async myQuotes(transporterId: string, locale: Lang = 'en') {
    const rows = await this.prisma.transportQuote.findMany({
      where: { transporterId },
      orderBy: { createdAt: 'desc' },
      include: { request: true },
    });
    // The cargo description lives on the nested request, so localize that level.
    const requests = await this.text.localizeRows(rows.map((r) => r.request), ['cargo'], locale);
    return rows.map((r, i) => ({ ...r, request: requests[i] }));
  }
  async withdrawQuote(id: string, transporterId: string) {
    const q = await this.prisma.transportQuote.findUnique({ where: { id } });
    if (!q || q.transporterId !== transporterId) throw new ForbiddenException('Not your quote');
    if (q.status !== 'pending') throw new ForbiddenException('Only pending quotes can be withdrawn');
    await this.prisma.transportQuote.delete({ where: { id } });
    return { ok: true };
  }
  async acceptQuote(quoteId: string, userId: string) {
    const quote = await this.prisma.transportQuote.findUnique({ where: { id: quoteId }, include: { request: true } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.request.createdById !== userId) throw new ForbiddenException('Not your request');
    if (quote.status !== 'pending') throw new BadRequestException('This quote is no longer available.');

    // F15: accept exactly one quote. Claim the request (open->assigned) and the
    // quote (pending->accepted) with conditional transitions inside a single
    // transaction; a concurrent accept or double tap matches zero rows and
    // aborts before a second trip is created. Losing quotes are rejected.
    const trip = await this.prisma.$transaction(async (tx) => {
      const claimedReq = await tx.transportRequest.updateMany({
        where: { id: quote.requestId, status: { in: ['open', 'quoted'] } },
        data: { status: 'assigned' },
      });
      if (claimedReq.count === 0) throw new BadRequestException('This request already has an accepted quote.');
      const claimedQuote = await tx.transportQuote.updateMany({
        where: { id: quoteId, status: 'pending' },
        data: { status: 'accepted' },
      });
      if (claimedQuote.count === 0) throw new BadRequestException('This quote is no longer available.');
      await tx.transportQuote.updateMany({
        where: { requestId: quote.requestId, id: { not: quoteId }, status: 'pending' },
        data: { status: 'rejected' },
      });
      return tx.trip.create({
        data: {
          reference: ref('TR'),
          fromCity: quote.request.fromCity,
          toCity: quote.request.toCity,
          cargo: quote.request.cargo,
          otp: otp(),
          transporterId: quote.transporterId,
          requestId: quote.requestId,
          status: 'pending',
        },
      });
    });
    // The transporter's quote was accepted — this is their "job assigned" moment.
    await this.notifications.create({
      userId: quote.transporterId,
      system: 'transport',
      type: 'transport.assigned',
      params: { reference: trip.reference, fromCity: trip.fromCity, toCity: trip.toCity },
      data: { tripId: trip.id, requestId: quote.requestId },
      linkUrl: '/console/transport',
    });
    return trip;
  }

  // trips
  async myTrips(transporterId: string, locale: Lang = 'en') {
    const rows = await this.prisma.trip.findMany({
      where: { transporterId },
      orderBy: { createdAt: 'desc' },
      include: { vehicle: true, route: true, order: { select: { reference: true, amount: true, buyer: { select: { name: true } } } } },
    });
    const present = <T,>(v: T | null): v is T => v !== null;
    const [vehicles, routes] = await Promise.all([
      this.text.localizeRows(rows.map((r) => r.vehicle).filter(present), ['type', 'notes'], locale),
      this.text.localizeRows(rows.map((r) => r.route).filter(present), ['name'], locale),
    ]);
    // Index by id: the filtered arrays above are shorter than `rows` when a trip
    // has no vehicle or route, so positional zipping would misalign.
    const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
    const vMap = byId(vehicles);
    const rMap = byId(routes);
    return rows.map((r) => ({
      ...r,
      vehicle: r.vehicle ? vMap.get(r.vehicle.id) ?? r.vehicle : r.vehicle,
      route: r.route ? rMap.get(r.route.id) ?? r.route : r.route,
    }));
  }
  async setTripStatus(id: string, transporterId: string, status: TripStatus) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip || trip.transporterId !== transporterId) throw new ForbiddenException('Not your trip');
    // API-08: enforce the trip state machine — no backwards moves, and `delivered`
    // is terminal so the completion side effects can't be re-run.
    if (trip.status !== status && !TRIP_TRANSITIONS[trip.status].includes(status)) {
      throw new BadRequestException(`Cannot move a trip from "${trip.status}" to "${status}".`);
    }
    // BL-04: marking the trip delivered is an OPERATIONAL status change only. It no
    // longer releases the held budget — the payee (transporter) must not be able to
    // pay themselves. The requester confirms completion via HiresService, which is
    // the sole authority that moves escrow to the provider.
    const updated = await this.prisma.trip.update({ where: { id }, data: { status } });
    if (status === 'delivered' && trip.requestId) {
      const req = await this.prisma.transportRequest.findUnique({
        where: { id: trip.requestId },
        select: { createdById: true },
      });
      if (req) {
        // Prompt the requester to confirm and release payment.
        await this.notifications.create({
          userId: req.createdById,
          system: 'transport',
          type: 'transport.delivered',
          params: { reference: trip.reference },
          data: { tripId: trip.id },
          linkUrl: '/console/transport',
        });
      }
    }
    return updated;
  }

  // vehicles
  async vehicles(ownerId: string, locale: Lang = 'en') {
    const rows = await this.prisma.vehicle.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
    return this.text.localizeRows(rows, ['type', 'notes'], locale);
  }
  /**
   * The columns a create and an update write identically. Kept in one place so a
   * field added to the form can never land on only one of the two paths — which
   * is how a vehicle ends up editable but not creatable (or worse, the reverse).
   *
   * `undefined` means "not sent, leave alone" on update; Prisma ignores it.
   */
  private vehicleFields(dto: CreateVehicleDto | UpdateVehicleDto) {
    const photos = dto.photos?.slice(0, MAX_VEHICLE_PHOTOS);
    return {
      type: dto.type,
      plate: dto.plate,
      capacityMt: dto.capacityMt,
      capacityTons: dto.capacityTons,
      bodyLengthFt: dto.bodyLengthFt,
      vehicleType: dto.vehicleType as never,
      // A reefer is refrigerated by definition, so the flag follows the type
      // rather than trusting a form that can disagree with itself.
      refrigerated: dto.vehicleType === 'reefer' ? true : dto.refrigerated,
      tempMinC: dto.tempMinC,
      tempMaxC: dto.tempMaxC,
      gpsTracking: dto.gpsTracking,
      driverCount: dto.driverCount,
      city: dto.city,
      country: dto.country,
      servicingCities: dto.servicingCities,
      ratePerKmCents: dto.ratePerKmCents,
      ratePerTripCents: dto.ratePerTripCents,
      rateCurrency: dto.rateCurrency,
      loadingIncluded: dto.loadingIncluded,
      makeModel: dto.makeModel,
      year: dto.year,
      insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
      permitExpiry: dto.permitExpiry ? new Date(dto.permitExpiry) : undefined,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
      notes: dto.notes,
      // The cover always mirrors photos[0] — same contract as Product.imageUrl.
      ...(photos ? { photos, photoUrl: photos[0] ?? null } : {}),
    };
  }

  async addVehicle(ownerId: string, dto: CreateVehicleDto) {
    // Fleet size is what the transporter ladder actually sells.
    await this.entitlements.assertWithin(ownerId, 'transporter', 'vehicles');
    return this.prisma.vehicle.create({
      data: {
        ownerId,
        ...this.vehicleFields(dto),
        type: dto.type,
        plate: dto.plate,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
      },
    });
  }
  private async ownedVehicle(id: string, ownerId: string) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v || v.ownerId !== ownerId) throw new ForbiddenException();
    return v;
  }
  async updateVehicle(id: string, ownerId: string, dto: UpdateVehicleDto) {
    await this.ownedVehicle(id, ownerId);
    return this.prisma.vehicle.update({
      where: { id },
      data: { ...this.vehicleFields(dto), status: dto.status as never },
    });
  }

  /**
   * Append newly uploaded photos to the gallery, capped. Appends rather than
   * replaces so uploading a second photo does not silently drop the first —
   * removing one is an explicit `photos: [...]` update from the form.
   */
  async addVehiclePhotos(id: string, ownerId: string, urls: string[]) {
    const existing = await this.ownedVehicle(id, ownerId);
    const photos = [...(existing.photos ?? []), ...urls].slice(0, MAX_VEHICLE_PHOTOS);
    return this.prisma.vehicle.update({
      where: { id },
      data: { photos, photoUrl: photos[0] ?? null },
    });
  }

  /** Back-compat: the single-photo endpoint now seeds/refreshes the gallery. */
  async setVehiclePhoto(id: string, ownerId: string, photoUrl: string) {
    return this.addVehiclePhotos(id, ownerId, [photoUrl]);
  }

  /* ── public reads ──────────────────────────────────────────────────────
   * No auth. Everything goes through PUBLIC_VEHICLE_SELECT + toPublicVehicle,
   * so the registration number is masked and no column leaks by omission.
   */

  /** Every vehicle belonging to one transporter — the profile's fleet section. */
  async publicVehiclesOf(ownerId: string | undefined, locale: Lang = 'en') {
    const rows = await this.prisma.vehicle.findMany({
      where: { ...(ownerId ? { ownerId } : {}), owner: { active: true } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: PUBLIC_VEHICLE_SELECT,
    });
    const localized = await this.text.localizeRows(rows, ['type', 'notes'], locale);
    const ownerIds = [...new Set(rows.map((row) => row.ownerId))];
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds }, active: true },
      select: { id: true, name: true },
    });
    const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
    const items = localized.map((row) => ({
      ...toPublicVehicle(row),
      owner: ownersById.get(row.ownerId),
    }));
    return ownerId ? items : { items };
  }

  /** One vehicle, for the public detail page. */
  async publicVehicle(id: string, locale: Lang = 'en') {
    const row = await this.prisma.vehicle.findFirst({
      where: { id, owner: { active: true } },
      select: PUBLIC_VEHICLE_SELECT,
    });
    if (!row) throw new NotFoundException('Vehicle not found');
    const [localized] = await this.text.localizeRows([row], ['type', 'notes'], locale);
    // The owner card the detail page needs — name and rating only, never contact
    // details: those stay behind the login the booking button leads to.
    const owner = await this.prisma.user.findUnique({
      where: { id: row.ownerId as string },
      select: {
        id: true, name: true, country: true, kycStatus: true, ratingAvg: true, ratingCount: true,
        profile: { select: { location: true } },
        routes: { where: { active: true }, take: 8, select: { name: true, fromCity: true, toCity: true, distanceKm: true } },
      },
    });
    return { ...toPublicVehicle(localized ?? row), owner };
  }
  async delVehicle(id: string, ownerId: string) {
    await this.ownedVehicle(id, ownerId);
    await this.prisma.vehicle.delete({ where: { id } });
    return { ok: true };
  }

  // routes
  async routes(ownerId: string, locale: Lang = 'en') {
    const rows = await this.prisma.route.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
    return this.text.localizeRows(rows, ['name'], locale);
  }
  addRoute(ownerId: string, dto: CreateRouteDto) {
    return this.prisma.route.create({ data: { ...dto, ownerId } });
  }
  private async ownedRoute(id: string, ownerId: string) {
    const r = await this.prisma.route.findUnique({ where: { id } });
    if (!r || r.ownerId !== ownerId) throw new ForbiddenException();
    return r;
  }
  async updateRoute(id: string, ownerId: string, dto: UpdateRouteDto) {
    await this.ownedRoute(id, ownerId);
    return this.prisma.route.update({ where: { id }, data: dto });
  }
  async delRoute(id: string, ownerId: string) {
    await this.ownedRoute(id, ownerId);
    await this.prisma.route.delete({ where: { id } });
    return { ok: true };
  }
}

@ApiTags('transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transport')
export class TransportController {
  constructor(
    private svc: TransportService,
    private uploads: UploadsService,
  ) {}

  @Post('requests')
  createRequest(@CurrentUser() u: AuthUser, @Body() b: CreateTransportRequestDto) {
    return this.svc.createRequest(u.id, b);
  }
  @Get('requests/mine')
  myRequests(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.myRequests(u.id, locale);
  }
  @Roles('transporter')
  @Get('requests')
  openRequests(@Locale() locale: Lang) {
    return this.svc.openRequests(locale);
  }
  @Roles('transporter')
  @Post('requests/:id/quotes')
  quote(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: CreateQuoteDto) {
    return this.svc.quote(id, u.id, b.priceCents, b.etaDays);
  }
  @Roles('transporter')
  @Get('quotes/mine')
  myQuotes(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.myQuotes(u.id, locale);
  }
  @Roles('transporter')
  @Delete('quotes/:id')
  withdrawQuote(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.withdrawQuote(id, u.id);
  }
  @Post('quotes/:id/accept')
  acceptQuote(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.acceptQuote(id, u.id);
  }
  @Roles('transporter')
  @Get('trips/mine')
  myTrips(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.myTrips(u.id, locale);
  }
  @Roles('transporter')
  @Patch('trips/:id/status')
  setTripStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: TripStatusDto) {
    return this.svc.setTripStatus(id, u.id, b.status);
  }
  @Roles('transporter')
  @Get('vehicles')
  vehicles(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.vehicles(u.id, locale);
  }
  @Roles('transporter')
  @Post('vehicles')
  addVehicle(@CurrentUser() u: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.svc.addVehicle(u.id, dto);
  }
  @Roles('transporter')
  @Patch('vehicles/:id')
  updateVehicle(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.svc.updateVehicle(id, u.id, dto);
  }
  @Roles('transporter')
  @ApiConsumes('multipart/form-data')
  /** Upload up to MAX_VEHICLE_PHOTOS gallery photos. Order in = order out. */
  @ApiBearerAuth()
  @Roles('transporter')
  @Post('vehicles/:id/photos')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', MAX_VEHICLE_PHOTOS, uploadLimits(MAX_VEHICLE_PHOTOS)))
  async uploadVehiclePhotos(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files?.length) throw new BadRequestException('No photos were uploaded.');
    // Sequential: sharp is CPU-bound, so parallelising the encodes just thrashes.
    const urls: string[] = [];
    for (const file of files) urls.push(await this.uploads.saveImage(file, 'vehicles'));
    return this.svc.addVehiclePhotos(id, u.id, urls);
  }

  @Post('vehicles/:id/photo')
  @UseInterceptors(FileInterceptor('file', uploadLimits()))
  async uploadVehiclePhoto(@CurrentUser() u: AuthUser, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    const photoUrl = await this.uploads.saveImage(file, 'vehicles');
    return this.svc.setVehiclePhoto(id, u.id, photoUrl);
  }
  @Roles('transporter')
  @Delete('vehicles/:id')
  delVehicle(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.delVehicle(id, u.id);
  }
  @Roles('transporter')
  @Get('routes')
  routes(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.routes(u.id, locale);
  }
  @Roles('transporter')
  @Post('routes')
  addRoute(@CurrentUser() u: AuthUser, @Body() dto: CreateRouteDto) {
    return this.svc.addRoute(u.id, dto);
  }
  @Roles('transporter')
  @Patch('routes/:id')
  updateRoute(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.svc.updateRoute(id, u.id, dto);
  }
  @Roles('transporter')
  @Delete('routes/:id')
  delRoute(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.delRoute(id, u.id);
  }
}

/** Admin oversight of transporter companies, their fleet and lanes. */
/**
 * Public, unauthenticated vehicle browsing.
 *
 * A separate controller precisely because the class-level `@UseGuards(JwtAuthGuard,
 * RolesGuard)` on `TransportController` is what kept vehicles invisible: every
 * route there is transporter-only and owner-scoped. Rather than punching a hole
 * in that guard (and risking the next route inheriting the hole), the public
 * surface is its own class with no guard at all and a hard-coded safe projection.
 *
 * Contact and booking stay behind login — this controller is read-only and has
 * no route that reveals a phone number, an email or a full registration number.
 */
@ApiTags('transport')
@Controller('transport/public')
export class PublicTransportController {
  constructor(private svc: TransportService) {}

  /** Every vehicle of one transporter — the fleet section of a public profile. */
  @Get('vehicles')
  vehicles(@Query('ownerId') ownerId: string, @Locale() locale: Lang) {
    return this.svc.publicVehiclesOf(ownerId || undefined, locale);
  }

  /** One vehicle, with the owner card the detail page shows beside it. */
  @Get('vehicles/:id')
  vehicle(@Param('id') id: string, @Locale() locale: Lang) {
    return this.svc.publicVehicle(id, locale);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('transport_manage')
@Controller('admin/transport')
export class AdminTransportController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** All transporter accounts with fleet/lane/trip counts and listing status. */
  @Get('companies')
  async companies(@Query('search') search?: string) {
    const where: Prisma.UserWhereInput = {
      OR: [{ role: 'transporter' }, { roles: { has: 'transporter' } }],
    };
    if (search) {
      where.AND = [{ OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        active: true,
        kycStatus: true,
        profile: { select: { listApproved: true, phone: true, whatsapp: true, location: true } },
        _count: { select: { vehicles: true, routes: true, trips: true, drivers: true } },
      },
    });
  }

  @Get('companies/:id')
  async company(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        active: true,
        kycStatus: true,
        profile: true,
        vehicles: { orderBy: { createdAt: 'desc' } },
        routes: { orderBy: { createdAt: 'desc' } },
        drivers: { orderBy: { createdAt: 'desc' } },
        trips: { orderBy: { createdAt: 'desc' }, take: 50, include: { vehicle: { select: { plate: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Transporter not found');
    return user;
  }

  /** Approve / revoke the transporter's public directory listing. */
  @Patch('companies/:id/listing')
  async setListing(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: { approved: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Transporter not found');
    await this.prisma.profile.upsert({
      where: { userId: id },
      update: { listApproved: !!body.approved },
      create: { userId: id, listApproved: !!body.approved },
    });
    await this.audit.log({ actorId: admin.id, action: 'transport.listing', entityType: 'User', entityId: id, meta: { approved: !!body.approved } });
    return { ok: true, listApproved: !!body.approved };
  }

  @Patch('vehicles/:id')
  async updateVehicle(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Vehicle not found');
    const updated = await this.prisma.vehicle.update({ where: { id }, data: dto as Prisma.VehicleUpdateInput });
    await this.audit.log({ actorId: admin.id, action: 'transport.vehicle_update', entityType: 'Vehicle', entityId: id, meta: { ...dto } });
    return updated;
  }

  @Patch('routes/:id')
  async updateRoute(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: UpdateRouteDto) {
    const existing = await this.prisma.route.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Route not found');
    const updated = await this.prisma.route.update({ where: { id }, data: dto });
    await this.audit.log({ actorId: admin.id, action: 'transport.route_update', entityType: 'Route', entityId: id, meta: { ...dto } });
    return updated;
  }
}

@Module({
  controllers: [PublicTransportController, TransportController, AdminTransportController],
  providers: [TransportService],
})
export class TransportModule {}
