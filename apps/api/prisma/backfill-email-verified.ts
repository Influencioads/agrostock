/**
 * One-off: mark every pre-existing account as email-confirmed.
 *
 * Login now requires `User.emailVerifiedAt`, but accounts created before the
 * confirmation flow existed never had a link to click — without this they would
 * all be locked out. Stamps their `createdAt` so the column reads honestly.
 * Idempotent: only rows still NULL are touched, so new unconfirmed signups made
 * after the feature shipped are never silently verified.
 *
 *   pnpm --filter @agrotraders/api backfill:email-verified
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.user.findMany({
    where: { emailVerifiedAt: null },
    select: { id: true, createdAt: true },
  });
  if (!pending.length) {
    console.log('email-verified backfill: nothing to do.');
    return;
  }
  for (const user of pending) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: user.createdAt },
    });
  }
  console.log(`email-verified backfill: stamped ${pending.length} account(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
