import {
  Body,
  Controller,
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
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { FALLBACK_LNG, type Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { Locale, localize } from '../common/locale';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export class CreateCmsPageDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateCmsPageDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  async listPublished(locale: Lang = FALLBACK_LNG) {
    const pages = await this.prisma.cmsPage.findMany({
      where: { published: true },
      orderBy: { title: 'asc' },
      include: { translations: { where: { locale } } },
    });
    return pages.map((page) => localize(page, ['title', 'body']));
  }
  async getPublished(slug: string, locale: Lang = FALLBACK_LNG) {
    const page = await this.prisma.cmsPage.findFirst({
      where: { slug, published: true },
      include: { translations: { where: { locale } } },
    });
    if (!page) throw new NotFoundException('Page not found');
    return localize(page, ['title', 'body']);
  }

  listAll() {
    return this.prisma.cmsPage.findMany({ orderBy: { title: 'asc' } });
  }
  create(dto: CreateCmsPageDto) {
    return this.prisma.cmsPage.create({
      data: {
        slug: dto.slug ? slugify(dto.slug) : slugify(dto.title),
        title: dto.title,
        body: dto.body,
        published: dto.published ?? false,
      },
    });
  }
  async update(id: string, dto: UpdateCmsPageDto) {
    const existing = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Page not found');
    return this.prisma.cmsPage.update({ where: { id }, data: dto });
  }
}

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private cms: CmsService) {}

  @Get() list(@Locale() locale: Lang) {
    return this.cms.listPublished(locale);
  }
  @Get(':slug') get(@Param('slug') slug: string, @Locale() locale: Lang) {
    return this.cms.getPublished(slug, locale);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('cms_manage')
@Controller('admin/cms')
export class AdminCmsController {
  constructor(private cms: CmsService) {}

  @Get() list() {
    return this.cms.listAll();
  }
  @Post() create(@Body() dto: CreateCmsPageDto) {
    return this.cms.create(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCmsPageDto) {
    return this.cms.update(id, dto);
  }
}

@Module({
  controllers: [CmsController, AdminCmsController],
  providers: [CmsService],
})
export class CmsModule {}
