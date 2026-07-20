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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
}

export class UpdateSubcategoryDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsInt() sort?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * `locale` selects the translated label. English rows have no translation
   * record, so the canonical base row shows through unchanged.
   */
  async findAll(locale: Lang = FALLBACK_LNG) {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      include: {
        translations: { where: { locale } },
        subcategories: {
          orderBy: [{ sort: 'asc' }, { name: 'asc' }],
          include: { translations: { where: { locale } }, _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
    });

    return rows.map((category) => ({
      ...localize(category, ['name']),
      subcategories: category.subcategories.map((sub) => localize(sub, ['name'])),
    }));
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
    return this.prisma.category.create({
      data: { name: dto.name, slug, emoji: dto.emoji, tint: dto.tint, sort: dto.sort ?? 0 },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategory(id);
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
        ...(dto.tint !== undefined ? { tint: dto.tint } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
      },
    });
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
    return { ok: true };
  }

  async createSubcategory(categoryId: string, dto: SubcategoryDto) {
    const cat = await this.getCategory(categoryId);
    const slug = await this.uniqueSlug(`${cat.slug}-${slugify(dto.name)}`);
    return this.prisma.subcategory.create({
      data: { name: dto.name, slug, emoji: dto.emoji, sort: dto.sort ?? 0, categoryId },
    });
  }

  async updateSubcategory(id: string, dto: UpdateSubcategoryDto) {
    const sub = await this.prisma.subcategory.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subcategory not found');
    return this.prisma.subcategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
      },
    });
  }

  async removeSubcategory(id: string) {
    const sub = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!sub) throw new NotFoundException('Subcategory not found');
    if (sub._count.products > 0)
      throw new BadRequestException('Cannot delete a subcategory that still has products. Reassign them first.');
    await this.prisma.subcategory.delete({ where: { id } });
    return { ok: true };
  }

  private async getCategory(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }
}

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}
  @Get()
  findAll(@Locale() locale: Lang) {
    return this.categories.findAll(locale);
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
  async update(id: string, dto: Partial<OfficeDto>, adminId: string) {
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
  update(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: Partial<OfficeDto>) {
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
