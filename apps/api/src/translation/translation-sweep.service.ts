import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import type { AttrField } from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from './translation.service';
import { ContentTranslationWorker } from './content-translation.worker';

/**
 * Hourly catch-all translation sweep.
 *
 * Translate-on-write ({@link ContentTranslationWorker}) covers content the
 * moment it is saved, but it only fires on an event — anything created while the
 * API was down, while Google was erroring, or before a locale existed stays
 * English forever. And reference data (categories, markets, CMS pages) has no
 * upsert event at all. This sweep is the backstop: once an hour it finds every
 * row still missing a translation in any supported language and fills it.
 *
 * Everything here is idempotent and gap-filling — a row that already has all its
 * locales costs one indexed query and no API call, so a quiet hour is nearly
 * free. Content rows are handed back to the worker rather than re-implementing
 * per-model field logic here.
 *
 * Country names are deliberately absent: they are not stored text, they come
 * from `Intl.DisplayNames` at render time (see `packages/geo`).
 */
/** `SubcategoryTranslation.attrFields`: display text keyed by the English string. */
interface AttrDict {
  label?: Record<string, string>;
  option?: Record<string, string>;
}

@Injectable()
export class TranslationSweepService {
  private readonly logger = new Logger('TranslationSweep');
  private running = false;

  /**
   * Rows per model per run. A sweep that found 14k untranslated rows would
   * otherwise spend the whole Google budget in one hour; capped, a large
   * backlog drains over several hours instead. What got left is logged, never
   * silently dropped.
   */
  private static readonly MAX_PER_MODEL = 500;

  constructor(
    private prisma: PrismaService,
    private translation: TranslationService,
    private worker: ContentTranslationWorker,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'translation-sweep' })
  async hourly() {
    if (!this.translation.enabled) return;
    // Overlap guard: a big backlog can take longer than the interval, and two
    // sweeps translating the same rows would double the bill for nothing.
    if (this.running) {
      this.logger.warn('previous sweep still running — skipping this hour');
      return;
    }
    this.running = true;
    try {
      const filled = await this.sweep();
      if (filled) this.logger.log(`sweep filled ${filled} translation gap(s)`);
    } catch (e) {
      this.logger.error(`sweep failed: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Reference data + user content. Returns how many rows were (re)translated. */
  async sweep(limit: number | undefined = TranslationSweepService.MAX_PER_MODEL): Promise<number> {
    return (await this.sweepReferenceData(limit)) + (await this.sweepContent(limit));
  }

  /** Rows missing at least one target locale. */
  private missingAnyLocale() {
    return { OR: this.translation.targets.map((locale) => ({ translations: { none: { locale } } })) };
  }

  /** `limit` undefined means unbounded — the CLI backfill drains everything. */
  private capped(model: string, found: number, limit: number | undefined) {
    if (limit && found >= limit) this.logger.log(`${model}: capped at ${limit} this run, more remain`);
  }

  /**
   * Categories, subcategories, markets and CMS pages — admin-managed rows with
   * no upsert event. Names are English on the base row, so the source language
   * is stated rather than detected (auto-detect 400s a whole batch the moment it
   * decides an English name is already Italian).
   */
  async sweepReferenceData(limit: number | undefined = TranslationSweepService.MAX_PER_MODEL): Promise<number> {
    let filled = 0;

    for (const locale of this.translation.targets) {
      const categories = await this.prisma.category.findMany({
        where: { translations: { none: { locale } } },
        select: { id: true, name: true },
        take: limit,
      });
      if (categories.length) {
        const names = await this.translation.translateFrom(categories.map((c) => c.name), locale, 'en');
        for (const [i, row] of categories.entries()) {
          await this.prisma.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: row.id, locale } },
            create: { categoryId: row.id, locale, name: names[i] || row.name },
            update: { name: names[i] || row.name },
          });
        }
        filled += categories.length;
        this.capped(`category/${locale}`, categories.length, limit);
      }

      const subcategories = await this.prisma.subcategory.findMany({
        where: { translations: { none: { locale } } },
        select: { id: true, name: true },
        take: limit,
      });
      if (subcategories.length) {
        const names = await this.translation.translateFrom(subcategories.map((s) => s.name), locale, 'en');
        for (const [i, row] of subcategories.entries()) {
          await this.prisma.subcategoryTranslation.upsert({
            where: { subcategoryId_locale: { subcategoryId: row.id, locale } },
            create: { subcategoryId: row.id, locale, name: names[i] || row.name },
            update: { name: names[i] || row.name },
          });
        }
        filled += subcategories.length;
        this.capped(`subcategory/${locale}`, subcategories.length, limit);
      }

      const markets = await this.prisma.market.findMany({
        where: { translations: { none: { locale } } },
        select: { id: true, name: true, city: true, region: true },
        take: limit,
      });
      if (markets.length) {
        const names = await this.translation.translateFrom(markets.map((m) => m.name), locale, 'en');
        for (const [i, row] of markets.entries()) {
          await this.prisma.marketTranslation.upsert({
            where: { marketId_locale: { marketId: row.id, locale } },
            create: { marketId: row.id, locale, name: names[i] || row.name, city: row.city, region: row.region },
            update: { name: names[i] || row.name },
          });
        }
        filled += markets.length;
        this.capped(`market/${locale}`, markets.length, limit);
      }

      // CMS pages are the website copy and blog posts — title and body both.
      const pages = await this.prisma.cmsPage.findMany({
        where: { translations: { none: { locale } } },
        select: { id: true, title: true, body: true },
        take: limit,
      });
      if (pages.length) {
        const titles = await this.translation.translateFrom(pages.map((p) => p.title), locale, 'en');
        const bodies = await this.translation.translateFrom(pages.map((p) => p.body ?? ''), locale, 'en');
        for (const [i, row] of pages.entries()) {
          const title = titles[i] || row.title;
          const body = row.body ? bodies[i] || row.body : null;
          await this.prisma.cmsPageTranslation.upsert({
            where: { cmsPageId_locale: { cmsPageId: row.id, locale } },
            create: { cmsPageId: row.id, locale, title, body },
            update: { title, body },
          });
        }
        filled += pages.length;
        this.capped(`cmsPage/${locale}`, pages.length, limit);
      }
    }

    return filled + (await this.sweepAttributeFields(limit));
  }

  /**
   * Labels and options an admin typed into a subcategory's attribute fields.
   *
   * Unlike everything above this cannot key off `translations: { none: locale }`
   * — the translation row already exists (it holds the subcategory's name), and
   * what is missing is one STRING inside its dict. So it diffs the field
   * definitions against the stored dict and translates only the gaps. After the
   * initial seed that is zero strings, so a quiet hour costs one query per
   * locale and no API call.
   */
  private async sweepAttributeFields(limit: number | undefined): Promise<number> {
    const rows = await this.prisma.subcategory.findMany({
      where: { NOT: { attrFields: { equals: Prisma.DbNull } } },
      select: { id: true, attrFields: true, translations: { select: { id: true, locale: true, attrFields: true } } },
    });
    let filled = 0;

    for (const locale of this.translation.targets) {
      const jobs: { id: string; dict: AttrDict; missing: string[]; kinds: ('label' | 'option')[] }[] = [];
      for (const row of rows) {
        const tr = row.translations.find((t) => t.locale === locale);
        if (!tr) continue; // no row yet — the subcategory sweep above creates it first
        const dict = (tr.attrFields as AttrDict | null) ?? {};
        const missing: string[] = [];
        const kinds: ('label' | 'option')[] = [];
        for (const f of (row.attrFields as unknown as AttrField[]) ?? []) {
          if (!dict.label?.[f.label] && !missing.includes(f.label)) {
            missing.push(f.label);
            kinds.push('label');
          }
          for (const o of f.options ?? []) {
            if (!dict.option?.[o] && !missing.includes(o)) {
              missing.push(o);
              kinds.push('option');
            }
          }
        }
        if (missing.length) jobs.push({ id: tr.id, dict, missing, kinds });
        if (limit && jobs.length >= limit) break;
      }
      if (!jobs.length) continue;

      for (const job of jobs) {
        // Source stated, never detected: auto-detect 400s a whole batch the
        // moment it decides an English label is already Italian.
        const out = await this.translation.translateFrom(job.missing, locale, 'en');
        const label = { ...job.dict.label };
        const option = { ...job.dict.option };
        job.missing.forEach((src, i) => {
          // Store the identity mapping when Google returns nothing or the same
          // text — an unstored string reads as "missing" again next hour and
          // would be re-sent to Google forever ("20/22", "IQF", …).
          const text = out[i] || src;
          if (job.kinds[i] === 'label') label[src] = text;
          else option[src] = text;
        });
        await this.prisma.subcategoryTranslation.update({
          where: { id: job.id },
          data: { attrFields: { label, option } as Prisma.InputJsonValue },
        });
      }
      filled += jobs.length;
      this.capped(`attrFields/${locale}`, jobs.length, limit);
    }
    return filled;
  }

  /**
   * User content that missed its translate-on-write event. The worker owns the
   * per-model field lists and hashing, so this only decides WHICH rows to hand
   * it — never how to translate them.
   */
  async sweepContent(limit: number | undefined = TranslationSweepService.MAX_PER_MODEL): Promise<number> {
    const where = this.missingAnyLocale();
    const pick = { where, select: { id: true }, take: limit } as const;

    const [products, reviews, groups, posts, requirements, buyerBids] = await Promise.all([
      this.prisma.product.findMany(pick),
      this.prisma.review.findMany(pick),
      this.prisma.communityGroup.findMany(pick),
      this.prisma.communityPost.findMany(pick),
      this.prisma.communityTradeRequirement.findMany(pick),
      this.prisma.buyerBid.findMany(pick),
    ]);

    const jobs: [string, { id: string }[], (e: { id: string }) => Promise<unknown>][] = [
      ['product', products, (e) => this.worker.onProduct(e)],
      ['review', reviews, (e) => this.worker.onReview(e)],
      ['communityGroup', groups, (e) => this.worker.onCommunityGroup(e)],
      ['communityPost', posts, (e) => this.worker.onCommunityPost(e)],
      ['requirement', requirements, (e) => this.worker.onRequirement(e)],
      ['buyerBid', buyerBids, (e) => this.worker.onBuyerBid(e)],
    ];

    let filled = 0;
    for (const [model, rows, run] of jobs) {
      for (const row of rows) await run(row);
      filled += rows.length;
      this.capped(model, rows.length, limit);
    }
    return filled;
  }
}
