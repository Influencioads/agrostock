import { BadRequestException, Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, ServiceCategory, ServiceEnquiryStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import { secureReference } from '../common/secure-random';

const SERVICE_ROLES = ['accountant', 'packer', 'processor', 'fulfillment_partner', 'finance_partner'] as const;

class ListServicesQuery {
  @IsOptional() @IsEnum(ServiceCategory) serviceType?: ServiceCategory;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() certification?: string;
  @IsOptional() @IsNumber() @Min(0) capacityMin?: number;
  @IsOptional() @IsNumber() @Min(0) priceMin?: number;
  @IsOptional() @IsNumber() @Min(0) priceMax?: number;
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() sort?: string;
}

class CreateEnquiryDto {
  @IsEnum(ServiceCategory) serviceType!: ServiceCategory;
  @IsString() @MinLength(10) message!: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsDateString() neededDate?: string;
}

class UpdateEnquiryDto {
  @IsEnum(ServiceEnquiryStatus) status!: ServiceEnquiryStatus;
}

class ProviderDto {
  @IsString() @MinLength(2) companyName!: string;
  @IsString() @MinLength(2) slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() categories!: ServiceCategory[];
  @IsArray() citiesServed!: string[];
  @IsOptional() @IsNumber() capacityPerDay?: number;
  @IsOptional() @IsString() capacityUnit?: string;
  @IsArray() certifications!: string[];
  @IsOptional() @IsNumber() minOrderQty?: number;
  @IsOptional() @IsNumber() turnaroundDays?: number;
  @IsOptional() @IsString() pricingBasis?: string;
  @IsOptional() @IsNumber() minPriceCents?: number;
  @IsOptional() @IsNumber() maxPriceCents?: number;
  @IsOptional() @IsArray() photos?: string[];
  @IsOptional() @IsBoolean() published?: boolean;
  @IsString() ownerId!: string;
}

@Injectable()
class ServicesService {
  constructor(private prisma: PrismaService) {}

  async list(q: ListServicesQuery) {
    const page = Number(q.page || 1), limit = Math.min(Number(q.limit || 12), 100);
    const where: Prisma.ServiceProviderWhereInput = { published: true };
    if (q.serviceType) where.categories = { has: q.serviceType };
    if (q.city) where.citiesServed = { has: q.city };
    if (q.certification) where.certifications = { has: q.certification };
    if (q.capacityMin != null) where.capacityPerDay = { gte: Number(q.capacityMin) };
    if (q.priceMin != null || q.priceMax != null) where.minPriceCents = { gte: q.priceMin ? Number(q.priceMin) * 100 : undefined, lte: q.priceMax ? Number(q.priceMax) * 100 : undefined };
    const orderBy: Prisma.ServiceProviderOrderByWithRelationInput = q.sort === 'price' ? { minPriceCents: 'asc' } : q.sort === 'rating' ? { rating: 'desc' } : { createdAt: 'desc' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceProvider.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { owner: { select: { id: true, name: true, ratingAvg: true, ratingCount: true } } } }),
      this.prisma.serviceProvider.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async detail(slug: string) {
    const row = await this.prisma.serviceProvider.findFirst({ where: { slug, published: true }, include: { owner: { select: { id: true, name: true, ratingAvg: true, ratingCount: true, country: true } } } });
    if (!row) throw new NotFoundException('Service provider not found');
    return row;
  }

  async enquire(slug: string, customerId: string, dto: CreateEnquiryDto) {
    const provider = await this.prisma.serviceProvider.findFirst({ where: { slug, published: true } });
    if (!provider) throw new NotFoundException('Service provider not found');
    if (!provider.categories.includes(dto.serviceType)) throw new BadRequestException('This provider does not offer the selected service.');
    return this.prisma.serviceEnquiry.create({ data: { reference: secureReference('SE'), providerId: provider.id, customerId, serviceType: dto.serviceType, message: dto.message, quantity: dto.quantity, neededDate: dto.neededDate ? new Date(dto.neededDate) : null } });
  }

  async dashboard(user: AuthUser) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { ownerId: user.id } });
    const enquiries = provider ? await this.prisma.serviceEnquiry.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true, email: true } } } }) : [];
    const counts = Object.fromEntries(Object.values(ServiceEnquiryStatus).map((s) => [s, enquiries.filter((e) => e.status === s).length]));
    return { role: user.role, provider, enquiries, counts, capacityCalendar: [], earningsCents: 0, invoices: { raised: 0, pending: 0, paid: 0 }, gstSummary: { taxableCents: 0, gstCents: 0 }, clients: [...new Set(enquiries.map((e) => e.customer.name))] };
  }

  async updateEnquiry(id: string, ownerId: string, status: ServiceEnquiryStatus) {
    const row = await this.prisma.serviceEnquiry.findUnique({ where: { id }, include: { provider: true } });
    if (!row || row.provider.ownerId !== ownerId) throw new NotFoundException('Enquiry not found');
    return this.prisma.serviceEnquiry.update({ where: { id }, data: { status } });
  }
}

@ApiTags('services') @Controller('services')
class PublicServicesController {
  constructor(private svc: ServicesService) {}
  @Get() list(@Query() q: ListServicesQuery) { return this.svc.list(q); }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.svc.detail(slug); }
}

@ApiTags('services') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Controller('services')
class ServiceActionsController {
  constructor(private svc: ServicesService) {}
  @Post(':slug/enquiries') enquire(@Param('slug') slug: string, @CurrentUser() u: AuthUser, @Body() dto: CreateEnquiryDto) { return this.svc.enquire(slug, u.id, dto); }
  @Roles(...SERVICE_ROLES) @Get('dashboard/mine') dashboard(@CurrentUser() u: AuthUser) { return this.svc.dashboard(u); }
  @Roles(...SERVICE_ROLES) @Patch('enquiries/:id') update(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() dto: UpdateEnquiryDto) { return this.svc.updateEnquiry(id, u.id, dto.status); }
}

@ApiTags('admin') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard) @Roles('admin') @RequirePermissions('users_manage') @Controller('admin/services')
class AdminServicesController {
  constructor(private prisma: PrismaService) {}
  @Get() list() { return this.prisma.serviceProvider.findMany({ orderBy: { createdAt: 'desc' }, include: { owner: { select: { name: true, email: true } }, _count: { select: { enquiries: true } } } }); }
  @Post() create(@Body() dto: ProviderDto) { return this.prisma.serviceProvider.create({ data: dto }); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<ProviderDto>) { return this.prisma.serviceProvider.update({ where: { id }, data: dto }); }
}

@Module({ controllers: [PublicServicesController, ServiceActionsController, AdminServicesController], providers: [ServicesService] })
export class ServicesModule {}
