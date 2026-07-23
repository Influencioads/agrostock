import { describe, expect, it } from 'vitest';
import {
  KNOWN_DEMO_EMAILS,
  assertNoDemoAccounts,
  assertProductionHasNoDemoAccounts,
} from '../src/config/demo-account-guard';

const prod = { NODE_ENV: 'production' } as const;

describe('demo account startup guard', () => {
  it('covers every account the demo seed provisions', () => {
    for (const email of ['buyer', 'seller', 'admin', 'finance', 'moderator', 'worker2']) {
      expect(KNOWN_DEMO_EMAILS).toContain(`${email}@agrotraders.org`);
    }
  });

  it('refuses production startup when demo accounts exist', () => {
    expect(() => assertNoDemoAccounts(['admin@agrotraders.org'], prod)).toThrow(
      /demo accounts.*admin@agrotraders\.org/,
    );
  });

  it('allows production startup when no demo accounts exist', () => {
    expect(() => assertNoDemoAccounts([], prod)).not.toThrow();
  });

  it('does nothing outside production', () => {
    expect(() => assertNoDemoAccounts(['admin@agrotraders.org'], { NODE_ENV: 'test' })).not.toThrow();
  });

  it('queries the database only in production and fails on matches', async () => {
    let queried = false;
    const prisma = {
      user: {
        findMany: async () => {
          queried = true;
          return [{ email: 'seller@agrotraders.org' }];
        },
      },
    };
    await expect(assertProductionHasNoDemoAccounts(prisma, { NODE_ENV: 'test' })).resolves.toBeUndefined();
    expect(queried).toBe(false);
    await expect(assertProductionHasNoDemoAccounts(prisma, prod)).rejects.toThrow('seller@agrotraders.org');
    expect(queried).toBe(true);
  });
});
