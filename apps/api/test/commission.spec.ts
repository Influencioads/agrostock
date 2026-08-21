import { describe, expect, it, vi } from 'vitest';
import { CommissionService } from '../src/wallet/commission.service';

/** Minimal prisma double: one settings row plus the user lookups. */
function build(settings: Record<string, unknown>, opts: { exempt?: boolean } = {}) {
  const prisma = {
    billingSettings: { upsert: vi.fn(async () => ({ id: 1, ...settings })) },
    user: {
      findUnique: vi.fn(async ({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) => {
        if (select?.commissionExempt !== undefined) return { commissionExempt: opts.exempt ?? false };
        return { id: where.id };
      }),
    },
  };
  return new CommissionService(prisma as never);
}

const ON = { commissionEnabled: true, orderCommissionBps: 200, escrowCommissionBps: 500, platformUserId: 'platform' };

describe('CommissionService', () => {
  it('takes nothing while commission is disabled — the shipped default', async () => {
    const svc = build({ ...ON, commissionEnabled: false });
    const cut = await svc.split({ kind: 'order', recipientId: 's1', grossCents: 100_000, ref: 'order:o1' });
    expect(cut).toMatchObject({ net: 100_000, fee: 0, platformUserId: null });
  });

  it('takes 2% on an order and 5% on an escrow job, and names the platform account', async () => {
    const order = await build(ON).split({ kind: 'order', recipientId: 's1', grossCents: 100_000, ref: 'order:o1' });
    expect(order).toMatchObject({ net: 98_000, fee: 2_000, platformUserId: 'platform', idempotencyKey: 'commission:order:order:o1' });
    expect(order.note).toContain('2.00%');

    const escrow = await build(ON).split({ kind: 'escrow', recipientId: 'p1', grossCents: 100_000, ref: 'hire:h1' });
    expect(escrow).toMatchObject({ net: 95_000, fee: 5_000, platformUserId: 'platform' });
  });

  it('conserves money: net + fee always equals the gross', async () => {
    for (const gross of [1, 99, 12_345, 100_000, 7_777_777]) {
      const cut = await build(ON).split({ kind: 'escrow', recipientId: 'p1', grossCents: gross, ref: 'hire:h1' });
      expect(cut.net + cut.fee).toBe(gross);
    }
  });

  it('exempts grandfathered accounts', async () => {
    const cut = await build(ON, { exempt: true }).split({ kind: 'order', recipientId: 's1', grossCents: 100_000, ref: 'order:o1' });
    expect(cut).toMatchObject({ net: 100_000, fee: 0, platformUserId: null });
  });

  it('pays the recipient in full rather than losing the fee when no platform account is set', async () => {
    const cut = await build({ ...ON, platformUserId: null }).split({ kind: 'order', recipientId: 's1', grossCents: 100_000, ref: 'order:o1' });
    expect(cut).toMatchObject({ net: 100_000, fee: 0, platformUserId: null });
  });

  it('rounds the fee down and never exceeds the gross', () => {
    // 1 kopeck at 2% rounds to zero rather than taking the whole amount.
    expect(CommissionService.fee(1, 200)).toBe(0);
    expect(CommissionService.fee(99, 200)).toBe(1);
    expect(CommissionService.fee(100_000, 10_000)).toBe(100_000);
    expect(CommissionService.fee(0, 500)).toBe(0);
    expect(CommissionService.fee(-500, 500)).toBe(0);
  });
});
