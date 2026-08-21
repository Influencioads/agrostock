import { PrismaClient } from '@prisma/client';
import { seedBilling } from '../../src/billing/plan-defaults';

/**
 * CLI wrapper around the shared plan-catalogue seeder.
 *
 *   pnpm --filter @agrotraders/api seed:billing         → create what is missing
 *   pnpm --filter @agrotraders/api seed:billing --force → also reset prices/quotas
 *
 * The logic itself lives in `src/billing/plan-defaults.ts` so the admin console's
 * "restore defaults" button and this script cannot drift apart.
 */
const prisma = new PrismaClient();

async function main() {
  const force = process.argv.includes('--force');
  const r = await seedBilling(prisma, force);
  console.log(
    `Billing seed${force ? ' (forced)' : ''}: ${r.plansCreated} plans created, ${r.plansUpdated} existing, ` +
      `${r.pricesWritten} cycle prices, ${r.gatewaysCreated} gateway rows created.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
