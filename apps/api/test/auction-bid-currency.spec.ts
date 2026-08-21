import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';
import { noQuotas } from './helpers/entitlements-stub';

// RUB→USD at the fallback rate the FxService ships with.
const fx = { toUsdCents: vi.fn(async (amount: number, currency: string) => Math.round((currency === 'RUB' ? amount / 78.5 : amount) * 100)) };

function serviceFor(existing?: Record<string, unknown>) {
  const prisma = {
    product: {
      findUnique: vi.fn(async () => ({ id: 'p1', sellerId: 's1', price: '70000', priceCurrency: 'RUB', subcategoryId: null, ...existing })),
      create: vi.fn(async ({ data }: { data: unknown }) => data),
      update: vi.fn(async ({ data }: { data: unknown }) => data),
    },
  };
  const svc = new ProductsService(prisma as never, { emit: vi.fn() } as never, fx as never, {} as never, noQuotas());
  return svc;
}

describe('auction starting bid follows the listing currency', () => {
  it('converts a ₽80,000 opening bid to the USD baseline on create', async () => {
    const row = (await serviceFor().create('s1', {
      name: 'Wheat',
      categoryId: 'c1',
      price: '70000',
      priceCurrency: 'RUB',
      images: [],
      isAuction: true,
      startBidCents: 8_000_000,
    } as never)) as Record<string, number>;

    expect(row.startBidSrcCents).toBe(8_000_000); // seller's own ₽80,000
    expect(row.startBidCents).toBe(101_911); // ≈ $1,019 — never ₽80,000 read as dollars
  });

  it('re-converts when the seller switches the listing to USD', async () => {
    const row = (await serviceFor().update('p1', 's1', {
      price: '900',
      priceCurrency: 'USD',
      startBidCents: 90_000,
    } as never)) as Record<string, number>;

    expect(row.startBidCents).toBe(90_000);
    expect(row.startBidSrcCents).toBe(90_000);
  });
});
