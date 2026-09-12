/**
 * App Review preparation — idempotent, safe to re-run.
 *
 * Two jobs, both of which App Review checks and neither of which needs a new
 * app build, because both are server-side data:
 *
 *   1. Publish the real Terms of Service from `prisma/legal/terms.txt`. The
 *      seeded row says "Replace with your legal copy", and the in-app Legal
 *      screen renders whatever the CMS returns — so a reviewer opening
 *      Account → Terms of Service currently reads placeholder text. Guideline
 *      1.2 wants a real EULA with a zero-tolerance clause behind that tap.
 *
 *   2. Mint the two demo accounts App Review needs. The README's seed logins
 *      (`buyer@agrotraders.org` / `password123`) only ever existed on a local
 *      database; against production they 401, which is enough on its own to
 *      stall a review. Self-registration cannot rescue a reviewer either —
 *      with SMTP configured, `login` refuses an unverified address
 *      (auth.service.ts), so a reviewer who signs up is stuck behind an email
 *      they cannot receive. These rows are therefore stamped verified.
 *
 * The second account exists so the deletion demo does not destroy the first.
 *
 * Run inside the API container, which already has DATABASE_URL, the Prisma
 * client and bcryptjs:
 *
 *   docker compose -f infra/docker-compose.prod.yml --env-file .env \
 *     run --rm --entrypoint node api prisma/appstore-prep.mjs
 *
 * Override the password with APPREVIEW_PASSWORD; it is printed at the end so
 * it can be pasted straight into App Store Connect.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

const PASSWORD = process.env.APPREVIEW_PASSWORD || 'AppReview!2026';

/** Buyer+seller so one login shows both the shopping tabs and the seller console. */
const PRIMARY = {
  email: 'appreview@agrotraders.org',
  name: 'App Review',
  role: 'buyer',
  roles: ['buyer', 'seller'],
};

/** Deliberately disposable: the screen recording deletes this one. */
const DISPOSABLE = {
  email: 'appreview.delete@agrotraders.org',
  name: 'App Review Deletion Demo',
  role: 'buyer',
  roles: ['buyer'],
};

async function publishTerms() {
  const body = readFileSync(join(here, 'legal', 'terms.txt'), 'utf8').trim();
  const page = await prisma.cmsPage.upsert({
    where: { slug: 'terms' },
    create: { slug: 'terms', title: 'Terms of Service', body, published: true },
    update: { title: 'Terms of Service', body, published: true },
  });
  // A stale Russian translation would be served to ru devices in preference to
  // the English body we just wrote, so drop it rather than ship placeholder RU.
  const stale = await prisma.cmsPageTranslation.deleteMany({ where: { cmsPageId: page.id } });
  console.log(`terms: published ${body.length} chars (${stale.count} stale translation(s) dropped)`);

  const privacy = await prisma.cmsPage.findUnique({ where: { slug: 'privacy' } });
  if (!privacy?.published || (privacy.body ?? '').length < 500) {
    console.log('WARNING: privacy page is missing, unpublished or suspiciously short.');
  } else {
    console.log(`privacy: already published, ${privacy.body.length} chars — left untouched`);
  }
}

async function upsertReviewer(spec) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: spec.email },
    create: {
      email: spec.email,
      name: spec.name,
      passwordHash,
      role: spec.role,
      roles: spec.roles,
      active: true,
      // Stamped, not left to the email round-trip a reviewer cannot complete.
      emailVerifiedAt: new Date(),
      // So the trust badge renders without waiting on manual review.
      kycStatus: 'verified',
      country: 'United Arab Emirates',
      locale: 'en',
    },
    update: {
      // Re-running resets the password, which is the point: it guarantees the
      // credentials we hand Apple are the credentials that work.
      passwordHash,
      name: spec.name,
      role: spec.role,
      roles: spec.roles,
      active: true,
      emailVerifiedAt: new Date(),
      kycStatus: 'verified',
    },
  });
  console.log(`user: ${user.email} (${user.id}) role=${user.role} roles=[${user.roles}] verified=${!!user.emailVerifiedAt}`);
  return user;
}

const main = async () => {
  await publishTerms();
  await upsertReviewer(PRIMARY);
  await upsertReviewer(DISPOSABLE);
  console.log('\n--- paste into App Store Connect ---');
  console.log(`username: ${PRIMARY.email}`);
  console.log(`password: ${PASSWORD}`);
  console.log(`(deletion demo account: ${DISPOSABLE.email}, same password)`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
