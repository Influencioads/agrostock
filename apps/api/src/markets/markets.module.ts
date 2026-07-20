import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { Locale, localize } from '../common/locale';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

/** Same derivation as `AdminService.createMarket`, so slugs stay consistent. */
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const MARKET_COUNT = { _count: { select: { products: true, profiles: true } } } as const;

export class CreateMarketDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsString() @MinLength(2) @MaxLength(80) country!: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;
  @IsOptional() @IsString() @MaxLength(8) flag?: string;
}

@Injectable()
export class MarketsService {
  constructor(private prisma: PrismaService) {}

  /** Public list — approved markets only, so pending proposals never leak. */
  async list(locale: Lang = 'en') {
    const rows = await this.prisma.market.findMany({
      where: { active: true, status: 'approved' },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      include: { ...MARKET_COUNT, translations: { where: { locale } } },
    });
    return rows.map((m) => localize(m, ['name']));
  }

  /**
   * What a signed-in seller may attach to a product: every approved market,
   * plus the pending ones they proposed themselves. This is what the product
   * forms bind to, so a seller can use a market the moment they create it.
   */
  async listForUser(userId: string, locale: Lang = 'en') {
    const rows = await this.prisma.market.findMany({
      where: {
        active: true,
        OR: [{ status: 'approved' }, { status: 'pending', createdById: userId }],
      },
      orderBy: [{ status: 'asc' }, { sort: 'asc' }, { name: 'asc' }],
      include: { ...MARKET_COUNT, translations: { where: { locale } } },
    });
    return rows.map((m) => localize(m, ['name']));
  }

  /**
   * A seller proposes a market. It lands `pending` and is visible only to its
   * creator until an admin approves it.
   */
  async create(userId: string, dto: CreateMarketDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.market.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(
        existing.status === 'approved'
          ? `“${existing.name}” already exists — pick it from the list.`
          : `“${existing.name}” has already been proposed and is awaiting approval.`,
      );
    }
    return this.prisma.market.create({
      data: {
        slug,
        name: dto.name,
        country: dto.country,
        city: dto.city,
        region: dto.region,
        flag: dto.flag,
        status: 'pending',
        active: true,
        createdById: userId,
      },
      include: MARKET_COUNT,
    });
  }
}

@ApiTags('markets')
@Controller('markets')
export class MarketsController {
  constructor(private markets: MarketsService) {}

  @Get()
  list(@Locale() locale: Lang) {
    return this.markets.list(locale);
  }

  // Static segment must precede any future `:slug` route.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.markets.listForUser(u.id, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateMarketDto) {
    return this.markets.create(u.id, dto);
  }
}

@Module({ controllers: [MarketsController], providers: [MarketsService], exports: [MarketsService] })
export class MarketsModule {}
