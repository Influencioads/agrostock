import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WalletService } from '../src/wallet/wallet.service';

/**
 * In-memory wallet + ledger that reproduces the two DB guarantees the service
 * relies on: a conditional balance decrement (guarded by balanceCents >= cents)
 * and a unique idempotencyKey on the ledger rows.
 */
function db(initialBalance = 0) {
  const wallet = { id: 'w1', userId: 'u1', balanceCents: initialBalance };
  const wallets: Record<string, typeof wallet> = { u1: wallet, u2: { id: 'w2', userId: 'u2', balanceCents: 0 } };
  const txs: Array<{ walletId: string; amountCents: number; idempotencyKey: string | null }> = [];
  const byUser = (userId: string) => wallets[userId] ?? (wallets[userId] = { id: `w-${userId}`, userId, balanceCents: 0 });

  return {
    wallets,
    txs,
    wallet: {
      findUnique: vi.fn(async ({ where }: { where: { userId?: string; id?: string } }) =>
        where.userId ? (wallets[where.userId] ?? null) : Object.values(wallets).find((w) => w.id === where.id) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: { userId: string; balanceCents: number } }) => byUser(data.userId)),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { balanceCents: { increment?: number; decrement?: number } } }) => {
        const w = Object.values(wallets).find((x) => x.id === where.id)!;
        if (data.balanceCents.increment) w.balanceCents += data.balanceCents.increment;
        if (data.balanceCents.decrement) w.balanceCents -= data.balanceCents.decrement;
        return w;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; balanceCents?: { gte: number } }; data: { balanceCents: { decrement: number } } }) => {
        const w = Object.values(wallets).find((x) => x.id === where.id)!;
        if (where.balanceCents && w.balanceCents < where.balanceCents.gte) return { count: 0 };
        w.balanceCents -= data.balanceCents.decrement;
        return { count: 1 };
      }),
    },
    walletTx: {
      create: vi.fn(async ({ data }: { data: { walletId: string; amountCents: number; idempotencyKey: string | null } }) => {
        if (data.idempotencyKey && txs.some((t) => t.idempotencyKey === data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: 'x' });
        }
        txs.push({ walletId: data.walletId, amountCents: data.amountCents, idempotencyKey: data.idempotencyKey });
        return data;
      }),
    },
    $transaction: vi.fn(async function (this: unknown, fn: (tx: unknown) => Promise<unknown>) {
      return fn(this);
    }),
  };
}

function svc(store: ReturnType<typeof db>) {
  const notifications = { create: vi.fn() };
  const s = new WalletService(store as never, notifications as never);
  // transfer uses this.prisma.$transaction and passes tx = the same store
  store.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(store));
  return s;
}

describe('WalletService invariants (F08/F09)', () => {
  it('debit is overdraft-safe: rejects when balance is insufficient', async () => {
    const store = db(500);
    await expect(svc(store).debit('u1', 900, 'withdraw')).rejects.toBeInstanceOf(BadRequestException);
    expect(store.wallets.u1.balanceCents).toBe(500); // untouched
  });

  it('debit succeeds and decrements exactly once', async () => {
    const store = db(1000);
    await svc(store).debit('u1', 400, 'withdraw');
    expect(store.wallets.u1.balanceCents).toBe(600);
    expect(store.txs).toHaveLength(1);
    expect(store.txs[0].amountCents).toBe(-400);
  });

  it('a keyed credit replay does not double-apply', async () => {
    const store = db(0);
    const s = svc(store);
    await s.credit('u1', 300, 'refund', 'x', store as never, 'op-1');
    await s.credit('u1', 300, 'refund', 'x', store as never, 'op-1'); // replay
    expect(store.wallets.u1.balanceCents).toBe(300);
    expect(store.txs).toHaveLength(1);
  });

  it('transfer conserves money (debit source, credit dest, balanced)', async () => {
    const store = db(1000);
    await svc(store).transfer('u1', 'u2', 250, 'escrow_release');
    expect(store.wallets.u1.balanceCents).toBe(750);
    expect(store.wallets.u2.balanceCents).toBe(250);
    const net = store.txs.reduce((sum, t) => sum + t.amountCents, 0);
    expect(net).toBe(0); // money neither created nor destroyed
  });

  it('transfer rolls back both legs when the source cannot cover it', async () => {
    const store = db(100);
    await expect(svc(store).transfer('u1', 'u2', 500, 'escrow_release')).rejects.toBeInstanceOf(BadRequestException);
    expect(store.wallets.u1.balanceCents).toBe(100);
    expect(store.wallets.u2.balanceCents).toBe(0);
  });
});
