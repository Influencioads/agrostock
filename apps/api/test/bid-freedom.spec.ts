import { describe, expect, it, vi } from 'vitest';
import { AuctionsService } from '../src/auctions/auctions.module';
import { BuyerBidsService } from '../src/buyer-bids/buyer-bids.module';

/**
 * Bidders name their own price. Neither side enforces a floor any more:
 *   forward auction  → offer above OR below the standing top; highest wins.
 *   reverse (buyer)  → quote above OR below the standing best; cheapest wins.
 * These guard the "any amount is accepted" rule and the two award rules that
 * make it safe to relax.
 */

const lot = { id: 'p1', slug: 'wheat', name: 'Wheat', sellerId: 's1', isAuction: true, auctionEndsAt: null, startBidCents: 82_000, bidIncrementCents: null, reserveCents: null, status: 'live' };

function auctionsFor(topCents: number | null) {
  const created: Record<string, unknown>[] = [];
  const prisma = {
    product: { findUnique: vi.fn(async () => lot) },
    auctionBid: {
      findFirst: vi.fn(async () => (topCents == null ? null : { amountCents: topCents, bidderId: 'b9', bidder: { id: 'b9', name: 'Rival' } })),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return data; }),
      count: vi.fn(async () => 1),
    },
    auctionAutoBid: { findFirst: vi.fn(async () => null), findUnique: vi.fn(async () => null) },
  };
  const svc = new AuctionsService(prisma as never, { create: vi.fn(async () => ({})) } as never);
  // detail() is the return value, not the behaviour under test.
  vi.spyOn(svc, 'detail').mockResolvedValue({} as never);
  return { svc, created };
}

describe('forward auction accepts any offer', () => {
  it('takes a bid BELOW the current top instead of demanding a minimum raise', async () => {
    const { svc, created } = auctionsFor(900_00); // someone is at $900

    await svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 700); // $700

    expect(created).toHaveLength(1);
    expect(created[0].amountCents).toBe(70_000);
  });

  it('takes a bid a single cent above the top — no $50 step to clear', async () => {
    const { svc, created } = auctionsFor(820_00);

    await svc.place('wheat', { id: 'b1', role: 'buyer' } as never, 820.01);

    expect(created[0].amountCents).toBe(82_001);
  });

  it('still refuses a bid on your own lot', async () => {
    const { svc } = auctionsFor(null);
    await expect(svc.place('wheat', { id: 's1', role: 'buyer' } as never, 900)).rejects.toThrow();
  });
});

describe('reverse (buyer) auction accepts any quote', () => {
  function buyerBidsFor(bestCents: number) {
    const notify = vi.fn(async () => ({}));
    const prisma = {
      buyerBid: { findUnique: vi.fn(async () => ({ id: 'r1', buyerId: 'b1', status: 'open', mode: 'auction', qtyUnit: 'MT', reference: 'BID-1', deadline: null, auctionEndsAt: null })) },
      sellerBid: {
        findFirst: vi.fn(async () => ({ priceCents: bestCents, sellerId: 's-other' })),
        create: vi.fn(async ({ data }: { data: unknown }) => data),
      },
    };
    const svc = new BuyerBidsService(prisma as never, { create: notify } as never, {} as never, {} as never);
    vi.spyOn(svc, 'detail').mockResolvedValue({} as never);
    return { svc, prisma, notify };
  }

  it('accepts a quote ABOVE the standing best, and does not tell the leader they were undercut', async () => {
    const { svc, prisma, notify } = buyerBidsFor(50_000); // best is $500

    await svc.submitBid('r1', { id: 's2', role: 'seller' } as never, { priceCents: 60_000, qtyValue: 10 } as never);

    expect(prisma.sellerBid.create).toHaveBeenCalled();
    const types = notify.mock.calls.map((c) => (c[0] as { type: string }).type);
    expect(types).toContain('buyer_bid.new_seller_bid');
    expect(types).not.toContain('buyer_bid.outbid');
  });

  it('tells the previous leader only when the new quote actually undercuts', async () => {
    const { svc, notify } = buyerBidsFor(50_000);

    await svc.submitBid('r1', { id: 's2', role: 'seller' } as never, { priceCents: 40_000, qtyValue: 10 } as never);

    const types = notify.mock.calls.map((c) => (c[0] as { type: string }).type);
    expect(types).toContain('buyer_bid.outbid');
  });
});
