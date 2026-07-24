import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { OrdersService } from '../src/orders/orders.module';
import { HiresService } from '../src/hires/hires.module';

/**
 * Phase A regressions — the escrow settlement holes the remediation closed:
 *  BL-01 delivery releases the hold to the seller (was never settled outside disputes)
 *  BL-02 cancelling a paid order refunds the hold (dispute→cancelled stranded funds)
 *  BL-04 only the requester can release a hire budget (payee could self-pay)
 *  BL-05 the held→settled transition is the guard, so a lost race credits nobody
 */

function ordersHarness(hold: { status: string; amountCents: number } | null) {
  const escrow = { settle: vi.fn(async () => {}), hold: vi.fn(async () => {}) };
  const notifications = { create: vi.fn(async () => {}) };
  const text = { localize: vi.fn(async (s: unknown) => s), localizeMany: vi.fn(async (a: unknown[]) => a) };
  const prisma = {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(async () => ({ reference: 'AG-1' })),
    },
    trip: { update: vi.fn(async () => ({})) },
    orderEvent: { create: vi.fn(async () => ({})) },
    escrowHold: { findUnique: vi.fn(async () => hold) },
    product: { findUnique: vi.fn(async () => ({ stockQty: null })), update: vi.fn(async () => ({})) },
    $executeRaw: vi.fn(async () => 0),
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };
  const svc = new OrdersService(prisma as never, notifications as never, text as never, escrow as never);
  return { svc, prisma, escrow, notifications };
}

describe('OrdersService escrow settlement on close', () => {
  it('BL-01: a verified delivery releases the whole hold to the seller', async () => {
    const { svc, prisma, escrow } = ordersHarness({ status: 'held', amountCents: 8000 });
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1', status: 'in_transit', dispatchMode: 'platform', trip: { id: 't', transporterId: 'u1' },
      deliveryVerifiedAt: null, deliveryOtpAttempts: 0, deliveryOtp: '1234',
      buyerId: 'b1', sellerId: 's1', reference: 'AG-1', productId: null, qtyValue: null,
    });
    await svc.verifyDelivery('o1', { id: 'u1', role: 'transporter', roles: ['transporter'] } as never, '1234');
    expect(escrow.settle).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'o1', releaseCents: 8000 }));
  });

  it('BL-02: cancelling a paid order refunds the hold to the buyer', async () => {
    const { svc, prisma, escrow } = ordersHarness({ status: 'held', amountCents: 8000 });
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1', status: 'dispute', trip: null,
      buyerId: 'b1', sellerId: 's1', reference: 'AG-1', productId: null, qtyValue: null, amountCents: 8000,
    });
    await svc.setStatus('o1', { id: 'b1', role: 'buyer', roles: ['buyer'] } as never, 'cancelled');
    expect(escrow.settle).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'o1', refundCents: 8000 }));
  });

  it('an unpaid order (no hold) closes without any settlement', async () => {
    const { svc, prisma, escrow } = ordersHarness(null);
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1', status: 'processing', trip: null,
      buyerId: 'b1', sellerId: 's1', reference: 'AG-1', productId: null, qtyValue: null, amountCents: 0,
    });
    await svc.setStatus('o1', { id: 'b1', role: 'buyer', roles: ['buyer'] } as never, 'cancelled');
    expect(escrow.settle).not.toHaveBeenCalled();
  });
});

function hiresHarness(hire: Record<string, unknown> | null, claimWins = true) {
  const wallets = { credit: vi.fn(async () => {}), debit: vi.fn(async () => {}) };
  const notifications = { create: vi.fn(async () => {}) };
  const text = {};
  const prisma = {
    hireRequest: {
      findUnique: vi.fn(async () => hire),
      findUniqueOrThrow: vi.fn(async () => hire),
      updateMany: vi.fn(async () => ({ count: claimWins ? 1 : 0 })),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };
  const svc = new HiresService(prisma as never, notifications as never, wallets as never, text as never);
  return { svc, prisma, wallets };
}

describe('HiresService completion authority', () => {
  const accepted = { id: 'h1', requesterId: 'r1', targetUserId: 't1', status: 'accepted', escrowState: 'held', budgetCents: 5000 };

  it('BL-04: the requester confirming completion pays the provider', async () => {
    const { svc, wallets } = hiresHarness(accepted);
    await svc.confirmCompletion({ id: 'r1', role: 'buyer', roles: ['buyer'] } as never, 'h1');
    expect(wallets.credit).toHaveBeenCalledWith('t1', 5000, 'escrow_release', expect.anything(), expect.anything(), 'escrow:release:hire:h1');
  });

  it('BL-04: the payee (provider) cannot release their own budget', async () => {
    const { svc, wallets } = hiresHarness(accepted);
    await expect(svc.confirmCompletion({ id: 't1', role: 'transporter', roles: ['transporter'] } as never, 'h1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(wallets.credit).not.toHaveBeenCalled();
  });

  it('BL-05: a refund that loses the held→refunded claim credits nobody', async () => {
    const { svc, wallets } = hiresHarness({ ...accepted, status: 'pending' }, false);
    // decline() runs refundEscrow; the conditional claim returns count 0 (already settled).
    await svc.decline({ id: 't1', role: 'transporter', roles: ['transporter'] } as never, 'h1').catch(() => {});
    expect(wallets.credit).not.toHaveBeenCalled();
  });
});
