import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Injectable, Module,
  NotFoundException, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { LabourRateBasis, Prisma, WorkerTypeGroup } from '@prisma/client';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString,
  Max, MaxLength, Min,
} from 'class-validator';
import { MAX_MONEY_CENTS } from '../common/limits';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';

/**
 * Physical labour — who supplies which KIND of worker, and at what rate.
 *
 * The point of this module is a privacy inversion. A loading company's crew are
 * its own people: their names, phones and assignments are internal and never
 * leave the company's dashboard. What the public sees instead is the TYPES of
 * worker it supplies and the rates for them, which is what a buyer actually
 * shops on. An independent worker publishes the same shape, differing only in
 * that `headcount` is themselves.
 *
 * Enquiries are NOT re-implemented here: hiring goes through `HireRequest` with
 * `targetType = 'loaderco' | 'worker'` exactly as it always has, so escrow,
 * notifications and invoicing are untouched.
 */

/** Accounts that may publish labour offerings. */
export const LABOUR_ROLES = ['loaderco', 'workerco', 'worker'] as const;
export type LabourRole = (typeof LABOUR_ROLES)[number];

/**
 * Which worker-type groups each labour role may publish.
 *
 * `loaderco` is a LOADING company: it supplies loading and material-handling
 * crew and nothing else. Without this it could list harvest gangs and roasting
 * operators, which a buyer only discovers after enquiring — the same failure the
 * service taxonomy guards against with `canRolePriceService`.
 *
 * `workerco` is the general labour supplier and `worker` is one person selling
 * their own labour; both reach every group, loading included.
 */
const ROLE_GROUPS: Record<LabourRole, readonly WorkerTypeGroup[]> = {
  loaderco: ['loading_handling'],
  workerco: Object.values(WorkerTypeGroup),
  worker: Object.values(WorkerTypeGroup),
};

/** Does this role reach that group? */
export function canRoleSupplyGroup(role: string, group: WorkerTypeGroup): boolean {
  const groups = ROLE_GROUPS[role as LabourRole];
  return !!groups && groups.includes(group);
}

const RATE_BASES = Object.values(LabourRateBasis);
const TYPE_GROUPS = Object.values(WorkerTypeGroup);
/** The one basis that may carry no rate at all. */
const ON_REQUEST: LabourRateBasis = 'on_request';

const isLabourRole = (value: unknown): value is LabourRole =>
  typeof value === 'string' && (LABOUR_ROLES as readonly string[]).includes(value);

const OFFERING_SELECT = {
  id: true, workerTypeId: true, rateBasis: true, rateMinCents: true, rateMaxCents: true,
  currency: true, headcount: true, minHours: true, notes: true, isNegotiable: true,
  isActive: true, createdAt: true,
  workerType: {
    select: {
      id: true, slug: true, nameEn: true, group: true, isActive: true,
      translations: { select: { locale: true, name: true } },
    },
  },
} satisfies Prisma.WorkerOfferingSelect;

/** Fold the translation rows down to the one label the caller's locale wants. */
type WithTranslations = { translations: { locale: string; name: string }[]; nameEn: string };
const localized = <T extends WithTranslations>(row: T, locale: Lang) => ({
  ...row,
  name: row.translations.find((t) => t.locale === locale)?.name ?? row.nameEn,
});

@Injectable()
export class WorkforceService {
  constructor(private prisma: PrismaService) {}

  /* ── taxonomy ────────────────────────────────────────────────────── */

  /** Every active worker type, grouped the way the trade thinks about them. */
  async types(locale: Lang, opts: { includeInactive?: boolean; role?: string } = {}) {
    const rows = await this.prisma.workerType.findMany({
      where: {
        ...(opts.includeInactive ? {} : { isActive: true }),
        // Scoping the catalogue is what keeps a loading company's picker from
        // offering it types the write path would then refuse.
        ...(opts.role && ROLE_GROUPS[opts.role as LabourRole]
          ? { group: { in: [...ROLE_GROUPS[opts.role as LabourRole]] } }
          : {}),
      },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true, slug: true, nameEn: true, group: true, isActive: true, sortOrder: true,
        translations: { select: { locale: true, name: true } },
        _count: { select: { offerings: { where: { isActive: true } } } },
      },
    });
    return rows.map((r) => ({ ...localized(r, locale), providerCount: r._count.offerings }));
  }

  /* ── the provider's own offerings ────────────────────────────────── */

  private roleOf(user: AuthUser): LabourRole {
    const role = [user.role, ...(user.roles ?? [])].find(isLabourRole);
    if (!role) throw new ForbiddenException('This account does not supply labour.');
    return role;
  }

  /**
   * A rate is required unless the basis is `on_request`, and a range must not
   * run backwards. Checked here rather than in the DTO because both are
   * relationships between fields, not per-field rules.
   */
  private assertRateCoherent(dto: { rateBasis?: string; rateMinCents?: number | null; rateMaxCents?: number | null }) {
    if (dto.rateBasis === ON_REQUEST) return;
    const hasMin = dto.rateMinCents != null;
    const hasMax = dto.rateMaxCents != null;
    if (!hasMin && !hasMax) throw new BadRequestException('Set a rate, or choose "on request".');
    if (hasMin && hasMax && dto.rateMaxCents! < dto.rateMinCents!) {
      throw new BadRequestException('The maximum rate cannot be below the minimum.');
    }
  }

  /**
   * Resolve a type and check the caller's role may supply it.
   *
   * Two gates, both necessary: the type must be live, and the role must reach
   * its group — a loading company listing "Harvest gang" would surface in a
   * search it cannot serve, which the buyer only finds out after enquiring.
   */
  private async assertSuppliable(role: LabourRole, workerTypeId: string) {
    const type = await this.prisma.workerType.findUnique({
      where: { id: workerTypeId },
      select: { id: true, isActive: true, nameEn: true, group: true },
    });
    if (!type || !type.isActive) throw new NotFoundException('Worker type not found');
    if (!canRoleSupplyGroup(role, type.group)) {
      throw new ForbiddenException(`Your account type cannot supply "${type.nameEn}".`);
    }
    return type;
  }

  /** The caller's own rows, inactive ones included — it is their edit surface. */
  async mine(user: AuthUser, locale: Lang) {
    this.roleOf(user);
    const rows = await this.prisma.workerOffering.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: 'asc' }],
      select: OFFERING_SELECT,
    });
    return rows.map((r) => ({ ...r, workerType: localized(r.workerType, locale) }));
  }

  async create(user: AuthUser, dto: UpsertOfferingDto, locale: Lang) {
    const role = this.roleOf(user);
    await this.assertSuppliable(role, dto.workerTypeId);
    this.assertRateCoherent(dto);

    const clash = await this.prisma.workerOffering.findUnique({
      where: { userId_workerTypeId: { userId: user.id, workerTypeId: dto.workerTypeId } },
      select: { id: true },
    });
    // A second row for the same type is an edit, not an addition — say so rather
    // than 500ing on the unique index.
    if (clash) throw new BadRequestException('You already price this worker type. Edit that entry instead.');

    const row = await this.prisma.workerOffering.create({
      data: {
        userId: user.id,
        workerTypeId: dto.workerTypeId,
        rateBasis: dto.rateBasis as LabourRateBasis,
        ...this.writable(dto),
      },
      select: OFFERING_SELECT,
    });
    return { ...row, workerType: localized(row.workerType, locale) };
  }

  /**
   * The mutable columns. `workerTypeId` is deliberately NOT among them: a row IS
   * the rate for one type, so pointing it at another is a delete and a create —
   * and repointing would slip past the uniqueness the create path checks.
   */
  private writable(dto: UpsertOfferingDto | PatchOfferingDto) {
    return {
      ...(dto.rateBasis !== undefined ? { rateBasis: dto.rateBasis as LabourRateBasis } : {}),
      ...(dto.rateMinCents !== undefined ? { rateMinCents: dto.rateMinCents } : {}),
      ...(dto.rateMaxCents !== undefined ? { rateMaxCents: dto.rateMaxCents } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.headcount !== undefined ? { headcount: dto.headcount } : {}),
      ...(dto.minHours !== undefined ? { minHours: dto.minHours } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.isNegotiable !== undefined ? { isNegotiable: dto.isNegotiable } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  /** Ownership, not just role: a provider may only touch their own rows. */
  private async ownRow(user: AuthUser, id: string) {
    this.roleOf(user);
    const row = await this.prisma.workerOffering.findFirst({
      where: { id, userId: user.id },
      select: { id: true, rateBasis: true, rateMinCents: true, rateMaxCents: true },
    });
    if (!row) throw new NotFoundException('Offering not found');
    return row;
  }

  async update(user: AuthUser, id: string, dto: PatchOfferingDto, locale: Lang) {
    const row = await this.ownRow(user, id);
    // Validate the RESULTING state, not the patch: clearing a rate on a row that
    // is not `on_request` must fail even though the patch mentions one field.
    this.assertRateCoherent({
      rateBasis: dto.rateBasis ?? row.rateBasis,
      rateMinCents: dto.rateMinCents !== undefined ? dto.rateMinCents : row.rateMinCents,
      rateMaxCents: dto.rateMaxCents !== undefined ? dto.rateMaxCents : row.rateMaxCents,
    });
    const updated = await this.prisma.workerOffering.update({
      where: { id },
      data: this.writable(dto),
      select: OFFERING_SELECT,
    });
    return { ...updated, workerType: localized(updated.workerType, locale) };
  }

  async remove(user: AuthUser, id: string) {
    await this.ownRow(user, id);
    await this.prisma.workerOffering.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Price many types at once with one shared rate, then tune individually.
   *
   * Onboarding is the reason this exists: a loading company supplies a dozen of
   * the handling types and would otherwise fill a dozen forms. Types already
   * priced are SKIPPED, never overwritten — a bulk add must not quietly reset
   * rates the company has already tuned.
   */
  async bulkCreate(user: AuthUser, dto: BulkAddOfferingsDto) {
    const role = this.roleOf(user);
    this.assertRateCoherent(dto);

    const types = await this.prisma.workerType.findMany({
      where: { id: { in: dto.workerTypeIds }, isActive: true },
      select: { id: true, group: true },
    });
    // A type the role cannot supply is rejected, not silently created — a
    // loading company ticking a packing type must be told, not quietly listed.
    const valid = new Set(types.filter((t) => canRoleSupplyGroup(role, t.group)).map((t) => t.id));
    const rejected = dto.workerTypeIds.filter((id) => !valid.has(id));

    const existing = await this.prisma.workerOffering.findMany({
      where: { userId: user.id, workerTypeId: { in: [...valid] } },
      select: { workerTypeId: true },
    });
    const already = new Set(existing.map((e) => e.workerTypeId));
    const toCreate = [...valid].filter((id) => !already.has(id));

    if (toCreate.length) {
      await this.prisma.workerOffering.createMany({
        data: toCreate.map((workerTypeId) => ({
          userId: user.id,
          workerTypeId,
          rateBasis: dto.rateBasis as LabourRateBasis,
          rateMinCents: dto.rateMinCents ?? null,
          rateMaxCents: dto.rateMaxCents ?? null,
          currency: dto.currency ?? 'USD',
          headcount: dto.headcount ?? null,
          minHours: dto.minHours ?? null,
          isNegotiable: dto.isNegotiable ?? false,
        })),
        skipDuplicates: true,
      });
    }
    // Reported rather than silently dropped: someone who ticked 20 boxes and got
    // 14 rows needs to know which 6 did not take.
    return { created: toCreate.length, skippedExisting: already.size, rejected };
  }

  /* ── public read ─────────────────────────────────────────────────── */

  /**
   * One provider's published offerings.
   *
   * Gated on the same `listApproved` flag the directory uses, so a provider
   * pulled from the directory stops answering here too — otherwise a stale
   * profile link would keep serving rates for someone withdrawn from sale.
   */
  async publicFor(userId: string, locale: Lang) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true, profile: { listApproved: true } },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Labour provider not found');
    const rows = await this.prisma.workerOffering.findMany({
      where: { userId, isActive: true, workerType: { isActive: true } },
      orderBy: [{ workerType: { group: 'asc' } }, { workerType: { sortOrder: 'asc' } }],
      select: OFFERING_SELECT,
    });
    return rows.map((r) => ({ ...r, workerType: localized(r.workerType, locale) }));
  }
}

/* ── DTOs ─────────────────────────────────────────────────────────── */

class OfferingFieldsDto {
  @ApiProperty({ enum: RATE_BASES })
  @IsIn(RATE_BASES) rateBasis!: string;

  @ApiProperty({ required: false, description: 'Minor units of `currency`; omit only for "on_request"' })
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) rateMinCents?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) rateMaxCents?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(8) currency?: string;

  @ApiProperty({ required: false, description: 'How many of this type can be fielded at once' })
  @IsOptional() @IsInt() @Min(0) @Max(100_000) headcount?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(24) minHours?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isNegotiable?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpsertOfferingDto extends OfferingFieldsDto {
  @ApiProperty() @IsString() workerTypeId!: string;
}

export class PatchOfferingDto {
  @ApiProperty({ required: false, enum: RATE_BASES })
  @IsOptional() @IsIn(RATE_BASES) rateBasis?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) rateMinCents?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) rateMaxCents?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(100_000) headcount?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(24) minHours?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isNegotiable?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class BulkAddOfferingsDto extends OfferingFieldsDto {
  @ApiProperty({ isArray: true, description: 'Already-priced types are skipped' })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsString({ each: true }) workerTypeIds!: string[];
}

export class UpsertWorkerTypeDto {
  @ApiProperty() @IsString() @MaxLength(80) slug!: string;
  @ApiProperty() @IsString() @MaxLength(120) nameEn!: string;
  @ApiProperty({ enum: TYPE_GROUPS }) @IsIn(TYPE_GROUPS) group!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class PatchWorkerTypeDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) nameEn?: string;
  @ApiProperty({ required: false, enum: TYPE_GROUPS }) @IsOptional() @IsIn(TYPE_GROUPS) group?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}

/* ── controllers ──────────────────────────────────────────────────── */

/** Public, unauthenticated reads — buyers browse before signing in. */
@ApiTags('labour')
@Controller('labour')
export class PublicLabourController {
  constructor(private svc: WorkforceService) {}

  @Get('types')
  types(@Locale() locale: Lang, @Query('role') role?: string) {
    // `?role=loaderco` scopes the catalogue to what that role may supply, so a
    // picker never offers a type the write path would refuse.
    return this.svc.types(locale, { role });
  }

  @Get('providers/:userId/offerings')
  offerings(@Param('userId') userId: string, @Locale() locale: Lang) {
    return this.svc.publicFor(userId, locale);
  }
}

/** The provider's own offerings — a loading company or an individual worker. */
@ApiTags('labour')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...LABOUR_ROLES)
@Controller('me/labour/offerings')
export class MyLabourOfferingsController {
  constructor(private svc: WorkforceService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser, @Locale() locale: Lang) {
    return this.svc.mine(user, locale);
  }

  /** The catalogue this account may price — already narrowed to its role. */
  @Get('available-types')
  availableTypes(@CurrentUser() user: AuthUser, @Locale() locale: Lang) {
    const role = [user.role, ...(user.roles ?? [])].find(isLabourRole);
    return this.svc.types(locale, { role });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertOfferingDto, @Locale() locale: Lang) {
    return this.svc.create(user, dto, locale);
  }

  /** Declared before `:id` so the literal path is not captured as an id. */
  @Post('bulk')
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BulkAddOfferingsDto) {
    return this.svc.bulkCreate(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PatchOfferingDto,
    @Locale() locale: Lang,
  ) {
    return this.svc.update(user, id, dto, locale);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

/**
 * Taxonomy administration. Types are DEACTIVATED rather than deleted, because
 * providers price against them and a hard delete would take their rates along.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('users_manage')
@Controller('admin/worker-types')
export class AdminWorkerTypesController {
  constructor(private svc: WorkforceService, private prisma: PrismaService) {}

  @Get()
  list(@Locale() locale: Lang, @Query('all') all?: string) {
    return this.svc.types(locale, { includeInactive: all === 'true' });
  }

  @Post()
  async create(@Body() dto: UpsertWorkerTypeDto) {
    const clash = await this.prisma.workerType.findUnique({ where: { slug: dto.slug }, select: { id: true } });
    if (clash) throw new BadRequestException('A worker type with that slug already exists.');
    return this.prisma.workerType.create({
      data: {
        slug: dto.slug,
        nameEn: dto.nameEn,
        group: dto.group as WorkerTypeGroup,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: PatchWorkerTypeDto) {
    const existing = await this.prisma.workerType.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Worker type not found');
    return this.prisma.workerType.update({
      where: { id },
      data: {
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.group !== undefined ? { group: dto.group as WorkerTypeGroup } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}

@Module({
  controllers: [PublicLabourController, MyLabourOfferingsController, AdminWorkerTypesController],
  providers: [WorkforceService],
  exports: [WorkforceService],
})
export class WorkforceModule {}
