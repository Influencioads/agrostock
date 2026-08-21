import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Injectable, Module,
  NotFoundException, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Prisma, type Role } from '@prisma/client';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString,
  Max, MaxLength, Min,
} from 'class-validator';
import {
  canRolePriceService, isServiceRole, ON_REQUEST_BASIS, SERVICE_PRICING_BASES, SERVICE_ROLES,
} from '@agrotraders/types';
import { MAX_MONEY_CENTS } from '../common/limits';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { TextTranslationService } from '../translation/text-translation.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';

/**
 * Per-service pricing — what a provider charges for each leaf service it offers.
 *
 * The provider's existing profile row is untouched by everything here: its
 * `categories`, `pricingBasis` and `priceFromCents` keep driving the directory
 * card exactly as before, and these rows sit beside them. A provider who never
 * opens this screen carries on working.
 */

const PRICING_BASES = SERVICE_PRICING_BASES as unknown as string[];
const COUNTRY_SCOPES = ['GLOBAL', 'INDIA', 'RUSSIA', 'INTERNATIONAL'] as const;

const SERVICE_SELECT = {
  id: true, serviceNodeId: true, pricingBasis: true, priceMinCents: true, priceMaxCents: true,
  currency: true, minOrderQty: true, minOrderUnit: true, leadTimeDays: true, capacityNote: true,
  notes: true, countryScope: true, isNegotiable: true, isActive: true, createdAt: true,
  serviceNode: {
    select: {
      id: true, slug: true, nameEn: true, kind: true, level: true, isActive: true,
      translations: { select: { locale: true, name: true } },
    },
  },
} satisfies Prisma.ProviderServiceSelect;

@Injectable()
export class ProviderServicesService {
  constructor(
    private prisma: PrismaService,
    private text: TextTranslationService,
    private entitlements: EntitlementsService,
  ) {}

  /** The caller's service role, or a 403 — every write here is provider-only. */
  private roleOf(user: AuthUser): string {
    const role = [user.role, ...(user.roles ?? [])].find(isServiceRole);
    if (!role) throw new ForbiddenException('This account is not a service provider.');
    return role;
  }

  /** The caller's provider row, created empty on first use like `mine()` does. */
  private async providerOf(user: AuthUser): Promise<{ id: string }> {
    this.roleOf(user);
    const existing = await this.prisma.serviceProvider.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return existing ?? this.prisma.serviceProvider.create({ data: { userId: user.id }, select: { id: true } });
  }

  /**
   * Resolve a leaf and check the caller may price it.
   *
   * Two separate gates, both necessary: the node must actually be a leaf (a
   * group is navigation, not a service), and the role must reach that branch —
   * an accountant listing `processing/roasting` would surface in a search they
   * cannot serve, which the buyer only discovers after enquiring.
   */
  private async assertPricableLeaf(role: string, serviceNodeId: string) {
    const node = await this.prisma.serviceNode.findUnique({
      where: { id: serviceNodeId },
      select: { id: true, slug: true, isLeaf: true, isActive: true, nameEn: true },
    });
    if (!node || !node.isActive) throw new NotFoundException('Service not found');
    if (!node.isLeaf) throw new BadRequestException(`"${node.nameEn}" is a category, not a service you can price.`);
    if (!canRolePriceService(role, node.slug)) {
      throw new ForbiddenException(`Your account type cannot offer "${node.nameEn}".`);
    }
    return node;
  }

  /**
   * A price is required unless the basis is `on_request`, and a range must not
   * run backwards. Both are checked here rather than in the DTO because they are
   * relationships between fields, not per-field rules.
   */
  private assertPriceCoherent(dto: { pricingBasis: string; priceMinCents?: number; priceMaxCents?: number }) {
    const onRequest = dto.pricingBasis === ON_REQUEST_BASIS;
    const hasMin = dto.priceMinCents != null;
    const hasMax = dto.priceMaxCents != null;
    if (!onRequest && !hasMin && !hasMax) {
      throw new BadRequestException('Set a price, or choose "on request".');
    }
    if (hasMin && hasMax && dto.priceMaxCents! < dto.priceMinCents!) {
      throw new BadRequestException('The maximum price cannot be below the minimum.');
    }
  }

  /** The caller's own rows, including inactive ones — it is their edit surface. */
  async mine(user: AuthUser) {
    const provider = await this.providerOf(user);
    return this.prisma.providerService.findMany({
      where: { providerId: provider.id },
      orderBy: [{ createdAt: 'desc' }],
      select: SERVICE_SELECT,
    });
  }

  async create(user: AuthUser, dto: UpsertProviderServiceDto) {
    const role = this.roleOf(user);
    await this.entitlements.assertWithin(user.id, role as Role, 'pricedServices');
    const provider = await this.providerOf(user);
    await this.assertPricableLeaf(role, dto.serviceNodeId);
    this.assertPriceCoherent(dto);

    const clash = await this.prisma.providerService.findUnique({
      where: { providerId_serviceNodeId: { providerId: provider.id, serviceNodeId: dto.serviceNodeId } },
      select: { id: true },
    });
    // A second row for the same leaf is an edit, not an addition — say so rather
    // than 500ing on the unique index.
    if (clash) throw new BadRequestException('You already price this service. Edit that entry instead.');

    return this.prisma.providerService.create({
      data: {
        providerId: provider.id,
        serviceNodeId: dto.serviceNodeId,
        // Both required on create; `writable()` types them optional because it
        // also serves PATCH, so they are stated here rather than cast away.
        pricingBasis: dto.pricingBasis as never,
        ...this.writable(dto),
      },
      select: SERVICE_SELECT,
    });
  }

  /**
   * The mutable columns. `serviceNodeId` is deliberately NOT among them: a row
   * IS the price for one service, so pointing it at another is a delete and a
   * create, not an edit — and repointing it would slip past the uniqueness the
   * create path checks.
   */
  private writable(dto: UpsertProviderServiceDto | PatchProviderServiceDto) {
    return {
      ...(dto.pricingBasis !== undefined ? { pricingBasis: dto.pricingBasis as never } : {}),
      ...(dto.priceMinCents !== undefined ? { priceMinCents: dto.priceMinCents } : {}),
      ...(dto.priceMaxCents !== undefined ? { priceMaxCents: dto.priceMaxCents } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.minOrderQty !== undefined ? { minOrderQty: dto.minOrderQty } : {}),
      ...(dto.minOrderUnit !== undefined ? { minOrderUnit: dto.minOrderUnit } : {}),
      ...(dto.leadTimeDays !== undefined ? { leadTimeDays: dto.leadTimeDays } : {}),
      ...(dto.capacityNote !== undefined ? { capacityNote: dto.capacityNote } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.countryScope !== undefined ? { countryScope: dto.countryScope as never } : {}),
      ...(dto.isNegotiable !== undefined ? { isNegotiable: dto.isNegotiable } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  /** Ownership, not just role: a provider may only touch their own rows. */
  private async ownRow(user: AuthUser, id: string) {
    const provider = await this.providerOf(user);
    const row = await this.prisma.providerService.findFirst({
      where: { id, providerId: provider.id },
      select: { id: true, pricingBasis: true, priceMinCents: true, priceMaxCents: true },
    });
    if (!row) throw new NotFoundException('Service pricing not found');
    return row;
  }

  async update(user: AuthUser, id: string, dto: PatchProviderServiceDto) {
    const row = await this.ownRow(user, id);
    // Validate the RESULTING state, not the patch: clearing a price on a row
    // that is not `on_request` has to fail even though the patch mentions one field.
    this.assertPriceCoherent({
      pricingBasis: dto.pricingBasis ?? row.pricingBasis,
      priceMinCents: dto.priceMinCents !== undefined ? dto.priceMinCents : row.priceMinCents ?? undefined,
      priceMaxCents: dto.priceMaxCents !== undefined ? dto.priceMaxCents : row.priceMaxCents ?? undefined,
    });
    return this.prisma.providerService.update({
      where: { id },
      data: this.writable(dto),
      select: SERVICE_SELECT,
    });
  }

  /**
   * Removing a price the provider no longer offers is theirs to do — this is
   * their own listing data, not platform history, and nothing else references
   * it yet. Enquiries land in Batch 4 and will pin the node id, not this row.
   */
  async remove(user: AuthUser, id: string) {
    await this.ownRow(user, id);
    await this.prisma.providerService.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Add many leaves at once with one shared price, then edit individually.
   *
   * Onboarding is the reason this exists: a roasting house offers thirty of the
   * Roasting leaves and would otherwise fill thirty forms. Leaves the provider
   * already prices are SKIPPED, not overwritten — a bulk add must never quietly
   * reset prices they have already tuned.
   */
  async bulkCreate(user: AuthUser, dto: BulkAddProviderServicesDto) {
    const role = this.roleOf(user);
    const provider = await this.providerOf(user);
    this.assertPriceCoherent(dto);

    const nodes = await this.prisma.serviceNode.findMany({
      where: { id: { in: dto.serviceNodeIds }, isActive: true },
      select: { id: true, slug: true, isLeaf: true, nameEn: true },
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));

    const accepted: string[] = [];
    const rejected: { serviceNodeId: string; reason: string }[] = [];
    for (const id of dto.serviceNodeIds) {
      const node = byId.get(id);
      if (!node) rejected.push({ serviceNodeId: id, reason: 'not_found' });
      else if (!node.isLeaf) rejected.push({ serviceNodeId: id, reason: 'not_a_leaf' });
      else if (!canRolePriceService(role, node.slug)) rejected.push({ serviceNodeId: id, reason: 'not_allowed_for_role' });
      else accepted.push(id);
    }

    const existing = await this.prisma.providerService.findMany({
      where: { providerId: provider.id, serviceNodeId: { in: accepted } },
      select: { serviceNodeId: true },
    });
    const already = new Set(existing.map((e) => e.serviceNodeId));
    const toCreate = accepted.filter((id) => !already.has(id));

    // A bulk add creates N rows in one request: the quota MUST be checked against
    // the real count, or one call trivially bypasses the plan limit.
    if (toCreate.length) await this.entitlements.assertWithin(user.id, role as Role, 'pricedServices', toCreate.length);

    if (toCreate.length) {
      await this.prisma.providerService.createMany({
        data: toCreate.map((serviceNodeId) => ({
          providerId: provider.id,
          serviceNodeId,
          pricingBasis: dto.pricingBasis as never,
          priceMinCents: dto.priceMinCents ?? null,
          priceMaxCents: dto.priceMaxCents ?? null,
          currency: dto.currency ?? 'USD',
          isNegotiable: dto.isNegotiable ?? false,
        })),
        skipDuplicates: true,
      });
    }
    // Reported rather than silently dropped: a provider who ticked 40 boxes and
    // got 32 rows needs to know which 8 did not take, and why.
    return { created: toCreate.length, skippedExisting: already.size, rejected };
  }

  /* ── public read ─────────────────────────────────────────────────── */

  /** A listed provider's priced services, grouped for the profile page. */
  async publicFor(userId: string, locale: Lang) {
    const provider = await this.prisma.serviceProvider.findFirst({
      where: { userId, listed: true, listApproved: true, user: { active: true } },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('Service provider not found');
    const rows = await this.prisma.providerService.findMany({
      where: { providerId: provider.id, isActive: true, serviceNode: { isActive: true } },
      orderBy: [{ createdAt: 'asc' }],
      select: SERVICE_SELECT,
    });
    // The node name comes from its own translation table; `notes` is free text
    // the provider typed, so it goes through the generic cache like every other
    // free-text column on a public listing.
    const localized = await this.text.localizeRows(rows, ['notes'], locale);
    return localized.map((r) => ({
      ...r,
      serviceNode: {
        ...r.serviceNode,
        name: r.serviceNode.translations.find((t) => t.locale === locale)?.name ?? r.serviceNode.nameEn,
      },
    }));
  }
}

/* ── DTOs ─────────────────────────────────────────────────────────── */

class ProviderServiceFieldsDto {
  @ApiProperty({ enum: SERVICE_PRICING_BASES })
  @IsIn(PRICING_BASES) pricingBasis!: string;

  @ApiProperty({ required: false, description: 'Minor units of `currency`; omit only for "on_request"' })
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) priceMinCents?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) priceMaxCents?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) minOrderQty?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(24) minOrderUnit?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) leadTimeDays?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) capacityNote?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiProperty({ required: false, enum: COUNTRY_SCOPES })
  @IsOptional() @IsIn(COUNTRY_SCOPES as unknown as string[]) countryScope?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isNegotiable?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpsertProviderServiceDto extends ProviderServiceFieldsDto {
  @ApiProperty({ description: 'Must be a leaf ServiceNode' })
  @IsString() serviceNodeId!: string;
}

export class PatchProviderServiceDto {
  @ApiProperty({ required: false, enum: SERVICE_PRICING_BASES })
  @IsOptional() @IsIn(PRICING_BASES) pricingBasis?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) priceMinCents?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) priceMaxCents?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) minOrderQty?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(24) minOrderUnit?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) leadTimeDays?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) capacityNote?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiProperty({ required: false, enum: COUNTRY_SCOPES })
  @IsOptional() @IsIn(COUNTRY_SCOPES as unknown as string[]) countryScope?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isNegotiable?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class BulkAddProviderServicesDto extends ProviderServiceFieldsDto {
  @ApiProperty({ isArray: true, description: 'Leaf node ids; already-priced ones are skipped' })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsString({ each: true }) serviceNodeIds!: string[];
}

export class ReviewListingDto {
  @ApiProperty() @IsBoolean() approved!: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

/* ── controllers ──────────────────────────────────────────────────── */

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SERVICE_ROLES)
@Controller('me/service-provider/services')
export class MyProviderServicesController {
  constructor(private svc: ProviderServicesService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.svc.mine(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertProviderServiceDto) {
    return this.svc.create(user, dto);
  }

  /** Declared before `:id` so the literal path is not captured as an id. */
  @Post('bulk')
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BulkAddProviderServicesDto) {
    return this.svc.bulkCreate(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PatchProviderServiceDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@ApiTags('services')
@Controller('service-providers')
export class PublicProviderServicesController {
  constructor(private svc: ProviderServicesService) {}

  @Get(':userId/services')
  services(@Param('userId') userId: string, @Locale() locale: Lang) {
    return this.svc.publicFor(userId, locale);
  }
}

/**
 * Listing verification. Reuses the KYC-style approve/reject shape the platform
 * already has for transporters and loader companies (`Profile.listApproved`)
 * rather than introducing a second verification concept.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('users_manage')
@Controller('admin/service-providers')
export class AdminServiceProvidersController {
  constructor(private prisma: PrismaService) {}

  /** The queue: providers who asked to be listed, newest first. */
  @Get('pending')
  pending(@Query('all') all?: string) {
    return this.prisma.serviceProvider.findMany({
      where: all === 'true' ? { listed: true } : { listed: true, listApproved: false },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
      select: {
        id: true, companyName: true, categories: true, country: true, citiesServed: true,
        certifications: true, listed: true, listApproved: true, listRejectedReason: true,
        countriesServed: true, productsHandled: true, createdAt: true,
        _count: { select: { services: true } },
        user: { select: { id: true, name: true, role: true, kycStatus: true } },
      },
    });
  }

  @Patch(':id/review')
  async review(@Param('id') id: string, @Body() dto: ReviewListingDto) {
    const existing = await this.prisma.serviceProvider.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Service provider not found');
    return this.prisma.serviceProvider.update({
      where: { id },
      data: {
        listApproved: dto.approved,
        // Cleared on approval so a previously rejected provider is not left
        // showing a stale reason.
        listRejectedReason: dto.approved ? null : dto.reason ?? null,
      },
      select: { id: true, listApproved: true, listRejectedReason: true },
    });
  }
}

@Module({
  controllers: [MyProviderServicesController, PublicProviderServicesController, AdminServiceProvidersController],
  providers: [ProviderServicesService],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}
