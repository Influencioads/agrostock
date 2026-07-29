/**
 * One-shot, UNBOUNDED run of the translation sweep.
 *
 * The same sweep runs hourly inside the API (`TranslationSweepService`), but
 * capped so a large backlog cannot spend the whole Google budget in one hour.
 * This entry point drains everything in a single pass — use it after importing a
 * pile of reference data (a market list, a taxonomy resync) rather than waiting
 * for the cron to chip away at it.
 *
 * Idempotent: only rows MISSING a translation for a locale are touched, so
 * re-running after a failure resumes where it stopped.
 *
 * Prereqs: DB up + GOOGLE_TRANSLATE_API_KEY reachable (on Windows also
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 to work around cert-revocation checks).
 * Run:  pnpm --filter @agrotraders/api backfill:taxonomy
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TranslationService } from '../src/translation/translation.service';
import { TranslationSweepService } from '../src/translation/translation-sweep.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const translation = app.get(TranslationService);
  const sweep = app.get(TranslationSweepService);

  if (!translation.enabled) {
    console.error('GOOGLE_TRANSLATE_API_KEY is not set — nothing to translate.');
    await app.close();
    return;
  }

  console.log(`Backfilling into: ${translation.targets.join(', ')}`);
  const reference = await sweep.sweepReferenceData(undefined);
  console.log(`reference data: ${reference} row(s) filled`);
  const content = await sweep.sweepContent(undefined);
  console.log(`content: ${content} row(s) filled`);

  console.log('\nBackfill complete.');
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
