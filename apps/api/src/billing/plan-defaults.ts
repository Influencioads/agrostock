import type { BillingCycle, PaymentProviderKey, PrismaClient, Role } from '@prisma/client';
import { PLAN_SEED, type PlanSeed } from '@agrotraders/types';

/**
 * Install the published price card.
 *
 * Reference data, not demo data: safe to run in production, and the way a fresh
 * environment gets its plan catalogue. Lives under `src/` (rather than in the
 * seed script) so both the CLI seeder and the admin console's "restore defaults"
 * button run the identical code — and so nothing under `src/` has to import out
 * of `prisma/`, which would drag the seeds into the Nest build output.
 *
 * Idempotent and upsert-only. Without `force` an existing plan keeps whatever an
 * admin has set: re-running the seeder must never silently revert a deliberate
 * price change.
 */

export interface SeedResult {
  plansCreated: number;
  plansUpdated: number;
  pricesWritten: number;
  gatewaysCreated: number;
}

/** Any Prisma client — the Nest-injected one or a standalone CLI instance. */
type Db = Pick<PrismaClient, 'plan' | 'planPrice' | 'paymentGatewayConfig' | 'billingSettings'>;

async function seedPlan(seed: PlanSeed, sortOrder: number, force: boolean, db: Db): Promise<'created' | 'updated'> {
  const existing = await db.plan.findUnique({ where: { code: seed.code }, select: { id: true } });

  const data = {
    role: seed.role as Role,
    tier: seed.tier,
    name: seed.name,
    description: seed.description ?? null,
    sortOrder,
    limits: seed.limits,
    features: seed.features,
    active: true,
  };

  const plan = await db.plan.upsert({
    where: { code: seed.code },
    create: { code: seed.code, ...data },
    // Only the structural fields an admin cannot edit are refreshed without --force.
    update: force ? data : { role: data.role, tier: data.tier },
    select: { id: true },
  });

  for (const [cycle, amountMinor] of Object.entries(seed.prices ?? {})) {
    const priceExists = await db.planPrice.findUnique({
      where: { planId_cycle: { planId: plan.id, cycle: cycle as BillingCycle } },
      select: { id: true },
    });
    if (priceExists && !force) continue;
    await db.planPrice.upsert({
      where: { planId_cycle: { planId: plan.id, cycle: cycle as BillingCycle } },
      create: { planId: plan.id, cycle: cycle as BillingCycle, amountMinor, currency: 'RUB' },
      update: { amountMinor, currency: 'RUB', active: true },
    });
  }

  return existing ? 'updated' : 'created';
}

export async function seedBilling(db: Db, force = false): Promise<SeedResult> {
  const result: SeedResult = { plansCreated: 0, plansUpdated: 0, pricesWritten: 0, gatewaysCreated: 0 };

  for (const [index, seed] of PLAN_SEED.entries()) {
    const outcome = await seedPlan(seed, index, force, db);
    if (outcome === 'created') result.plansCreated++;
    else result.plansUpdated++;
    result.pricesWritten += Object.keys(seed.prices ?? {}).length;
  }

  // One config row per provider, all off. Present-but-disabled beats absent: the
  // admin page can render three cards without inventing rows, and switching a
  // gateway on becomes an UPDATE rather than a create-and-hope.
  for (const [index, provider] of (['yookassa', 'tbank', 'robokassa'] as PaymentProviderKey[]).entries()) {
    const existed = await db.paymentGatewayConfig.findUnique({ where: { provider }, select: { provider: true } });
    if (existed) continue;
    await db.paymentGatewayConfig.create({ data: { provider, enabled: false, testMode: true, sortOrder: index } });
    result.gatewaysCreated++;
  }

  // Settings singleton: commission off at 0%, quotas armed.
  await db.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  return result;
}
