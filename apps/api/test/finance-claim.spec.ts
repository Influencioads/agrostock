import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from '../src/admin/admin.module';

/**
 * Exactly-once claim behaviour for the two money-moving admin decisions
 * (F08 dispute settlement, F09 payout approval). A concurrent second call must
 * lose the conditional status transition and NOT move money a second time.
 */

beforeEach(() => {
  process.env.ENABLE_LEGACY_FINANCIAL_WRITES = '1';
  process.env.NODE_ENV = 'test';
});
afterEach(() => {
  delete process.env.ENABLE_LEGACY_FINANCIAL_WRITES;
});

function build(overrides: { payoutStatus?: string; orderStatus?: string } = {}) {
  let payoutStatus = overrides.payoutStatus ?? 'pending';
  let orderStatus = overrides.orderStatus ?? 'dispute';
  const prisma = {
    payoutRequest: {
      findUnique: vi.fn(async () => ({ id: 'p1', userId: 'u1', amountCents: 5000, status: payoutStatus, note: null })),
      findUniqueOrThrow: vi.fn(async () => ({ id: 'p1', userId: 'u1', amountCents: 5000, status: payoutStatus, user: { id: 'u1', name: 'U' } })),
      updateMany: vi.fn(async ({ where }: { where: { status: string } }) => {
        // Only the first caller (status still pending) wins.
        if (where.status === 'pending' && payoutStatus === 'pending') {
          payoutStatus = 'paid';
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    order: {
      findUnique: vi.fn(async () => ({ id: 'o1', status: orderStatus, amountCents: 8000, buyerId: 'b1', sellerId: 's1' })),
      findUniqueOrThrow: vi.fn(async () => ({ id: 'o1', status: 'delivered' })),
      updateMany: vi.fn(async ({ where }: { where: { status: string } }) => {
        if (where.status === 'dispute' && orderStatus === 'dispute') {
          orderStatus = 'delivered';
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    orderEvent: { create: vi.fn(async () => ({})) },
    // No escrow hold → resolveDispute uses the legacy keyed direct-credit path.
    escrowHold: { findUnique: vi.fn(async () => null) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };
  const audit = { log: vi.fn() };
  const wallet = { credit: vi.fn(async () => {}), debit: vi.fn(async () => {}) };
  const notifications = { create: vi.fn(async () => {}) };
  const escrow = { hold: vi.fn(async () => {}), settle: vi.fn(async () => {}) };
  const svc = new AdminService(prisma as never, audit as never, wallet as never, notifications as never, escrow as never);
  return { svc, prisma, wallet, escrow };
}

describe('payout approval is claimed exactly once (F09)', () => {
  it('debits once on the winning claim', async () => {
    const { svc, wallet } = build();
    await svc.decidePayout('p1', 'approved', 'admin1');
    expect(wallet.debit).toHaveBeenCalledTimes(1);
    expect(wallet.debit).toHaveBeenCalledWith('u1', 5000, 'payout', expect.anything(), expect.anything(), 'payout:p1');
  });

  it('a second decision loses the claim and never debits', async () => {
    const { svc, wallet } = build({ payoutStatus: 'paid' });
    await expect(svc.decidePayout('p1', 'approved', 'admin2')).rejects.toThrow(/already decided/);
    expect(wallet.debit).not.toHaveBeenCalled();
  });
});

describe('dispute settlement is claimed exactly once (F08)', () => {
  it('credits on the winning claim with idempotency keys', async () => {
    const { svc, wallet } = build();
    await svc.resolveDispute('o1', { resolution: 'release_to_seller' } as never, 'admin1');
    expect(wallet.credit).toHaveBeenCalledTimes(1);
    expect(wallet.credit).toHaveBeenCalledWith('s1', 8000, 'escrow_release', expect.anything(), expect.anything(), 'dispute:o1:release');
  });

  it('a second settlement loses the claim and never credits', async () => {
    const { svc, wallet } = build({ orderStatus: 'delivered' });
    await expect(svc.resolveDispute('o1', { resolution: 'release_to_seller' } as never, 'admin2')).rejects.toThrow(/not in dispute/);
    expect(wallet.credit).not.toHaveBeenCalled();
  });
});
