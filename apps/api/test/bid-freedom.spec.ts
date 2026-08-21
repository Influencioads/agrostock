import { describe, expect, it, vi } from 'vitest';
import { AuctionsService } from '../src/auctions/auctions.module';
import { BuyerBidsService } from '../src/buyer-bids/buyer-bids.module';
import { noQuotas } from './helpers/entitlements-stub';

/**
 * Bidders name their own price. Neither side enforces a floor any more:
 *   forward auction  → offer above OR below the standing top; highest wins.
 *   reverse (buyer)  → quote above OR below the standing best; cheapest wins.
 * These guard the "any amount is accepted" rule and the two award rules that
 * make it safe to relax.
 */

const lot = { id: 'p1', slug: 'wheat', name: 'Wheat', sellerId: 's1', isAuction: true, auctionEndsAt: null, startBidCents: 82_000, bidIncrementCents: null, reserveCents: null, status: 'live' };

/**
 * A bid is an UPSERT keyed on (product, bidder) — one account, one standing
 * offer — so `written` collects what each call would store, whether that landed
 * as the row's first value (`create`) or as a revision of it (`update`).
 */
function auctionsFor(topCents: number | null) {
  const written: Record<string, unknown>[] = [];
  const upsert = vi.fn(async (args: { where: unknown; create: Record<string, unknown>; update: Record<string, unknown> }) => {
    written.push({ ...args.create, ...args.update, where: args.where });
    return args.create;
  });
  const prisma = {
    product: { findUnique: vi.fn(async () => lot) },
    auctionBid: {
      findFirst: vi.fn(async () => (topCents == null ? null : { amountCents: topCents, bidderId: 'b9', bidder: { id: 'b9', name: 'Rival' } })),
      upsert,
      count: vi.fn(async () => 1),
    },
    auctionAutoBid: { findFirst: vi.fn(async () => null), findUnique: vi.fn(async () => null) },
  };
  const svc = new AuctionsService(prisma as never, { create: vi.fn(async () => ({})) } as never);
  // detail() is the return value, not the behaviour under test.
  vi.spyOn(svc, 'detail').mockResolvedValue({} as never);
  return { svc, written, upsert, prisma };
}

describe('forward auction accepts any offer', () => {
  it('takes a bid BELOW the current top instead of demanding a minimum raise', async () => {
    const { svc, written } = auctionsFor(900_00); // someone is at $900

    await svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 700); // $700

    expect(written).toHaveLength(1);
    expect(written[0].amountCents).toBe(70_000);
  });

  it('takes a bid a single cent above the top — no $50 step to clear', async () => {
    const { svc, written } = auctionsFor(820_00);

    await svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 820.01);

    expect(written[0].amountCents).toBe(82_001);
  });

  it('still refuses a bid on your own lot', async () => {
    const { svc } = auctionsFor(null);
    await expect(svc.place('wheat', { id: 's1', role: 'buyer' } as never, 900)).rejects.toThrow();
  });
});

describe('one account, one standing offer', () => {
  it('revises the bidder OWN row instead of stacking a second bid on the book', async () => {
    const { svc, written, upsert } = auctionsFor(900_00);

    await svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 910);
    await svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 950);

    // Two placements, both keyed on the same (product, bidder) row — never an insert.
    expect(upsert).toHaveBeenCalledTimes(2);
    for (const call of upsert.mock.calls) {
      expect((call[0] as { where: { productId_bidderId: unknown } }).where.productId_bidderId).toEqual({ productId: 'p1', bidderId: 'b1' });
    }
    expect(written.map((w) => w.amountCents)).toEqual([91_000, 95_000]);
  });

  it('lets a bidder revise DOWNWARDS before the lot closes', async () => {
    const { svc, written } = auctionsFor(900_00);

    await svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 950);
    await svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 800);

    expect(written[1].amountCents).toBe(80_000);
  });

  it('refuses any revision once the lot has ended — the window is "until close"', async () => {
    const { svc, prisma, upsert } = auctionsFor(900_00);
    prisma.product.findUnique = vi.fn(async () => ({ ...lot, auctionEndsAt: new Date(Date.now() - 1000) }));

    await expect(svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 950)).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('bid book identities', () => {
  function booksFor() {
    const prisma = {
      product: { findUnique: vi.fn(async () => lot) },
      auctionBid: {
        findMany: vi.fn(async () => [
          { id: 'x1', bidderId: 'b7', amountCents: 90_000, createdAt: new Date(), auto: false, bidder: { id: 'b7', name: 'Karim Trading' } },
        ]),
      },
    };
    return new AuctionsService(prisma as never, { create: vi.fn() } as never);
  }

  it('gives the lot owner the real bidder, so they can chat and allocate', async () => {
    const [row] = await booksFor().bids('wheat', { id: 's1', role: 'seller' } as never);

    expect(row.bidderId).toBe('b7');
    expect(row.bidderName).toBe('Karim Trading');
    expect(row.masked).toBe('Karim Trading');
  });

  it('never leaks the bidder id to anyone else — an id resolves to a full name', async () => {
    const [row] = await booksFor().bids('wheat', { id: 'stranger', role: 'buyer' } as never);

    expect(row.bidderId).toBeNull();
    expect(row.bidderName).toBeNull();
    expect(row.masked).not.toBe('Karim Trading');
  });
});

describe('reverse (buyer) auction accepts any quote', () => {
  function buyerBidsFor(bestCents: number) {
    const notify = vi.fn(async () => ({}));
    const written: Record<string, unknown>[] = [];
    const prisma = {
      buyerBid: { findUnique: vi.fn(async () => ({ id: 'r1', buyerId: 'b1', status: 'open', mode: 'auction', qtyUnit: 'MT', reference: 'BID-1', deadline: null, auctionEndsAt: null })) },
      sellerBid: {
        findFirst: vi.fn(async () => ({ priceCents: bestCents, sellerId: 's-other' })),
        // One account, one standing offer — same upsert shape as the forward side.
        upsert: vi.fn(async (args: { where: unknown; create: Record<string, unknown>; update: Record<string, unknown> }) => {
          written.push({ ...args.create, ...args.update, where: args.where });
          return args.create;
        }),
      },
    };
    const svc = new BuyerBidsService(prisma as never, { create: notify } as never, {} as never, {} as never, {} as never, noQuotas());
    vi.spyOn(svc, 'detail').mockResolvedValue({} as never);
    return { svc, prisma, notify, written };
  }

  it('accepts a quote ABOVE the standing best, and does not tell the leader they were undercut', async () => {
    const { svc, prisma, notify } = buyerBidsFor(50_000); // best is $500

    await svc.submitBid('r1', { id: 's2', role: 'seller' } as never, { priceCents: 60_000, qtyValue: 10 } as never);

    expect(prisma.sellerBid.upsert).toHaveBeenCalled();
    const types = notify.mock.calls.map((c) => (c[0] as { type: string }).type);
    expect(types).toContain('buyer_bid.new_seller_bid');
    expect(types).not.toContain('buyer_bid.outbid');
  });

  it('stores the price the seller typed — under the buyer target or over it, never the target', async () => {
    // Buyer wants $8/KG; the seller can say $7.50 or $8.50 and both land as typed.
    for (const priceCents of [750, 850]) {
      const { svc, written } = buyerBidsFor(800);
      await svc.submitBid('r1', { id: 's2', role: 'seller' } as never, { priceCents, qtyValue: 10 } as never);
      expect(written[0].priceCents).toBe(priceCents);
    }
  });

  it('revises the seller OWN offer instead of adding a second row to the book', async () => {
    const { svc, prisma, written } = buyerBidsFor(80_000);

    await svc.submitBid('r1', { id: 's2', role: 'seller' } as never, { priceCents: 75_000, qtyValue: 10 } as never);
    await svc.submitBid('r1', { id: 's2', role: 'seller' } as never, { priceCents: 85_000, qtyValue: 10 } as never);

    expect(prisma.sellerBid.upsert).toHaveBeenCalledTimes(2);
    for (const call of prisma.sellerBid.upsert.mock.calls) {
      expect((call[0] as { where: { buyerBidId_sellerId: unknown } }).where.buyerBidId_sellerId).toEqual({ buyerBidId: 'r1', sellerId: 's2' });
    }
    // The revision UP is the one that sticks — the old cheaper row is gone, not
    // silently kept as "your best price".
    expect(written.map((w) => w.priceCents)).toEqual([75_000, 85_000]);
  });

  it('tells the previous leader only when the new quote actually undercuts', async () => {
    const { svc, notify } = buyerBidsFor(50_000);

    await svc.submitBid('r1', { id: 's2', role: 'seller' } as never, { priceCents: 40_000, qtyValue: 10 } as never);

    const types = notify.mock.calls.map((c) => (c[0] as { type: string }).type);
    expect(types).toContain('buyer_bid.outbid');
  });
});
