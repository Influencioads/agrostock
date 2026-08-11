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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';
import {
  allowedCategories, isServiceRole, SERVICE_CATEGORIES, SERVICE_PRICING_BASES, SERVICE_ROLES,
} from '@agrotraders/types';
import { MAX_MONEY_CENTS } from '../common/limits';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

/**
 * Service providers — accountants, customs agents, finance companies, packers,
 * fulfilment and the processing trades.
 *
 * Deliberately thin. Enquiries are NOT re-implemented here: a provider receives,
 * accepts and declines them through the existing `HireRequest` flow with
 * `targetType = 'service_provider'`, which brings escrow, notifications and
 * invoicing along unchanged. This module only owns the listing profile and the
 * public read of it.
 */

export class UpdateServiceProfileDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) companyName?: string;

  /** Silently narrowed to what the caller's role may offer — see `allowedCategories`. */
  @ApiProperty({ required: false, isArray: true, enum: SERVICE_CATEGORIES })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsIn(SERVICE_CATEGORIES as unknown as string[], { each: true })
  categories?: string[];

  @ApiProperty({ required: false, isArray: true })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(120, { each: true })
  citiesServed?: string[];

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) country?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(10_000_000) capacityPerDay?: number;

  @ApiProperty({ required: false, isArray: true, description: 'FSSAI / ISO / HACCP …' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true })
  certifications?: string[];

  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(10_000_000) minOrderQty?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(365) turnaroundDays?: number;

  @ApiProperty({ required: false, enum: SERVICE_PRICING_BASES })
  @IsOptional() @IsIn(SERVICE_PRICING_BASES as unknown as string[]) pricingBasis?: string;

  @ApiProperty({ required: false, description: 'Minor units of priceCurrency; omit for "on enquiry"' })
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) priceFromCents?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(8) priceCurrency?: string;

  @ApiProperty({ required: false, isArray: true })
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) photos?: string[];

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) blurb?: string;

  /** Opt in to appearing in the directory. Rejected while the profile is empty. */
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() listed?: boolean;
}

/**
 * A concrete DTO is required here. Individual optional primitive parameters can
 * be presented to the global ValidationPipe as `undefined`, which class-validator
 * rejects as an unknown value before the controller runs.
 */
export class ListServiceProvidersQueryDto {
  @IsOptional() @IsIn(SERVICE_CATEGORIES as unknown as string[]) category?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsIn(SERVICE_ROLES as unknown as string[]) role?: string;
}

/** Public columns. An allow-list, so a column added later stays private by default. */
const PUBLIC_SELECT = {
  id: true, companyName: true, categories: true, citiesServed: true, country: true,
  capacityPerDay: true, certifications: true, minOrderQty: true, turnaroundDays: true,
  pricingBasis: true, priceFromCents: true, priceCurrency: true, photos: true, blurb: true,
  createdAt: true,
  user: {
    select: {
      id: true, name: true, role: true, roles: true, country: true, kycStatus: true,
      profile: { select: { location: true, rating: true } },
    },
  },
} as const;

@Injectable()
export class ServiceProvidersService {
  constructor(private prisma: PrismaService) {}

  /** The caller's own profile, created empty on first read so the form has a row. */
  async mine(user: AuthUser) {
    const role = [user.role, ...(user.roles ?? [])].find(isServiceRole);
    if (!role) throw new ForbiddenException('This account is not a service provider.');
    const existing = await this.prisma.serviceProvider.findUnique({ where: { userId: user.id } });
    if (existing) return existing;
    return this.prisma.serviceProvider.create({ data: { userId: user.id } });
  }

  async update(user: AuthUser, dto: UpdateServiceProfileDto) {
    const role = [user.role, ...(user.roles ?? [])].find(isServiceRole);
    if (!role) throw new ForbiddenException('This account is not a service provider.');
    await this.mine(user); // ensure the row exists

    // A role may only offer its own categories. Narrowed rather than rejected:
    // the client sends what the picker showed, and the picker is already scoped —
    // anything extra is a stale client, not a user error worth a 400.
    const categories = dto.categories ? allowedCategories(role, dto.categories) : undefined;

    // Listing requires something to list. A blank card in the directory wastes a
    // buyer's click and reflects badly on the provider.
    if (dto.listed === true) {
      const next = categories ?? (await this.mine(user)).categories;
      if (!next.length) {
        throw new BadRequestException('Add at least one service category before listing your profile.');
      }
    }

    return this.prisma.serviceProvider.update({
      where: { userId: user.id },
      data: {
        companyName: dto.companyName,
        ...(categories ? { categories: categories as never } : {}),
        citiesServed: dto.citiesServed,
        country: dto.country,
        capacityPerDay: dto.capacityPerDay,
        certifications: dto.certifications,
        minOrderQty: dto.minOrderQty,
        turnaroundDays: dto.turnaroundDays,
        pricingBasis: dto.pricingBasis as never,
        priceFromCents: dto.priceFromCents,
        priceCurrency: dto.priceCurrency,
        photos: dto.photos,
        blurb: dto.blurb,
        listed: dto.listed,
      },
    });
  }

  /**
   * Public directory of listed providers. Same shape of filters the other
   * directories take, so the existing Directory page can render it unchanged.
   */
  async list(q: { category?: string; city?: string; country?: string; search?: string; role?: string }) {
    const where: Prisma.ServiceProviderWhereInput = {
      listed: true,
      user: { active: true, ...(q.role && isServiceRole(q.role) ? { role: q.role as never } : {}) },
      ...(q.category ? { categories: { has: q.category as never } } : {}),
      ...(q.city ? { citiesServed: { has: q.city } } : {}),
      ...(q.country ? { country: q.country } : {}),
      ...(q.search
        ? {
            OR: [
              { companyName: { contains: q.search, mode: 'insensitive' } },
              { user: { name: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.prisma.serviceProvider.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      select: PUBLIC_SELECT,
    });
  }

  async publicOne(userId: string) {
    const row = await this.prisma.serviceProvider.findFirst({
      where: { userId, listed: true, user: { active: true } },
      select: PUBLIC_SELECT,
    });
    if (!row) throw new NotFoundException('Service provider not found');
    return row;
  }
}

/** Public, unauthenticated reads — buyers browse before signing in. */
@ApiTags('services')
@Controller('services')
export class PublicServiceProvidersController {
  constructor(private svc: ServiceProvidersService) {}

  @Get('providers')
  list(@Query() query: ListServiceProvidersQueryDto) {
    return this.svc.list(query);
  }

  @Get('providers/:userId')
  one(@Param('userId') userId: string) {
    return this.svc.publicOne(userId);
  }
}

/** The provider's own profile. */
@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SERVICE_ROLES)
@Controller('me/service-profile')
export class MyServiceProfileController {
  constructor(private svc: ServiceProvidersService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.svc.mine(user);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateServiceProfileDto) {
    return this.svc.update(user, dto);
  }
}

@Module({
  controllers: [PublicServiceProvidersController, MyServiceProfileController],
  providers: [ServiceProvidersService],
  exports: [ServiceProvidersService],
})
export class ServiceProvidersModule {}
