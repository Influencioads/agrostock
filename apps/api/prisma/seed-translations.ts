import { PrismaClient } from '@prisma/client';
import ruDbLabels from '@agrotraders/i18n/locales/ru/db-labels.json';

/**
 * Non-English labels for the curated taxonomy (categories, markets, CMS pages).
 * English lives on the base row, so only these locales get a translation record.
 *
 * Imported by `seed.ts`, and runnable on its own (`ts-node prisma/seed-translations.ts`)
 * to refresh translations without touching demo data.
 */
export interface DbLabels {
  categories: Record<string, string>;
  markets: Record<string, { name: string; city?: string; region?: string }>;
  cmsPages: Record<string, { title: string; body?: string }>;
}

/** Base rows are owned by the main seed; a missing one is skipped, never created. */
export async function seedLabelTranslations(prisma: PrismaClient, locale: string, labels: DbLabels) {
  let categories = 0;
  for (const [slug, name] of Object.entries(labels.categories)) {
    const row = await prisma.category.findUnique({ where: { slug } });
    if (!row) continue;
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: row.id, locale } },
      create: { categoryId: row.id, locale, name },
      update: { name },
    });
    categories++;
  }

  let markets = 0;
  for (const [slug, tr] of Object.entries(labels.markets)) {
    const row = await prisma.market.findUnique({ where: { slug } });
    if (!row) continue;
    await prisma.marketTranslation.upsert({
      where: { marketId_locale: { marketId: row.id, locale } },
      create: { marketId: row.id, locale, ...tr },
      update: tr,
    });
    markets++;
  }

  let cmsPages = 0;
  for (const [slug, tr] of Object.entries(labels.cmsPages)) {
    const row = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!row) continue;
    await prisma.cmsPageTranslation.upsert({
      where: { cmsPageId_locale: { cmsPageId: row.id, locale } },
      create: { cmsPageId: row.id, locale, ...tr },
      update: tr,
    });
    cmsPages++;
  }

  return { locale, categories, markets, cmsPages };
}

/** All locales that ship a `db-labels.json`. Add entries as translations land. */
export const DB_LABEL_LOCALES: [string, DbLabels][] = [['ru', ruDbLabels as DbLabels]];

export async function seedAllLabelTranslations(prisma: PrismaClient) {
  const results = [];
  for (const [locale, labels] of DB_LABEL_LOCALES) {
    results.push(await seedLabelTranslations(prisma, locale, labels));
  }
  return results;
}

// Standalone entry: `ts-node prisma/seed-translations.ts`
if (require.main === module) {
  const prisma = new PrismaClient();
  seedAllLabelTranslations(prisma)
    .then((r) => console.log('🌐 Label translations:', r))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
