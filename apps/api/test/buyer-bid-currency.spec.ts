import { describe, expect, it, vi } from 'vitest';
import { BuyerBidsService } from '../src/buyer-bids/buyer-bids.module';
import { noQuotas } from './helpers/entitlements-stub';

// RUB→USD at the fallback rate the FxService ships with.
const fx = {
  toUsdCents: vi.fn(async (amount: number, currency: string) =>
    Math.round((currency === 'RUB' ? amount / 78.5 : amount) * 100),
  ),
};

function service() {
  const prisma = { buyerBid: { create: vi.fn(async ({ data }: { data: unknown }) => data) } };
  return new BuyerBidsService(prisma as never, { create: vi.fn() } as never, { emit: vi.fn() } as never, fx as never, {} as never, noQuotas());
}

const base = { title: 'Wheat for Jebel Ali', productName: 'Wheat', qtyValue: 100 };

describe('buyer bid target price follows the buyer currency', () => {
  it('converts a ₽78,500 target to the USD baseline every bid is compared against', async () => {
    const row = (await service().create({ id: 'u1' } as never, {
      ...base,
      targetPriceCents: 7_850_000,
      targetPriceCurrency: 'RUB',
    } as never)) as Record<string, unknown>;

    expect(row.targetPriceCents).toBe(100_000); // $1,000 — never ₽78,500 read as dollars
    expect(row.currency).toBe('RUB');
  });

  it('leaves a USD target alone and defaults an unquoted one to USD', async () => {
    const row = (await service().create({ id: 'u1' } as never, { ...base, targetPriceCents: 90_000 } as never)) as Record<string, unknown>;
    expect(row.targetPriceCents).toBe(90_000);
    expect(row.currency).toBe('USD');

    const noTarget = (await service().create({ id: 'u1' } as never, base as never)) as Record<string, unknown>;
    expect(noTarget.targetPriceCents).toBeUndefined();
  });
});

describe('every requirement is posted as a reverse auction', () => {
  it('ignores a legacy quote mode and runs the deadline as the auction clock', async () => {
    const deadline = new Date(Date.now() + 864e5).toISOString();
    const row = (await service().create({ id: 'u1' } as never, { ...base, mode: 'quote', deadline } as never)) as Record<string, unknown>;

    expect(row.mode).toBe('auction');
    expect(row.deadline).toBeNull();
    expect(row.auctionEndsAt).toEqual(new Date(deadline));
  });

  it('rejects a deadline in the past', async () => {
    await expect(
      service().create({ id: 'u1' } as never, { ...base, deadline: new Date(Date.now() - 1000).toISOString() } as never),
    ).rejects.toThrow(/future/);
  });
});
