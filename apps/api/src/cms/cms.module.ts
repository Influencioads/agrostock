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
import { AuditService } from '../common/audit.service';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { TextTranslationService } from '../translation/text-translation.service';

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

/**
 * Every copy field is nullable on purpose: sending `null` clears the override
 * and the app falls back to its own built-in string. `@IsOptional()` skips
 * validation for both `undefined` and `null`, so that clear path type-checks.
 */
export class UpdateHomeBannersDto {
  @IsOptional() @IsBoolean() promoEnabled?: boolean;
  @IsOptional() @IsString() promoTitle?: string | null;
  @IsOptional() @IsString() promoBody?: string | null;
  @IsOptional() @IsString() promoCta?: string | null;
  @IsOptional() @IsBoolean() heroEnabled?: boolean;
  @IsOptional() @IsString() heroTag?: string | null;
  @IsOptional() @IsString() heroTitle?: string | null;
  @IsOptional() @IsString() heroCta?: string | null;
}

const HOME_BANNERS_ID = 1;
/** Admin-typed English; translated on read like office names. */
const BANNER_COPY = ['promoTitle', 'promoBody', 'promoCta', 'heroTag', 'heroTitle', 'heroCta'] as const;

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService, private text: TextTranslationService) {}

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

  /**
   * The singleton is created on first read rather than seeded — prod deploys
   * never run seeds, so a missing row must not be an error.
   */
  private homeBannersRow() {
    return this.prisma.homeBanners.upsert({
      where: { id: HOME_BANNERS_ID },
      update: {},
      create: { id: HOME_BANNERS_ID },
    });
  }

  /** Public read — copy comes back in the caller's language. */
  async homeBanners(locale: Lang = FALLBACK_LNG) {
    const row = await this.homeBannersRow();
    const [localized] = await this.text.localizeRows([row], BANNER_COPY, locale);
    return localized;
  }

  /** Admin read — always the stored English, never a translation. */
  adminHomeBanners() {
    return this.homeBannersRow();
  }

  updateHomeBanners(dto: UpdateHomeBannersDto) {
    return this.prisma.homeBanners.upsert({
      where: { id: HOME_BANNERS_ID },
      update: dto,
      create: { id: HOME_BANNERS_ID, ...dto },
    });
  }
}

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private cms: CmsService) {}

  @Get() list(@Locale() locale: Lang) {
    return this.cms.listPublished(locale);
  }
  // Must stay above `:slug`, which would otherwise swallow it and 404.
  @Get('home-banners') banners(@Locale() locale: Lang) {
    return this.cms.homeBanners(locale);
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
  constructor(private cms: CmsService, private audit: AuditService) {}

  @Get() list() {
    return this.cms.listAll();
  }
  @Get('home-banners') banners() {
    return this.cms.adminHomeBanners();
  }
  // Above `:id` for the same reason as the public route.
  @Patch('home-banners') async updateBanners(@Body() dto: UpdateHomeBannersDto, @CurrentUser() admin: AuthUser) {
    const row = await this.cms.updateHomeBanners(dto);
    await this.audit.log({
      actorId: admin.id,
      action: 'homeBanners.update',
      entityType: 'HomeBanners',
      entityId: String(HOME_BANNERS_ID),
      meta: { fields: Object.keys(dto) },
    });
    return row;
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
