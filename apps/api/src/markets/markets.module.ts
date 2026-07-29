import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { Locale, localize } from '../common/locale';

const MARKET_COUNT = { _count: { select: { products: true, profiles: true } } } as const;

/**
 * Alphabetical by the name the READER sees. Postgres orders by the base
 * (English) name, which leaves a Russian or Chinese list in apparently random
 * order — and a 3.5k-entry picker you cannot scan, or type-ahead your way
 * through, is not a picker.
 */
function byLocalizedName<T extends { name: string }>(rows: T[], locale: Lang): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, locale));
}

@Injectable()
export class MarketsService {
  constructor(private prisma: PrismaService) {}

  /**
   * The only market list there is. Markets are created by admins (see
   * `AdminService.createMarket`), so everyone — signed in or not — sees the
   * same approved set.
   */
  async list(locale: Lang = 'en') {
    const rows = await this.prisma.market.findMany({
      where: { active: true, status: 'approved' },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      include: { ...MARKET_COUNT, translations: { where: { locale } } },
    });
    return byLocalizedName(rows.map((m) => localize(m, ['name'])), locale);
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
}

@Module({ controllers: [MarketsController], providers: [MarketsService], exports: [MarketsService] })
export class MarketsModule {}
