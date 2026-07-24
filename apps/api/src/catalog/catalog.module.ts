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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { FALLBACK_LNG, type Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { Locale, localize } from '../common/locale';
import { TextTranslationService } from '../translation/text-translation.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit.service';

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export class CategoryDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() tint?: string;
  @IsOptional() @IsInt() sort?: number;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() tint?: string;
  @IsOptional() @IsInt() sort?: number;
}

export class SubcategoryDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsInt() sort?: number;
  @IsOptional() @IsString() parentId?: string;
}

export class UpdateSubcategoryDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsInt() sort?: number;
  /** Move the node (with its whole subtree) under another parent; `null` promotes it to level 2. */
  @IsOptional() @IsString() parentId?: string | null;
}

/**
 * Hard ceiling on nesting depth. Level 1 is the Category, so this allows five
 * levels of subcategory — deeper than any real taxonomy needs, while still
 * guaranteeing the tree stays renderable and every recursive walk terminates.
 */
export const MAX_TAXONOMY_DEPTH = 6;

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Reference data changes only when an admin edits it, but every storefront
   * page asks for it — so the localized result is memoised per (locale, depth)
   * and cleared by `invalidate()` on any write.
   */
  private cache = new Map<string, unknown>();
  private invalidate() {
    this.cache.clear();
  }

  private subInclude(locale: Lang) {
    return {
      orderBy: [{ sort: 'asc' as const }, { name: 'asc' as const }],
      include: {
        translations: { where: { locale } },
        _count: { select: { products: true, children: true } },
      },
    };
  }

  /**
   * Load subcategories one level at a time. The taxonomy is thousands of nodes
   * deep-and-wide, so shipping the whole tree on every page load is what we are
   * avoiding here: `depth` bounds how far down we go, and clients pull the rest
   * lazily through `subtree()` as the user drills in.
   */
  private async loadLevels(categoryIds: string[], depth: number | 'all', locale: Lang) {
    const include = this.subInclude(locale);
    if (depth === 'all') {
      return this.prisma.subcategory.findMany({ where: { categoryId: { in: categoryIds } }, ...include });
    }
    const rows: Awaited<ReturnType<typeof this.prisma.subcategory.findMany>> = [];
    let parentIds: string[] = [];
    for (let level = 0; level < depth; level++) {
      const batch = await this.prisma.subcategory.findMany({
        where: level === 0 ? { categoryId: { in: categoryIds }, parentId: null } : { parentId: { in: parentIds } },
        ...include,
      });
      if (!batch.length) break;
      rows.push(...batch);
      parentIds = batch.map((r) => r.id);
    }
    return rows;
  }

  /**
   * `locale` selects the translated label. English rows have no translation
   * record, so the canonical base row shows through unchanged.
   *
   * `subcategories` stays a FLAT array — clients rebuild the tree from `parentId`
   * (see the shared `buildSubcategoryTree`), which is the long-standing contract.
   */
  async findAll(locale: Lang = FALLBACK_LNG, depth: number | 'all' = 1) {
    const key = `${locale}|${depth}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const categories = await this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      include: { translations: { where: { locale } }, _count: { select: { products: true } } },
    });
    const subs = await this.loadLevels(
      categories.map((c) => c.id),
      depth,
      locale,
    );

    const byCategory = new Map<string, unknown[]>();
    for (const sub of subs) {
      const list = byCategory.get(sub.categoryId) ?? [];
      list.push(localize(sub, ['name']));
      byCategory.set(sub.categoryId, list);
    }

    const result = categories.map((category) => ({
      ...localize(category, ['name']),
      subcategories: byCategory.get(category.id) ?? [],
    }));
    this.cache.set(key, result);
    return result;
  }

  /**
   * The lazy-expansion counterpart to `findAll`: subcategories belonging to one
   * category, optionally rooted at `parentId` rather than the category itself.
   *
   * `depth=all` under a category id is how the market page pulls one category's
   * whole tree for its type-ahead — expensive across all 24 categories at once,
   * cheap for the single one the buyer is actually browsing.
   */
  async subtree(categoryId: string, locale: Lang = FALLBACK_LNG, depth: number | 'all' = 1, parentId?: string) {
    await this.getCategory(categoryId);

    const include = this.subInclude(locale);
    if (depth === 'all' && !parentId) {
      const rows = await this.prisma.subcategory.findMany({ where: { categoryId }, ...include });
      return rows.map((sub) => localize(sub, ['name']));
    }

    if (parentId) {
      const parent = await this.prisma.subcategory.findUnique({
        where: { id: parentId },
        select: { categoryId: true },
      });
      if (!parent) throw new NotFoundException('Subcategory not found');
      if (parent.categoryId !== categoryId) {
        throw new BadRequestException('That subcategory belongs to a different category.');
      }
    }

    // Level-by-level rather than one query per node.
    const rows: Awaited<ReturnType<typeof this.prisma.subcategory.findMany>> = [];
    const limit = depth === 'all' ? MAX_TAXONOMY_DEPTH : depth;
    let cursor: string[] = parentId ? [parentId] : [];
    for (let level = 0; level < limit; level++) {
      const batch = await this.prisma.subcategory.findMany({
        where: !parentId && level === 0 ? { categoryId, parentId: null } : { parentId: { in: cursor } },
        ...include,
      });
      if (!batch.length) break;
      rows.push(...batch);
      cursor = batch.map((r) => r.id);
    }
    return rows.map((sub) => localize(sub, ['name']));
  }

  /** Depth of a node, counting the Category as level 1. */
  private async depthOf(subcategoryId: string) {
    let depth = 2;
    let cursor = await this.prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      select: { parentId: true },
    });
    while (cursor?.parentId) {
      depth++;
      if (depth > MAX_TAXONOMY_DEPTH + 1) break; // corrupt data guard
      cursor = await this.prisma.subcategory.findUnique({
        where: { id: cursor.parentId },
        select: { parentId: true },
      });
    }
    return depth;
  }

  /** Deepest level reachable below `subcategoryId`, counting the Category as level 1. */
  private async subtreeHeight(subcategoryId: string) {
    let height = 0;
    let cursor = [subcategoryId];
    while (cursor.length && height < MAX_TAXONOMY_DEPTH) {
      const children = await this.prisma.subcategory.findMany({
        where: { parentId: { in: cursor } },
        select: { id: true },
      });
      if (!children.length) break;
      height++;
      cursor = children.map((c) => c.id);
    }
    return height;
  }

  /** Ensure a slug is unique by appending a short suffix if needed. */
  private async uniqueSlug(base: string) {
    let candidate = base || 'item';
    for (let i = 0; i < 20; i++) {
      const clash =
        (await this.prisma.category.findUnique({ where: { slug: candidate } })) ||
        (await this.prisma.subcategory.findUnique({ where: { slug: candidate } }));
      if (!clash) return candidate;
      candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async createCategory(dto: CategoryDto) {
    const slug = await this.uniqueSlug(slugify(dto.name));
    const created = await this.prisma.category.create({
      data: { name: dto.name, slug, emoji: dto.emoji, tint: dto.tint, sort: dto.sort ?? 0 },
    });
    this.invalidate();
    return created;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategory(id);
    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
        ...(dto.tint !== undefined ? { tint: dto.tint } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
      },
    });
    this.invalidate();
    return updated;
  }

  async removeCategory(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat._count.products > 0)
      throw new BadRequestException('Cannot delete a category that still has products. Reassign them first.');
    await this.prisma.category.delete({ where: { id } }); // cascades to subcategories
    this.invalidate();
    return { ok: true };
  }

  async createSubcategory(categoryId: string, dto: SubcategoryDto) {
    const cat = await this.getCategory(categoryId);
    const parent = dto.parentId
      ? await this.prisma.subcategory.findUnique({ where: { id: dto.parentId }, select: { id: true, categoryId: true, slug: true } })
      : null;
    if (dto.parentId && !parent) throw new NotFoundException('Parent subcategory not found');
    if (parent && parent.categoryId !== categoryId) {
      throw new BadRequestException('Parent subcategory must belong to the same category.');
    }
    if (parent && (await this.depthOf(parent.id)) >= MAX_TAXONOMY_DEPTH) {
      throw new BadRequestException(`Categories can only nest ${MAX_TAXONOMY_DEPTH} levels deep.`);
    }
    const duplicate = await this.prisma.subcategory.findFirst({
      where: { categoryId, parentId: dto.parentId ?? null, name: dto.name },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException('A subcategory with this name already exists at this level.');
    }
    const slug = await this.uniqueSlug(`${parent?.slug ?? cat.slug}-${slugify(dto.name)}`);
    const created = await this.prisma.subcategory.create({
      data: { name: dto.name, slug, emoji: dto.emoji, sort: dto.sort ?? 0, categoryId, parentId: dto.parentId },
    });
    this.invalidate();
    return created;
  }

  /** True when `candidateParentId` is `id` itself or sits inside its subtree. */
  private async wouldCycle(id: string, candidateParentId: string) {
    if (id === candidateParentId) return true;
    let cursor: string | null = candidateParentId;
    for (let hops = 0; cursor && hops <= MAX_TAXONOMY_DEPTH + 1; hops++) {
      // `at` breaks the self-referential inference on `cursor`.
      const at: string = cursor;
      const row: { parentId: string | null } | null = await this.prisma.subcategory.findUnique({
        where: { id: at },
        select: { parentId: true },
      });
      cursor = row?.parentId ?? null;
      if (cursor === id) return true;
    }
    return false;
  }

  async updateSubcategory(id: string, dto: UpdateSubcategoryDto) {
    const sub = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subcategory not found');

    // Reparenting moves the node AND everything under it, so validate against the
    // whole subtree: no cycles, no crossing categories, and the deepest descendant
    // must still fit under the depth cap at its new home.
    const moving = dto.parentId !== undefined && (dto.parentId ?? null) !== sub.parentId;
    if (moving) {
      if (dto.parentId) {
        const parent = await this.prisma.subcategory.findUnique({
          where: { id: dto.parentId },
          select: { id: true, categoryId: true },
        });
        if (!parent) throw new NotFoundException('Parent subcategory not found');
        if (parent.categoryId !== sub.categoryId) {
          throw new BadRequestException('A subcategory can only move within its own category.');
        }
        if (await this.wouldCycle(id, parent.id)) {
          throw new BadRequestException('A subcategory cannot be moved inside itself.');
        }
        if ((await this.depthOf(parent.id)) + 1 + (await this.subtreeHeight(id)) > MAX_TAXONOMY_DEPTH) {
          throw new BadRequestException(
            `That move would nest deeper than ${MAX_TAXONOMY_DEPTH} levels. Move or flatten its children first.`,
          );
        }
      }
      const clash = await this.prisma.subcategory.findFirst({
        where: {
          categoryId: sub.categoryId,
          parentId: dto.parentId ?? null,
          name: dto.name ?? sub.name,
          id: { not: id },
        },
        select: { id: true },
      });
      if (clash) throw new BadRequestException('A subcategory with this name already exists at the destination.');
    }

    const updated = await this.prisma.subcategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
        ...(moving ? { parentId: dto.parentId ?? null } : {}),
      },
    });
    this.invalidate();
    return updated;
  }

  async removeSubcategory(id: string) {
    const sub = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!sub) throw new NotFoundException('Subcategory not found');
    if (sub._count.products > 0)
      throw new BadRequestException('Cannot delete a subcategory that still has products. Reassign them first.');
    if (sub._count.children > 0)
      throw new BadRequestException('Cannot delete a subcategory that still has child subcategories. Delete children first.');
    await this.prisma.subcategory.delete({ where: { id } });
    this.invalidate();
    return { ok: true };
  }

  private async getCategory(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }
}

/**
 * `?depth=` bounds how much of the tree comes back: a number of subcategory
 * levels, or `all`. It defaults to 1 (categories + their direct children), which
 * is all most screens render before the user drills in — the rest is pulled
 * lazily from `/categories/:id/subtree`.
 */
const parseDepth = (raw?: string): number | 'all' => {
  if (!raw) return 1;
  if (raw === 'all') return 'all';
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new BadRequestException('depth must be a positive integer or "all"');
  return Math.min(n, MAX_TAXONOMY_DEPTH);
};

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}
  @Get()
  findAll(@Locale() locale: Lang, @Query('depth') depth?: string) {
    return this.categories.findAll(locale, parseDepth(depth));
  }

  /** Subcategories of one category, optionally rooted at `parentId`, for lazy drill-down. */
  @Get(':id/subtree')
  subtree(
    @Param('id') id: string,
    @Locale() locale: Lang,
    @Query('depth') depth?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.categories.subtree(id, locale, parseDepth(depth), parentId);
  }
}

@ApiBearerAuth()
@ApiTags('admin-categories')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('products_moderate')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private categories: CategoriesService) {}

  @Post()
  create(@Body() dto: CategoryDto) {
    return this.categories.createCategory(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.updateCategory(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.removeCategory(id);
  }

  @Post(':id/subcategories')
  createSub(@Param('id') id: string, @Body() dto: SubcategoryDto) {
    return this.categories.createSubcategory(id, dto);
  }
}

@ApiBearerAuth()
@ApiTags('admin-categories')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('products_moderate')
@Controller('admin/subcategories')
export class AdminSubcategoriesController {
  constructor(private categories: CategoriesService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubcategoryDto) {
    return this.categories.updateSubcategory(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.removeSubcategory(id);
  }
}

export class OfficeDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() flag!: string;
  @IsString() type!: string;
  @IsString() city!: string;
  @IsString() mgr!: string;
  @IsOptional() @IsString() tz?: string;
  @IsOptional() @IsString() langs?: string;
  @IsOptional() @IsInt() staff?: number;
}

/** API-08: validated partial — `Partial<OfficeDto>` erased at runtime and bypassed the pipe. */
export class UpdateOfficeDto extends PartialType(OfficeDto) {}

@Injectable()
export class OfficesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private text: TextTranslationService,
  ) {}
  async findAll(locale: Lang = FALLBACK_LNG) {
    const rows = await this.prisma.office.findMany();
    // Translate each office's free-text label/type on read; city, manager name,
    // timezone, languages, flag and counts are left canonical.
    return this.text.localizeRows(rows, ['name', 'type'], locale);
  }
  async create(dto: OfficeDto, adminId: string) {
    const office = await this.prisma.office.create({ data: { ...dto, staff: dto.staff ?? 0 } });
    await this.audit.log({ actorId: adminId, action: 'office.create', entityType: 'Office', entityId: office.id });
    return office;
  }
  async update(id: string, dto: UpdateOfficeDto, adminId: string) {
    const existing = await this.prisma.office.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Office not found');
    const office = await this.prisma.office.update({ where: { id }, data: dto });
    await this.audit.log({ actorId: adminId, action: 'office.update', entityType: 'Office', entityId: id });
    return office;
  }
  async remove(id: string, adminId: string) {
    const existing = await this.prisma.office.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Office not found');
    await this.prisma.office.delete({ where: { id } });
    await this.audit.log({ actorId: adminId, action: 'office.delete', entityType: 'Office', entityId: id });
    return { ok: true };
  }
}

@ApiTags('offices')
@Controller('offices')
export class OfficesController {
  constructor(private offices: OfficesService) {}
  @Get()
  findAll(@Locale() locale: Lang) {
    return this.offices.findAll(locale);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('offices_manage')
@Controller('admin/offices')
export class AdminOfficesController {
  constructor(private offices: OfficesService) {}
  @Post()
  create(@CurrentUser() admin: AuthUser, @Body() dto: OfficeDto) {
    return this.offices.create(dto, admin.id);
  }
  @Patch(':id')
  update(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: UpdateOfficeDto) {
    return this.offices.update(id, dto, admin.id);
  }
  @Delete(':id')
  remove(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.offices.remove(id, admin.id);
  }
}

@Module({
  controllers: [
    CategoriesController,
    AdminCategoriesController,
    AdminSubcategoriesController,
    OfficesController,
    AdminOfficesController,
  ],
  providers: [CategoriesService, OfficesService],
})
export class CatalogModule {}
