import {
  BadRequestException, Body, Controller, Get, Injectable, Module, NotFoundException,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Prisma, type ServiceNodeKind } from '@prisma/client';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';

/**
 * The service taxonomy — sections, groups, the optional country/subgroup levels,
 * and the leaf services a provider can price.
 *
 * The whole tree is ~600 nodes, so the public read serves it from one cached
 * query rather than paginating: a browse UI that has to fetch a level at a time
 * cannot do type-ahead across all leaves, which is the escape hatch that makes a
 * 544-leaf list usable at all. `CategoriesService` caches the product taxonomy
 * the same way for a far bigger tree.
 */

const NODE_KINDS = ['SECTION', 'GROUP', 'COUNTRY', 'SUBGROUP', 'SERVICE'] as const;

/** One node as the clients consume it, label already resolved for the locale. */
export interface TaxonomyNode {
  id: string;
  slug: string;
  parentId: string | null;
  name: string;
  nameEn: string;
  description: string | null;
  kind: ServiceNodeKind;
  countryScope: string | null;
  level: number;
  isLeaf: boolean;
  /** Retired nodes are returned only to admin surfaces, which must offer restore. */
  isActive: boolean;
  sortOrder: number;
  icon: string | null;
  children: TaxonomyNode[];
}

const NODE_SELECT = {
  id: true, slug: true, parentId: true, nameEn: true, descriptionEn: true,
  kind: true, countryScope: true, level: true, isLeaf: true, isActive: true,
  sortOrder: true, icon: true,
} satisfies Prisma.ServiceNodeSelect;

type NodeRow = Prisma.ServiceNodeGetPayload<{ select: typeof NODE_SELECT }> & {
  translations?: { name: string; description: string | null }[];
};

@Injectable()
export class ServiceTaxonomyService {
  constructor(private prisma: PrismaService) {}

  private cache = new Map<string, { at: number; value: unknown }>();
  private static readonly CACHE_TTL_MS = 5 * 60_000;

  /** Dropped whenever an admin writes, so the next read is authoritative. */
  private invalidate() {
    this.cache.clear();
  }

  private toNode(row: NodeRow): TaxonomyNode {
    const tr = row.translations?.[0];
    return {
      id: row.id,
      slug: row.slug,
      parentId: row.parentId,
      // Falls back to English when a locale has no row — the seed leaves the
      // uncertain leaves untranslated on purpose.
      name: tr?.name || row.nameEn,
      nameEn: row.nameEn,
      description: tr?.description ?? row.descriptionEn,
      kind: row.kind,
      countryScope: row.countryScope,
      level: row.level,
      isLeaf: row.isLeaf,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      icon: row.icon,
      children: [],
    };
  }

  /** Rebuild the tree from a flat, already-ordered row set. */
  private assemble(rows: NodeRow[]): TaxonomyNode[] {
    const byId = new Map<string, TaxonomyNode>();
    for (const row of rows) byId.set(row.id, this.toNode(row));
    const roots: TaxonomyNode[] = [];
    for (const node of byId.values()) {
      const parent = node.parentId ? byId.get(node.parentId) : null;
      // A node whose parent was filtered out (inactive, or outside a `section`
      // filter) is not promoted to a root — it would appear as a phantom section.
      if (node.parentId && !parent) continue;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  private async load(locale: Lang, includeInactive: boolean): Promise<NodeRow[]> {
    return this.prisma.serviceNode.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { nameEn: 'asc' }],
      select: {
        ...NODE_SELECT,
        translations: { where: { locale }, select: { name: true, description: true } },
      },
    });
  }

  /**
   * The full tree. `section` narrows to one branch, `depth` truncates, `country`
   * keeps only the branches that apply to a jurisdiction (plus the ones that
   * apply everywhere, which is most of them).
   */
  async tree(
    locale: Lang,
    opts: { section?: string; country?: string; depth?: number; includeInactive?: boolean } = {},
  ): Promise<TaxonomyNode[]> {
    const key = `tree|${locale}|${opts.section ?? ''}|${opts.country ?? ''}|${opts.depth ?? ''}|${opts.includeInactive ? 1 : 0}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < ServiceTaxonomyService.CACHE_TTL_MS) return hit.value as TaxonomyNode[];

    let rows = await this.load(locale, !!opts.includeInactive);
    if (opts.section) {
      // Slug is the materialized path, so a branch is a prefix match — no
      // recursive descent and no second column to keep in step.
      rows = rows.filter((r) => r.slug === opts.section || r.slug.startsWith(`${opts.section}/`));
    }
    if (opts.country) {
      const want = opts.country.toUpperCase();
      rows = rows.filter((r) => !r.countryScope || r.countryScope === 'GLOBAL' || r.countryScope === want);
    }
    if (opts.depth) rows = rows.filter((r) => r.level <= opts.depth!);

    const value = this.assemble(rows);
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  /** One node with its ancestors and immediate children — the node page. */
  async node(slug: string, locale: Lang) {
    const row = await this.prisma.serviceNode.findUnique({
      where: { slug },
      select: { ...NODE_SELECT, translations: { where: { locale }, select: { name: true, description: true } } },
    });
    if (!row || !row.isActive) throw new NotFoundException('Service not found');

    // Ancestors are every proper prefix of the path — one query, no recursion.
    const parts = row.slug.split('/');
    const ancestorSlugs = parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
    const [ancestors, children] = await Promise.all([
      ancestorSlugs.length
        ? this.prisma.serviceNode.findMany({
            where: { slug: { in: ancestorSlugs } },
            orderBy: { level: 'asc' },
            select: { ...NODE_SELECT, translations: { where: { locale }, select: { name: true, description: true } } },
          })
        : Promise.resolve([] as NodeRow[]),
      this.prisma.serviceNode.findMany({
        where: { parentId: row.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
        select: { ...NODE_SELECT, translations: { where: { locale }, select: { name: true, description: true } } },
      }),
    ]);

    return {
      ...this.toNode(row),
      ancestors: ancestors.map((a) => this.toNode(a)),
      children: children.map((c) => this.toNode(c)),
    };
  }

  /** The provider "countries served" reference list. Not taxonomy country nodes. */
  countries() {
    return this.prisma.serviceCountry.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
      select: { code: true, nameEn: true },
    });
  }

  /* ── admin writes ───────────────────────────────────────────────── */

  /**
   * Slugs are the seed's identity for a node, so they are derived from the
   * parent path and never taken from the client — an admin renaming a node must
   * not silently re-key it and orphan the provider rows pointing at it.
   */
  private async childSlug(parentId: string | null, name: string): Promise<string> {
    const base = name.replace(/&/g, ' and ').replace(/\//g, ' ')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!base) throw new BadRequestException('Name must contain at least one letter or digit.');
    if (!parentId) return base;
    const parent = await this.prisma.serviceNode.findUnique({ where: { id: parentId }, select: { slug: true } });
    if (!parent) throw new NotFoundException('Parent node not found');
    return `${parent.slug}/${base}`;
  }

  async create(dto: CreateServiceNodeDto) {
    const parent = dto.parentId
      ? await this.prisma.serviceNode.findUnique({ where: { id: dto.parentId }, select: { id: true, level: true, kind: true } })
      : null;
    if (dto.parentId && !parent) throw new NotFoundException('Parent node not found');
    // A leaf is priced, not navigated: hanging a child off one would make the
    // parent both a branch and a price row.
    if (parent?.kind === 'SERVICE') throw new BadRequestException('A leaf service cannot have children.');

    const slug = await this.childSlug(dto.parentId ?? null, dto.nameEn);
    const clash = await this.prisma.serviceNode.findUnique({ where: { slug }, select: { id: true } });
    if (clash) throw new BadRequestException('A node with that name already exists here.');

    const created = await this.prisma.serviceNode.create({
      data: {
        slug,
        parentId: dto.parentId ?? null,
        nameEn: dto.nameEn,
        descriptionEn: dto.descriptionEn ?? null,
        kind: dto.kind as ServiceNodeKind,
        countryScope: dto.countryScope ? (dto.countryScope as never) : null,
        level: (parent?.level ?? 0) + 1,
        isLeaf: dto.kind === 'SERVICE',
        sortOrder: dto.sortOrder ?? 0,
      },
      select: NODE_SELECT,
    });
    if (dto.nameRu) await this.setTranslation(created.id, 'ru', dto.nameRu);
    this.invalidate();
    return created;
  }

  private setTranslation(nodeId: string, locale: string, name: string) {
    return this.prisma.serviceNodeTranslation.upsert({
      where: { nodeId_locale: { nodeId, locale } },
      create: { nodeId, locale, name },
      update: { name },
    });
  }

  /**
   * Rename / re-describe / retire. The slug is deliberately NOT recomputed on
   * rename: it is the seed's upsert key and a provider's stable reference, so
   * changing it would both duplicate the node on the next seed run and break
   * every link to it.
   */
  async update(id: string, dto: UpdateServiceNodeDto) {
    const existing = await this.prisma.serviceNode.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Service node not found');
    const updated = await this.prisma.serviceNode.update({
      where: { id },
      data: {
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.descriptionEn !== undefined ? { descriptionEn: dto.descriptionEn } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
      },
      select: NODE_SELECT,
    });
    if (dto.nameRu !== undefined) await this.setTranslation(id, 'ru', dto.nameRu);
    this.invalidate();
    return updated;
  }

  /** Drag-drop reorder: one write per moved sibling, in a transaction. */
  async reorder(dto: ReorderServiceNodesDto) {
    await this.prisma.$transaction(
      dto.order.map((id, index) =>
        this.prisma.serviceNode.update({ where: { id }, data: { sortOrder: index }, select: { id: true } }),
      ),
    );
    this.invalidate();
    return { ok: true, reordered: dto.order.length };
  }

  /**
   * Retire a node and everything under it.
   *
   * Deactivation, never deletion — a provider may have priced this leaf, and the
   * historical record has to keep resolving. There is no delete endpoint at all
   * for the same reason.
   */
  async deactivate(id: string, isActive: boolean) {
    const node = await this.prisma.serviceNode.findUnique({ where: { id }, select: { slug: true } });
    if (!node) throw new NotFoundException('Service node not found');
    const result = await this.prisma.serviceNode.updateMany({
      where: { OR: [{ slug: node.slug }, { slug: { startsWith: `${node.slug}/` } }] },
      data: { isActive },
    });
    this.invalidate();
    return { ok: true, affected: result.count };
  }
}

/* ── DTOs ─────────────────────────────────────────────────────────── */

export class CreateServiceNodeDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) nameEn!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) nameRu?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2000) descriptionEn?: string;
  @ApiProperty({ enum: NODE_KINDS }) @IsIn(NODE_KINDS as unknown as string[]) kind!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() parentId?: string;
  @ApiProperty({ required: false, enum: ['GLOBAL', 'INDIA', 'RUSSIA', 'INTERNATIONAL'] })
  @IsOptional() @IsIn(['GLOBAL', 'INDIA', 'RUSSIA', 'INTERNATIONAL']) countryScope?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateServiceNodeDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(2) @MaxLength(160) nameEn?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(160) nameRu?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2000) descriptionEn?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(80) icon?: string;
}

export class ReorderServiceNodesDto {
  @ApiProperty({ isArray: true, description: 'Sibling ids in their new order' })
  @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) order!: string[];
}

export class SetActiveDto {
  @ApiProperty() @IsBoolean() isActive!: boolean;
}

/* ── controllers ──────────────────────────────────────────────────── */

@ApiTags('services')
@Controller('services')
export class PublicServiceTaxonomyController {
  constructor(private taxonomy: ServiceTaxonomyService) {}

  @Get('taxonomy')
  tree(
    @Locale() locale: Lang,
    @Query('section') section?: string,
    @Query('country') country?: string,
    @Query('depth') depth?: string,
  ) {
    const parsed = Number(depth);
    return this.taxonomy.tree(locale, {
      section: section || undefined,
      country: country || undefined,
      depth: Number.isFinite(parsed) && parsed > 0 ? Math.min(4, Math.trunc(parsed)) : undefined,
    });
  }

  /** The countries a provider may declare — distinct from taxonomy country nodes. */
  @Get('countries')
  countries() {
    return this.taxonomy.countries();
  }

  /**
   * Declared AFTER `taxonomy`/`countries`: Nest matches in order, and a wildcard
   * slug route would otherwise swallow both.
   */
  @Get('nodes/:slug(*)')
  node(@Param('slug') slug: string, @Locale() locale: Lang) {
    return this.taxonomy.node(slug, locale);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('products_moderate')
@Controller('admin/service-taxonomy')
export class AdminServiceTaxonomyController {
  constructor(private taxonomy: ServiceTaxonomyService) {}

  /** Includes retired nodes — the admin has to see what it can bring back. */
  @Get()
  tree(@Locale() locale: Lang) {
    return this.taxonomy.tree(locale, { includeInactive: true });
  }

  @Post()
  create(@Body() dto: CreateServiceNodeDto) {
    return this.taxonomy.create(dto);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderServiceNodesDto) {
    return this.taxonomy.reorder(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceNodeDto) {
    return this.taxonomy.update(id, dto);
  }

  /** No DELETE by design — see `deactivate`. */
  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.taxonomy.deactivate(id, dto.isActive);
  }
}

@Module({
  controllers: [PublicServiceTaxonomyController, AdminServiceTaxonomyController],
  providers: [ServiceTaxonomyService],
  exports: [ServiceTaxonomyService],
})
export class ServiceTaxonomyModule {}
