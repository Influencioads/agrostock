import { describe, expect, it } from 'vitest';
import { applyDiscount, cycleSavingPercent, perMonthMinor, PLAN_SEED } from './billing';

/** The published card's own per-month figures, in rubles. */
const PUBLISHED: [string, 'quarterly' | 'yearly', number][] = [
  ['seller_standard', 'quarterly', 2633],
  ['seller_standard', 'yearly', 2075],
  ['seller_pro', 'quarterly', 7300],
  ['seller_pro', 'yearly', 5575],
  ['buyer_business', 'quarterly', 1700],
  ['buyer_business', 'yearly', 1325],
  ['buyer_corporate', 'quarterly', 5300],
  ['buyer_corporate', 'yearly', 4158],
  ['transporter_standard', 'quarterly', 3500],
  ['transporter_standard', 'yearly', 2742],
  ['transporter_fleet', 'quarterly', 8967],
  ['transporter_fleet', 'yearly', 6992],
  ['loaderco_standard', 'yearly', 2075],
  ['loaderco_pro', 'quarterly', 6300],
  ['loaderco_pro', 'yearly', 4825],
  ['worker_pro', 'quarterly', 430],
  ['worker_pro', 'yearly', 333],
  ['accountant_standard', 'quarterly', 4400],
  ['accountant_standard', 'yearly', 3408],
  ['accountant_pro', 'quarterly', 10967],
  ['accountant_pro', 'yearly', 8325],
  ['processor_standard', 'quarterly', 6300],
  ['processor_standard', 'yearly', 4825],
];

describe('the published price card', () => {
  it.each(PUBLISHED)('%s %s reads as the printed per-month figure', (code, cycle, expected) => {
    const plan = PLAN_SEED.find((p) => p.code === code)!;
    expect(plan, code).toBeDefined();
    expect(perMonthMinor(plan.prices![cycle]!, cycle) / 100).toBe(expected);
  });

  it('gives every role a free tier — supply that is not here earns nothing', () => {
    const roles = new Set(PLAN_SEED.map((p) => p.role));
    for (const role of roles) {
      expect(PLAN_SEED.some((p) => p.role === role && p.tier === 0), role).toBe(true);
    }
  });

  it('prices the processor Standard above the shared service ladder', () => {
    const processor = PLAN_SEED.find((p) => p.code === 'processor_standard')!;
    const packer = PLAN_SEED.find((p) => p.code === 'packer_standard')!;
    expect(processor.prices!.monthly).toBe(690000);
    expect(packer.prices!.monthly).toBe(490000);
    // ...while keeping the identical quotas — the ladder is one, not five.
    expect(processor.limits).toEqual(packer.limits);
  });

  it('discounts the quarterly and yearly cycles roughly 10% and 30%', () => {
    for (const plan of PLAN_SEED.filter((p) => p.prices?.monthly && p.prices.yearly)) {
      const m = plan.prices!.monthly!;
      expect(cycleSavingPercent(m, plan.prices!.quarterly!, 'quarterly')).toBeGreaterThanOrEqual(8);
      expect(cycleSavingPercent(m, plan.prices!.quarterly!, 'quarterly')).toBeLessThanOrEqual(12);
      expect(cycleSavingPercent(m, plan.prices!.yearly!, 'yearly')).toBeGreaterThanOrEqual(26);
      expect(cycleSavingPercent(m, plan.prices!.yearly!, 'yearly')).toBeLessThanOrEqual(33);
    }
  });

  it('clamps a discount so it can never mint money', () => {
    expect(applyDiscount(10000, 50)).toBe(5000);
    expect(applyDiscount(10000, 0)).toBe(10000);
    expect(applyDiscount(10000, 150)).toBe(0);
    expect(applyDiscount(10000, -20)).toBe(10000);
  });
});
