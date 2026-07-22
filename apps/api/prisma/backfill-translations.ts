/**
 * Opt-in, idempotent, resumable backfill: machine-translate the EXISTING
 * back-catalog (products, reviews, community posts, trade requirements, buyer
 * bids) into every non-English locale, filling the translation cache tables.
 *
 * Reuses the live translate-on-write workers, so behaviour matches new content
 * exactly. A row is skipped only when its source hash is unchanged AND every
 * target locale already has a row, which makes this safe to re-run, resumable
 * after an interruption, and — importantly — the way a NEWLY ADDED locale gets
 * filled in for the back-catalogue (it translates just the missing locales).
 *
 * ⚠️ Cost: translates each row × every missing locale via Google — run deliberately.
 *
 * Prereqs: DB up + schema pushed (`prisma db push`) + GOOGLE_TRANSLATE_API_KEY set.
 * Run:  pnpm --filter @agrotraders/api backfill:translations
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TranslationService } from '../src/translation/translation.service';
import { ContentTranslationWorker } from '../src/translation/content-translation.worker';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const translation = app.get(TranslationService);
  const worker = app.get(ContentTranslationWorker);

  if (!translation.enabled) {
    console.error('GOOGLE_TRANSLATE_API_KEY is not set — nothing to translate.');
    await app.close();
    return;
  }

  console.log(`Backfilling into: ${translation.targets.join(', ')}`);

  // Each entity: fetch ids, then run its worker sequentially (throttles Google;
  // the worker skips rows whose source hash already matches → idempotent/resumable).
  const run = async (label: string, ids: { id: string }[], fn: (e: { id: string }) => Promise<void>) => {
    console.log(`\n${label}: ${ids.length} row(s)`);
    for (let i = 0; i < ids.length; i++) {
      await fn({ id: ids[i].id });
      if ((i + 1) % 25 === 0 || i + 1 === ids.length) console.log(`  ${label} ${i + 1}/${ids.length}`);
    }
  };

  await run('products', await prisma.product.findMany({ select: { id: true } }), (e) => worker.onProduct(e));
  await run(
    'reviews',
    await prisma.review.findMany({ where: { text: { not: null } }, select: { id: true } }),
    (e) => worker.onReview(e),
  );
  await run(
    'community posts',
    await prisma.communityPost.findMany({ where: { deletedAt: null }, select: { id: true } }),
    (e) => worker.onCommunityPost(e),
  );
  await run(
    'trade requirements',
    await prisma.communityTradeRequirement.findMany({ select: { id: true } }),
    (e) => worker.onRequirement(e),
  );
  await run('buyer bids', await prisma.buyerBid.findMany({ select: { id: true } }), (e) => worker.onBuyerBid(e));

  console.log('\nBackfill complete.');
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
