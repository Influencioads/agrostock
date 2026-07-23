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
    const svc = new TransportService(prisma as never, {} as never, {} as never, notifications as never);
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
