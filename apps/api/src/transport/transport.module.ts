import {
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Prisma, TripStatus } from '@prisma/client';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit.service';
import { UploadsService } from '../uploads/uploads.service';
import { WalletService } from '../wallet/wallet.service';
import { TextTranslationService } from '../translation/text-translation.service';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';

const otp = () => String(Math.floor(1000 + Math.random() * 9000));
const ref = (p: string) => p + '-' + Math.floor(100 + Math.random() * 900);

export class CreateVehicleDto {
  @IsString() @MinLength(1) type!: string;
  @IsString() @MinLength(1) plate!: string;
  @IsOptional() @IsString() capacityMt?: string;
  @IsOptional() @IsString() makeModel?: string;
  @IsOptional() @IsInt() @Min(1900) year?: number;
  @IsOptional() @IsDateString() insuranceExpiry?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateVehicleDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() plate?: string;
  @IsOptional() @IsString() capacityMt?: string;
  @IsOptional() @IsString() makeModel?: string;
  @IsOptional() @IsInt() @Min(1900) year?: number;
  @IsOptional() @IsDateString() insuranceExpiry?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() status?: string;
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
    private wallets: WalletService,
    private text: TextTranslationService,
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
    const req = await this.prisma.transportRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    const q = await this.prisma.transportQuote.create({ data: { requestId, transporterId, priceCents, etaDays } });
    if (req.status === 'open') await this.prisma.transportRequest.update({ where: { id: requestId }, data: { status: 'quoted' } });
    return q;
  }
  myQuotes(transporterId: string) {
    return this.prisma.transportQuote.findMany({
      where: { transporterId },
      orderBy: { createdAt: 'desc' },
      include: { request: true },
    });
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
    await this.prisma.transportQuote.update({ where: { id: quoteId }, data: { status: 'accepted' } });
    await this.prisma.transportRequest.update({ where: { id: quote.requestId }, data: { status: 'assigned' } });
    return this.prisma.trip.create({
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
  }

  // trips
  myTrips(transporterId: string) {
    return this.prisma.trip.findMany({
      where: { transporterId },
      orderBy: { createdAt: 'desc' },
      include: { vehicle: true, route: true, order: { select: { reference: true, amount: true, buyer: { select: { name: true } } } } },
    });
  }
  async setTripStatus(id: string, transporterId: string, status: TripStatus) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip || trip.transporterId !== transporterId) throw new ForbiddenException('Not your trip');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({ where: { id }, data: { status } });
      // Delivery completes a hired trip — release the held budget to the transporter.
      if (status === 'delivered' && trip.requestId) {
        const hire = await tx.hireRequest.findFirst({
          where: { transportRequestId: trip.requestId, escrowState: 'held', targetType: 'transporter' },
        });
        if (hire?.budgetCents) {
          await this.wallets.credit(hire.targetUserId, hire.budgetCents, 'escrow_release', 'Delivery completed — payout', tx);
          await tx.hireRequest.update({ where: { id: hire.id }, data: { escrowState: 'released' } });
        }
      }
      return updated;
    });
  }

  // vehicles
  async vehicles(ownerId: string, locale: Lang = 'en') {
    const rows = await this.prisma.vehicle.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
    return this.text.localizeRows(rows, ['type', 'notes'], locale);
  }
  addVehicle(ownerId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        ownerId,
        type: dto.type,
        plate: dto.plate,
        capacityMt: dto.capacityMt,
        makeModel: dto.makeModel,
        year: dto.year,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        notes: dto.notes,
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
      data: {
        type: dto.type,
        plate: dto.plate,
        capacityMt: dto.capacityMt,
        makeModel: dto.makeModel,
        year: dto.year,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        notes: dto.notes,
        status: dto.status as never,
      },
    });
  }
  async setVehiclePhoto(id: string, ownerId: string, photoUrl: string) {
    await this.ownedVehicle(id, ownerId);
    return this.prisma.vehicle.update({ where: { id }, data: { photoUrl } });
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
  quote(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: { priceCents: number; etaDays?: number }) {
    return this.svc.quote(id, u.id, b.priceCents, b.etaDays);
  }
  @Roles('transporter')
  @Get('quotes/mine')
  myQuotes(@CurrentUser() u: AuthUser) {
    return this.svc.myQuotes(u.id);
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
  myTrips(@CurrentUser() u: AuthUser) {
    return this.svc.myTrips(u.id);
  }
  @Roles('transporter')
  @Patch('trips/:id/status')
  setTripStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: { status: TripStatus }) {
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
  @Post('vehicles/:id/photo')
  @UseInterceptors(FileInterceptor('file'))
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

@Module({ controllers: [TransportController, AdminTransportController], providers: [TransportService] })
export class TransportModule {}
