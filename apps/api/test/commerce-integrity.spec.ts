import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../src/orders/orders.module';
import { TransportService } from '../src/transport/transport.module';

/**
 * F11 (order idempotency) and F15 (single conditional winner on quote/RFQ
 * acceptance): a retry/double-tap must not create a duplicate order/trip.
 */

describe('order placement idempotency (F11)', () => {
  it('a retry with the same idempotency key returns the original order', async () => {
    const prior = { id: 'o1', reference: 'AG-XYZ', idempotencyKey: 'key-1' };
    const create = vi.fn();
    const prisma = {
      order: {
        findUnique: vi.fn(async ({ where }: { where: { idempotencyKey?: string } }) => (where.idempotencyKey === 'key-1' ? prior : null)),
        create,
      },
      product: { findUnique: vi.fn(async () => null) },
    };
    const svc = new OrdersService(prisma as never, {} as never, {} as never, {} as never);
    const out = await svc.place('b1', { productSlug: 'x', qty: 2, idempotencyKey: 'key-1' });
    expect(out).toBe(prior);
    // Short-circuited before touching the product or creating anything.
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  // BL-11: a concurrent retry that LOSES the unique-index race (no prior found on
  // the pre-check, then create throws P2002) must return the winner's order, not
  // surface the constraint error the retry was meant to absorb.
  it('a lost idempotency-key race returns the winner order on P2002', async () => {
    const live = { id: 'p1', slug: 'x', status: 'live', approved: true, sellerId: 's1', isAuction: false, priceCents: 1000, stockQty: null };
    const winner = { id: 'o-win', reference: 'AG-WIN', idempotencyKey: 'key-2' };
    let priorExists = false; // pre-check sees nothing; the winning insert lands mid-flight
    const prisma = {
      order: {
        findUnique: vi.fn(async () => (priorExists ? winner : null)),
        create: vi.fn(async () => { throw Object.assign(new Error('unique'), { code: 'P2002' }); }),
      },
      product: { findUnique: vi.fn(async () => live) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = { order: { create: prisma.order.create }, $executeRaw: vi.fn() };
        try { return await fn(tx); } finally { priorExists = true; }
      }),
    };
    const svc = new OrdersService(prisma as never, {} as never, {} as never, {} as never);
    const out = await svc.place('b1', { productSlug: 'x', qty: 1, idempotencyKey: 'key-2' });
    expect(out).toBe(winner);
  });

  // BL-15: a seller who also holds a buyer role cannot order their own listing.
  it('rejects a self-purchase', async () => {
    const live = { id: 'p1', slug: 'x', status: 'live', approved: true, sellerId: 'b1', isAuction: false, priceCents: 1000, stockQty: null };
    const prisma = {
      order: { findUnique: vi.fn(async () => null), create: vi.fn() },
      product: { findUnique: vi.fn(async () => live) },
    };
    const svc = new OrdersService(prisma as never, {} as never, {} as never, {} as never);
    await expect(svc.place('b1', { productSlug: 'x', qty: 1 })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});

describe('transport quote acceptance is a single winner (F15)', () => {
  function build(reqStatus = 'open', quoteStatus = 'pending') {
    let rs = reqStatus;
    let qs = quoteStatus;
    const prisma = {
      transportQuote: {
        findUnique: vi.fn(async () => ({
          id: 'q1',
          status: qs,
          requestId: 'r1',
          transporterId: 't1',
          request: { id: 'r1', createdById: 'u1', fromCity: 'A', toCity: 'B', cargo: 'grain' },
        })),
        updateMany: vi.fn(async ({ where }: { where: { status?: string; id?: unknown } }) => {
          if (where.id && typeof where.id === 'object') return { count: 0 }; // reject-losers ({ not: quoteId })
          if (where.status === 'pending' && qs === 'pending') { qs = 'accepted'; return { count: 1 }; }
          return { count: 0 };
        }),
      },
      transportRequest: {
        updateMany: vi.fn(async ({ where }: { where: { status?: { in: string[] } } }) => {
          if (where.status && rs !== 'assigned') { rs = 'assigned'; return { count: 1 }; }
          return { count: 0 };
        }),
      },
      trip: { create: vi.fn(async () => ({ id: 'trip1', reference: 'TR-1', fromCity: 'A', toCity: 'B' })) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };
    const notifications = { create: vi.fn(async () => {}) };
    const svc = new TransportService(prisma as never, {} as never, notifications as never);
    return { svc, prisma };
  }

  it('creates exactly one trip on the winning accept', async () => {
    const { svc, prisma } = build();
    const trip = await svc.acceptQuote('q1', 'u1');
    expect(trip).toMatchObject({ id: 'trip1' });
    expect(prisma.trip.create).toHaveBeenCalledTimes(1);
  });

  it('a second accept whose request is already assigned bails without a trip', async () => {
    const { svc, prisma } = build('assigned', 'pending');
    await expect(svc.acceptQuote('q1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.trip.create).not.toHaveBeenCalled();
  });

  it('rejects accepting a quote that is no longer pending', async () => {
    const { svc } = build('open', 'accepted');
    await expect(svc.acceptQuote('q1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
