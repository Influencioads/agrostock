import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { EscrowService } from '../src/wallet/wallet.service';

/**
 * F06: escrow is ledger-backed. hold() debits the buyer into a per-order hold;
 * settle() releases/refunds FROM that hold. Both are idempotent on orderId, and
 * money is conserved (what the buyer was debited equals what is later paid out).
 */
function build(hold: Record<string, unknown> | null) {
  let current = hold;
  const prisma = {
    escrowHold: {
      findUnique: vi.fn(async () => current),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        current = { status: 'held', ...data };
        return current;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { status: string }; data: Record<string, unknown> }) => {
        if (current && (current as { status: string }).status === where.status) {
          current = { ...current, ...data };
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };
  const wallet = { debit: vi.fn(async () => {}), credit: vi.fn(async () => {}) };
  const svc = new EscrowService(prisma as never, wallet as never);
  return { svc, prisma, wallet, get: () => current };
}

describe('EscrowService (F06)', () => {
  it('hold debits the buyer and opens a keyed hold', async () => {
    const { svc, wallet, prisma } = build(null);
    await svc.hold({ orderId: 'o1', buyerId: 'b1', sellerId: 's1', amountCents: 8000 });
    expect(wallet.debit).toHaveBeenCalledWith('b1', 8000, 'escrow_hold', expect.anything(), expect.anything(), 'escrow:hold:o1');
    expect(prisma.escrowHold.create).toHaveBeenCalled();
  });

  it('hold is idempotent — an existing hold does not debit again', async () => {
    const { svc, wallet } = build({ orderId: 'o1', status: 'held', amountCents: 8000, buyerId: 'b1', sellerId: 's1' });
    await svc.hold({ orderId: 'o1', buyerId: 'b1', sellerId: 's1', amountCents: 8000 });
    expect(wallet.debit).not.toHaveBeenCalled();
  });

  it('release settles the full amount to the seller (conserved)', async () => {
    const { svc, wallet } = build({ orderId: 'o1', status: 'held', amountCents: 8000, buyerId: 'b1', sellerId: 's1' });
    await svc.settle({ orderId: 'o1', releaseCents: 8000 });
    expect(wallet.credit).toHaveBeenCalledWith('s1', 8000, 'escrow_release', expect.anything(), expect.anything(), 'escrow:release:o1');
    expect(wallet.credit).toHaveBeenCalledTimes(1);
  });

  it('split settlement refunds the buyer and releases the rest, never exceeding the hold', async () => {
    const { svc, wallet } = build({ orderId: 'o1', status: 'held', amountCents: 8000, buyerId: 'b1', sellerId: 's1' });
    await svc.settle({ orderId: 'o1', refundCents: 3000, releaseCents: 5000 });
    expect(wallet.credit).toHaveBeenCalledWith('b1', 3000, 'refund', expect.anything(), expect.anything(), 'escrow:refund:o1');
    expect(wallet.credit).toHaveBeenCalledWith('s1', 5000, 'escrow_release', expect.anything(), expect.anything(), 'escrow:release:o1');
  });

  it('a second settlement loses the claim and never credits again', async () => {
    const { svc, wallet } = build({ orderId: 'o1', status: 'released', amountCents: 8000, buyerId: 'b1', sellerId: 's1' });
    await expect(svc.settle({ orderId: 'o1', releaseCents: 8000 })).rejects.toBeInstanceOf(BadRequestException);
    expect(wallet.credit).not.toHaveBeenCalled();
  });

  it('settling with no hold is rejected', async () => {
    const { svc } = build(null);
    await expect(svc.settle({ orderId: 'o1', releaseCents: 100 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
