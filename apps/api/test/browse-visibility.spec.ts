import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';
import { assertProductSellable, browsableWhere, sellableWhere } from '../src/products/sellable';

/**
 * Browse must show EVERY live listing in a category, auctions included. A
 * category holding six listings, two of them auctions, has to return six.
 *
 * These specs pin the split that makes that safe: what a buyer may SEE is wider
 * than what they may BUY, and the two predicates are separate.
 */

function serviceForProducts() {
  const prisma = {
    product: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
    subcategory: { findMany: vi.fn(async () => []), findUnique: vi.fn(async () => null) },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return {
    svc: new ProductsService(prisma as never, {} as never, {} as never, { fieldMap: async () => new Map() } as never),
    prisma,
  };
}

describe('browse visibility', () => {
  it('does not exclude auctions from the catalog query', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1' });

    const { where } = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where.status).toBe('live');
    // The whole bug: browse ran the PURCHASE predicate, whose auction clause
    // dropped every lot from the grid. Nothing here may mention isAuction.
    expect(where.isAuction).toBeUndefined();
    expect(where.NOT).toBeUndefined();
    expect(JSON.stringify(where)).not.toContain('auctionEndsAt');
  });

  it('counts the same rows the grid shows', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1' });

    // total comes from a count on the SAME where — a narrower count would report
    // "6 products" above a grid of four.
    const listWhere = (prisma.product.findMany.mock.calls[0][0] as { where: unknown }).where;
    const countWhere = (prisma.product.count.mock.calls[0][0] as { where: unknown }).where;
    expect(countWhere).toEqual(listWhere);
  });

  it('browsable is live-only — every auction passes it', () => {
    expect(browsableWhere()).toEqual({ status: 'live' });
  });
});

describe('purchase guard stays intact', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  it('keeps an open-ended auction sellable — the NOT form silently dropped it', () => {
    // `NOT (isAuction AND endsAt <= now)` is NULL when endsAt is NULL, and a
    // WHERE keeps only TRUE, so open-ended lots vanished from wishlists too.
    const clause = sellableWhere(now).OR;
    expect(clause).toContainEqual({ auctionEndsAt: null });
    expect(clause).toContainEqual({ isAuction: false });
    expect(clause).toContainEqual({ auctionEndsAt: { gt: now } });
  });

  it('still refuses to sell ANY auction lot directly, ended or live', () => {
    const base = { status: 'live', sellerId: 's1', isAuction: true };
    // Ended.
    expect(() => assertProductSellable({ ...base, auctionEndsAt: new Date('2025-01-01') }, now)).toThrow(/ended/i);
    // Live — must still refuse, or a lot with a priceCents could be bought
    // outright, sidestepping the bidding entirely.
    expect(() => assertProductSellable({ ...base, auctionEndsAt: new Date('2027-01-01') }, now)).toThrow(/bid/i);
    // Open-ended — the case the browse change makes newly visible.
    expect(() => assertProductSellable({ ...base, auctionEndsAt: null }, now)).toThrow(/bid/i);
  });

  it('still lets a plain live listing through', () => {
    expect(() =>
      assertProductSellable({ status: 'live', sellerId: 's1', isAuction: false, auctionEndsAt: null }, now),
    ).not.toThrow();
  });
});
