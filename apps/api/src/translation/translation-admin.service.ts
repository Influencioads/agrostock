import { Injectable, Logger } from '@nestjs/common';
import { LOCALES } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationSweepService } from './translation-sweep.service';
import { GoogleTranslateClient } from './google-translate.client';

/**
 * What the admin Translation page is backed by: the master switch, a coverage
 * report, and the on-demand full sweep.
 *
 * The report counts ROWS MISSING A TRANSLATION rather than crawling the rendered
 * site. Everything a visitor reads in the wrong language comes from one of these
 * tables — that is how the September gaps were found (434 service names, 135
 * transliterated trade codes, unlocalized market and city names) — and a count
 * is exact where a DOM scan has to guess whether "HACCP" is English or a code.
 */

/** Non-English locales; English is the base row, never a translation. */
const TARGETS = LOCALES.filter((l) => l !== 'en');

export interface CoverageRow {
  key: string;
  /** Rows that ought to carry a translation. */
  total: number;
  /** Of those, how many have one for every target locale. */
  translated: number;
  missing: number;
  percent: number;
}

export interface TranslationOverview {
  autoTranslateEnabled: boolean;
  /** False when no GOOGLE_TRANSLATE_API_KEY is configured — nothing can run. */
  providerConfigured: boolean;
  locales: string[];
  lastRunAt: Date | null;
  lastRunFilled: number | null;
  coverage: CoverageRow[];
  totalMissing: number;
}

@Injectable()
export class TranslationAdminService {
  private readonly logger = new Logger('TranslationAdmin');

  constructor(
    private readonly prisma: PrismaService,
    private readonly sweep: TranslationSweepService,
    private readonly google: GoogleTranslateClient,
  ) {}

  async settings() {
    return this.prisma.translationSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async setEnabled(autoTranslateEnabled: boolean) {
    await this.prisma.translationSettings.upsert({
      where: { id: 1 },
      update: { autoTranslateEnabled },
      create: { id: 1, autoTranslateEnabled },
    });
    return this.overview();
  }

  /**
   * One row per translatable source: how many rows exist, and how many carry a
   * translation into a target locale.
   *
   * ponytail: `some` means "at least one target locale", which is EXACT while
   * there is exactly one (ru). Add a second target and this over-reports — swap
   * it for a per-locale count then, and not before.
   */
  private async coverage(): Promise<CoverageRow[]> {
    const rows: CoverageRow[] = [];

    const add = (key: string, total: number, translated: number) => {
      const missing = Math.max(0, total - translated);
      rows.push({
        key,
        total,
        translated,
        missing,
        percent: total === 0 ? 100 : Math.round((translated / total) * 100),
      });
    };

    // Each entry: label, how many rows exist, how many are fully translated.
    // `some`-with-count is not expressible in one Prisma query, so each source
    // is a pair of cheap indexed counts rather than a row scan.
    const sources: { key: string; total: () => Promise<number>; done: () => Promise<number> }[] = [
      {
        key: 'products',
        total: () => this.prisma.product.count({ where: { status: 'live' } }),
        done: () => this.prisma.product.count({ where: { status: 'live', translations: { some: { locale: { in: [...TARGETS] } } } } }),
      },
      {
        key: 'categories',
        total: () => this.prisma.category.count(),
        done: () => this.prisma.category.count({ where: { translations: { some: { locale: { in: [...TARGETS] } } } } }),
      },
      {
        key: 'subcategories',
        total: () => this.prisma.subcategory.count(),
        done: () => this.prisma.subcategory.count({ where: { translations: { some: { locale: { in: [...TARGETS] } } } } }),
      },
      {
        key: 'markets',
        total: () => this.prisma.market.count({ where: { active: true } }),
        done: () => this.prisma.market.count({ where: { active: true, translations: { some: { locale: { in: [...TARGETS] } } } } }),
      },
      {
        key: 'serviceNodes',
        total: () => this.prisma.serviceNode.count({ where: { isActive: true } }),
        done: () => this.prisma.serviceNode.count({ where: { isActive: true, translations: { some: { locale: { in: [...TARGETS] } } } } }),
      },
      {
        key: 'workerTypes',
        total: () => this.prisma.workerType.count({ where: { isActive: true } }),
        done: () => this.prisma.workerType.count({ where: { isActive: true, translations: { some: { locale: { in: [...TARGETS] } } } } }),
      },
      {
        key: 'cmsPages',
        total: () => this.prisma.cmsPage.count(),
        done: () => this.prisma.cmsPage.count({ where: { translations: { some: { locale: { in: [...TARGETS] } } } } }),
      },
    ];

    for (const s of sources) {
      try {
        const [total, done] = await Promise.all([s.total(), s.done()]);
        add(s.key, total, done);
      } catch (e) {
        this.logger.warn(`coverage for ${s.key} failed: ${(e as Error).message}`);
      }
    }
    return rows;
  }

  async overview(): Promise<TranslationOverview> {
    const [settings, coverage] = await Promise.all([this.settings(), this.coverage()]);
    return {
      autoTranslateEnabled: settings.autoTranslateEnabled,
      providerConfigured: this.google.enabled,
      locales: [...TARGETS],
      lastRunAt: settings.lastRunAt,
      lastRunFilled: settings.lastRunFilled,
      coverage,
      totalMissing: coverage.reduce((n, r) => n + r.missing, 0),
    };
  }

  /**
   * Translate everything outstanding, now.
   *
   * `sweep(undefined)` lifts the per-model cap the hourly run uses to stay inside
   * the API budget — deliberate here, because an admin pressing the button has
   * asked for exactly that. Runs even when the master switch is off: the switch
   * governs the unattended cron, not a human decision made on this page.
   */
  async runNow(): Promise<TranslationOverview> {
    if (!this.google.enabled) {
      throw new Error('No translation provider configured (GOOGLE_TRANSLATE_API_KEY).');
    }
    const filled = await this.sweep.sweep(undefined);
    await this.prisma.translationSettings.upsert({
      where: { id: 1 },
      update: { lastRunAt: new Date(), lastRunFilled: filled },
      create: { id: 1, lastRunAt: new Date(), lastRunFilled: filled },
    });
    this.logger.log(`Admin-triggered sweep filled ${filled} rows.`);
    return this.overview();
  }
}
