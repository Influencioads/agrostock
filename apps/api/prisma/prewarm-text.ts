/**
 * Opt-in, idempotent pre-warm for the generic translate-on-read cache
 * ({@link TextTranslationService} / the `TextTranslation` table).
 *
 * The directory endpoints (provider bios, market names, public-profile product
 * names) translate free-text ON READ via Google. On hosts where the API process
 * can't reach Google at request time (e.g. a Windows box hitting the schannel
 * cert-revocation error, or simply no key in that process), those reads silently
 * fall back to English. Running this once — from an environment that CAN reach
 * Google — fills the cache so every later read is served from the DB with no live
 * call, exactly like the per-type translation tables.
 *
 * Reuses TextTranslationService.localizeMany, so hashing/caching matches runtime
 * byte-for-byte. Re-running only translates strings/locales not already cached.
 *
 * Prereqs: DB up + GOOGLE_TRANSLATE_API_KEY reachable (on Windows also
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 to work around cert-revocation checks).
 * Run:  pnpm --filter @agrotraders/api prewarm:text
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TranslationService } from '../src/translation/translation.service';
import { TextTranslationService } from '../src/translation/text-translation.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const translation = app.get(TranslationService);
  const text = app.get(TextTranslationService);

  if (!text.enabled) {
    console.error('GOOGLE_TRANSLATE_API_KEY is not set — nothing to pre-warm.');
    await app.close();
    return;
  }

  // Every distinct free-text string the on-read endpoints translate: directory
  // (bios, markets, product names) plus the dashboard surfaces (orders, hires,
  // transport, loaders, ads, offices). Place names, plates, person names and
  // brand model names are intentionally NOT collected — they stay canonical.
  const [profiles, markets, products, requests, routes, vehicles, jobs, teams, workers, ads, offices, hires] =
    await Promise.all([
      prisma.profile.findMany({ where: { bio: { not: null } }, select: { bio: true } }),
      prisma.market.findMany({ select: { name: true } }),
      prisma.product.findMany({ where: { approved: true }, select: { name: true, grade: true, delivery: true } }),
      prisma.transportRequest.findMany({ select: { cargo: true } }),
      prisma.route.findMany({ select: { name: true } }),
      prisma.vehicle.findMany({ select: { type: true, notes: true } }),
      prisma.loaderJob.findMany({ select: { cargo: true, notes: true } }),
      prisma.team.findMany({ select: { name: true } }),
      prisma.worker.findMany({ select: { skill: true } }),
      prisma.adCampaign.findMany({ select: { rejectionReason: true } }),
      prisma.office.findMany({ select: { name: true, type: true } }),
      prisma.hireRequest.findMany({ select: { cargo: true, message: true } }),
    ]);

  const [invoiceLines, invoices] = await Promise.all([
    prisma.invoiceLine.findMany({ select: { description: true } }),
    prisma.invoice.findMany({ where: { notes: { not: null } }, select: { notes: true } }),
  ]);

  const sources = [
    ...profiles.map((p) => p.bio),
    ...markets.map((m) => m.name),
    ...products.flatMap((p) => [p.name, p.grade, p.delivery]),
    ...requests.map((r) => r.cargo),
    ...routes.map((r) => r.name),
    ...vehicles.flatMap((v) => [v.type, v.notes]),
    ...jobs.flatMap((j) => [j.cargo, j.notes]),
    ...teams.map((t) => t.name),
    ...workers.map((w) => w.skill),
    ...ads.map((a) => a.rejectionReason),
    ...offices.flatMap((o) => [o.name, o.type]),
    ...hires.flatMap((h) => [h.cargo, h.message]),
    ...invoiceLines.map((l) => l.description),
    ...invoices.map((i) => i.notes),
  ].filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
  const unique = [...new Set(sources)];

  console.log(`Pre-warming ${unique.length} unique string(s) into: ${translation.targets.join(', ')}`);

  for (const locale of translation.targets) {
    // localizeMany reads the cache, translates only the misses, and writes them
    // back — so this both fills and verifies the cache for `locale`.
    await text.localizeMany(unique, locale);
    console.log(`  ${locale}: done`);
  }

  console.log('\nText pre-warm complete.');
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
