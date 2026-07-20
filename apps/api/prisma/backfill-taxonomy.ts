/**
 * Opt-in, idempotent backfill for TAXONOMY / reference-data translations that
 * the translate-on-write worker does NOT cover: categories, subcategories,
 * markets, and community groups. These are admin-managed reference rows (not
 * user content), so they have no upsert events — their translation tables were
 * only ever seeded for a single locale (`ru`), leaving the other 8 languages
 * showing English category/subcategory/market names.
 *
 * For every target locale this translates the names (and group descriptions)
 * that are MISSING a row for that locale and upserts them. Existing rows are
 * left untouched, so re-running is cheap and safe.
 *
 * Prereqs: DB up + GOOGLE_TRANSLATE_API_KEY reachable (on Windows also
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 to work around cert-revocation checks).
 * Run:  pnpm --filter @agrotraders/api backfill:taxonomy
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TranslationService } from '../src/translation/translation.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const translation = app.get(TranslationService);

  if (!translation.enabled) {
    console.error('GOOGLE_TRANSLATE_API_KEY is not set — nothing to translate.');
    await app.close();
    return;
  }

  const [categories, subcategories, markets, groups, cmsPages] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.subcategory.findMany({ select: { id: true, name: true } }),
    prisma.market.findMany({ select: { id: true, name: true } }),
    prisma.communityGroup.findMany({ select: { id: true, name: true, description: true } }),
    prisma.cmsPage.findMany({ select: { id: true, title: true, body: true } }),
  ]);

  console.log(`Backfilling taxonomy into: ${translation.targets.join(', ')}`);

  for (const locale of translation.targets) {
    // Each block: find rows lacking a translation for THIS locale, batch-translate
    // their names, and upsert. Google auto-detects the (English) source.
    const catHave = new Set(
      (await prisma.categoryTranslation.findMany({ where: { locale }, select: { categoryId: true } })).map((r) => r.categoryId),
    );
    const catMiss = categories.filter((c) => !catHave.has(c.id));
    if (catMiss.length) {
      const names = await translation.translateAuto(catMiss.map((c) => c.name), locale);
      for (let i = 0; i < catMiss.length; i++) {
        const name = names[i] || catMiss[i].name;
        await prisma.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: catMiss[i].id, locale } },
          create: { categoryId: catMiss[i].id, locale, name },
          update: { name },
        });
      }
    }

    const subHave = new Set(
      (await prisma.subcategoryTranslation.findMany({ where: { locale }, select: { subcategoryId: true } })).map((r) => r.subcategoryId),
    );
    const subMiss = subcategories.filter((s) => !subHave.has(s.id));
    if (subMiss.length) {
      const names = await translation.translateAuto(subMiss.map((s) => s.name), locale);
      for (let i = 0; i < subMiss.length; i++) {
        const name = names[i] || subMiss[i].name;
        await prisma.subcategoryTranslation.upsert({
          where: { subcategoryId_locale: { subcategoryId: subMiss[i].id, locale } },
          create: { subcategoryId: subMiss[i].id, locale, name },
          update: { name },
        });
      }
    }

    const mktHave = new Set(
      (await prisma.marketTranslation.findMany({ where: { locale }, select: { marketId: true } })).map((r) => r.marketId),
    );
    const mktMiss = markets.filter((m) => !mktHave.has(m.id));
    if (mktMiss.length) {
      const names = await translation.translateAuto(mktMiss.map((m) => m.name), locale);
      for (let i = 0; i < mktMiss.length; i++) {
        const name = names[i] || mktMiss[i].name;
        await prisma.marketTranslation.upsert({
          where: { marketId_locale: { marketId: mktMiss[i].id, locale } },
          create: { marketId: mktMiss[i].id, locale, name },
          update: { name },
        });
      }
    }

    const grpHave = new Set(
      (await prisma.communityGroupTranslation.findMany({ where: { locale }, select: { groupId: true } })).map((r) => r.groupId),
    );
    const grpMiss = groups.filter((g) => !grpHave.has(g.id));
    if (grpMiss.length) {
      const names = await translation.translateAuto(grpMiss.map((g) => g.name), locale);
      const descs = await translation.translateAuto(grpMiss.map((g) => g.description ?? ''), locale);
      for (let i = 0; i < grpMiss.length; i++) {
        const name = names[i] || grpMiss[i].name;
        const description = grpMiss[i].description ? descs[i] || grpMiss[i].description : null;
        await prisma.communityGroupTranslation.upsert({
          where: { groupId_locale: { groupId: grpMiss[i].id, locale } },
          create: { groupId: grpMiss[i].id, locale, name, description },
          update: { name, description },
        });
      }
    }

    const cmsHave = new Set(
      (await prisma.cmsPageTranslation.findMany({ where: { locale }, select: { cmsPageId: true } })).map((r) => r.cmsPageId),
    );
    const cmsMiss = cmsPages.filter((c) => !cmsHave.has(c.id));
    if (cmsMiss.length) {
      const titles = await translation.translateAuto(cmsMiss.map((c) => c.title), locale);
      const bodies = await translation.translateAuto(cmsMiss.map((c) => c.body ?? ''), locale);
      for (let i = 0; i < cmsMiss.length; i++) {
        const title = titles[i] || cmsMiss[i].title;
        const body = cmsMiss[i].body ? bodies[i] || cmsMiss[i].body : null;
        await prisma.cmsPageTranslation.upsert({
          where: { cmsPageId_locale: { cmsPageId: cmsMiss[i].id, locale } },
          create: { cmsPageId: cmsMiss[i].id, locale, title, body },
          update: { title, body },
        });
      }
    }

    console.log(`  ${locale}: +${catMiss.length} cat, +${subMiss.length} sub, +${mktMiss.length} market, +${grpMiss.length} group, +${cmsMiss.length} cms`);
  }

  console.log('\nTaxonomy backfill complete.');
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
