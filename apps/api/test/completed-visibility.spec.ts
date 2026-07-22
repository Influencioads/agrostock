import { describe, expect, it, vi } from 'vitest';
import { AuctionsService } from '../src/auctions/auctions.module';
import { BuyerBidsService } from '../src/buyer-bids/buyer-bids.module';
import { ProductsService } from '../src/products/products.module';

const PAST = new Date(Date.now() - 60_000);
const FUTURE = new Date(Date.now() + 60_000);

const seller = { id: 'seller1', role: 'seller' } as never;
const bidder = { id: 'bidder1', role: 'buyer' } as never;
const stranger = { id: 'stranger1', role: 'buyer' } as never;
const admin = { id: 'admin1', role: 'admin', roles: ['admin'] } as never;

// ── seller-side ascending auctions ───────────────────────────────

function auctionsFor(product: Record<string, unknown>, opts: { bidderIds?: string[]; autoBidderIds?: string[] } = {}) {
  const bidderIds = opts.bidderIds ?? [];
  const prisma = {
    product: { findUnique: vi.fn(async () => product), findMany: vi.fn(async () => []) },
    auctionBid: {
      findFirst: vi.fn(async ({ where }: never) => {
        // Doubles as the participant probe (filtered by bidderId) and the
        // top-bid lookup (not) — only the probe cares about the id.
        const w = where as { bidderId?: string };
        if (w.bidderId) return bidderIds.includes(w.bidderId) ? { id: 'ab1' } : null;
        return null;
      }),
      count: vi.fn(async () => bidderIds.length),
      groupBy: vi.fn(async () => []),
      findMany: vi.fn(async () => []),
    },
    auctionAutoBid: {
      findFirst: vi.fn(async ({ where }: never) =>
        (opts.autoBidderIds ?? []).includes((where as { bidderId: string }).bidderId) ? { maxCents: 1 } : null,
      ),
      findUnique: vi.fn(async () => null),
    },
  };
  return { svc: new AuctionsService(prisma as never, {} as never), prisma };
}

const liveLot = { id: 'p1', slug: 'lot', isAuction: true, sellerId: 'seller1', auctionEndsAt: FUTURE, seller: {}, translations: [] };
const endedLot = { ...liveLot, auctionEndsAt: PAST };

describe('completed auctions leave the public surface', () => {
  it('omits ended lots from the public board', async () => {
    const { svc, prisma } = auctionsFor(liveLot);

    await svc.list();

    const { where } = prisma.product.findMany.mock.calls[0][0] as never as { where: Record<string, unknown> };
    expect(where).toMatchObject({ isAuction: true, approved: true });
    expect(where.OR).toEqual([{ auctionEndsAt: null }, { auctionEndsAt: { gt: expect.any(Date) } }]);
  });

  it('keeps open-ended lots (no countdown) on the board', async () => {
    const { svc } = auctionsFor({ ...liveLot, auctionEndsAt: null });
    await expect(svc.detail('lot', stranger)).resolves.toBeTruthy();
  });

  it('404s an ended lot for a stranger and for a logged-out visitor', async () => {
    const { svc } = auctionsFor(endedLot);

    await expect(svc.detail('lot', stranger)).rejects.toThrow(/not found/i);
    await expect(svc.detail('lot', undefined)).rejects.toThrow(/not found/i);
    await expect(svc.bids('lot', stranger)).rejects.toThrow(/not found/i);
  });

  it('still serves an ended lot to the seller, an admin and anyone who bid', async () => {
    const { svc } = auctionsFor(endedLot, { bidderIds: ['bidder1'] });

    await expect(svc.detail('lot', seller)).resolves.toMatchObject({ isOwner: true });
    await expect(svc.detail('lot', admin)).resolves.toMatchObject({ isOwner: true });
    await expect(svc.detail('lot', bidder)).resolves.toBeTruthy();
    await expect(svc.bids('lot', bidder)).resolves.toEqual([]);
  });

  it('treats a standing proxy ceiling as participation', async () => {
    const { svc } = auctionsFor(endedLot, { autoBidderIds: ['bidder1'] });
    await expect(svc.detail('lot', bidder)).resolves.toBeTruthy();
  });
});

// ── buyer-side requirements (RFQ / reverse auction) ──────────────

function buyerBidsFor(buyerBid: Record<string, unknown>, participantIds: string[] = []) {
  const prisma = {
    buyerBid: { findUnique: vi.fn(async () => buyerBid) },
    sellerBid: {
      findFirst: vi.fn(async ({ where }: never) => {
        const w = where as { sellerId?: string };
        if (w.sellerId) return participantIds.includes(w.sellerId) ? { id: 'sb1' } : null;
        return null;
      }),
      findMany: vi.fn(async () => []),
      groupBy: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
  };
  return { svc: new BuyerBidsService(prisma as never, {} as never, {} as never), prisma };
}

const openReq = {
  id: 'b1', buyerId: 'buyer1', status: 'open', mode: 'auction',
  deadline: null, auctionEndsAt: FUTURE,
  title: 't', productName: 'p', notes: null, translations: [],
};
const buyer = { id: 'buyer1', role: 'buyer' } as never;

describe('completed requirements are owner-scoped', () => {
  for (const [label, patch] of [
    ['awarded', { status: 'awarded' }],
    ['cancelled', { status: 'cancelled' }],
    ['past its auction clock', { auctionEndsAt: PAST }],
    ['past its deadline', { deadline: PAST, auctionEndsAt: null }],
  ] as const) {
    it(`404s a requirement that is ${label} for a stranger`, async () => {
      const { svc } = buyerBidsFor({ ...openReq, ...patch });

      await expect(svc.detail('b1', stranger)).rejects.toThrow(/not found/i);
      await expect(svc.detail('b1', undefined)).rejects.toThrow(/not found/i);
      await expect(svc.bids('b1', stranger)).rejects.toThrow(/not found/i);
    });
  }

  it('still serves an awarded requirement to the buyer, an admin and a seller who bid', async () => {
    const { svc } = buyerBidsFor({ ...openReq, status: 'awarded' }, ['seller1']);

    await expect(svc.detail('b1', buyer)).resolves.toMatchObject({ isOwner: true });
    await expect(svc.detail('b1', admin)).resolves.toMatchObject({ isOwner: true });
    await expect(svc.detail('b1', seller)).resolves.toMatchObject({ isOwner: false });
  });

  it('leaves an open requirement readable by anyone', async () => {
    const { svc } = buyerBidsFor(openReq);
    await expect(svc.detail('b1', stranger)).resolves.toBeTruthy();
    await expect(svc.detail('b1', undefined)).resolves.toBeTruthy();
  });
});

// ── browse grid ──────────────────────────────────────────────────

describe('ProductsService browse', () => {
  it('excludes lots whose countdown has run out', async () => {
    const prisma = {
      product: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
      subcategory: { findMany: vi.fn(async () => []) },
      $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const svc = new ProductsService(prisma as never, {} as never);

    await svc.findAll({});

    const { where } = prisma.product.findMany.mock.calls[0][0] as never as { where: Record<string, unknown> };
    expect(where.NOT).toEqual({ isAuction: true, auctionEndsAt: { lte: expect.any(Date) } });
  });
});
