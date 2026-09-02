import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { DealCommissionService } from '../src/billing/deal-commission.module';

/**
 * The competitive-bidding take: 1% owed by an auction seller, 0.5% added on top
 * for a buyer who wins a bid. Money the platform bills people for, so the
 * rounding direction and the double-charge guard are both pinned here.
 */

const settings = (auctionBps: number, buyerBidBps: number) => ({
  billingSettings: { upsert: vi.fn(async () => ({ auctionCommissionBps: auctionBps, buyerBidCommissionBps: buyerBidBps })) },
});

describe('DealCommissionService.fee', () => {
  it('takes 0.5% of an awarded bid and 1% of a won lot', () => {
    // $1,000.00 goods → $5.00 buyer fee, $10.00 seller fee.
    expect(DealCommissionService.fee(100_000, 50)).toBe(500);
    expect(DealCommissionService.fee(100_000, 100)).toBe(1_000);
  });

  it('rounds DOWN, so a fee can never exceed the goods by a rounding cent', () => {
    // 0.5% of $9.99 is 4.995 cents — the half-cent is the platform's to lose.
    expect(DealCommissionService.fee(999, 50)).toBe(4);
    expect(DealCommissionService.fee(199, 100)).toBe(1);
  });

  it('is off at a zero rate — that is how an admin disables one', () => {
    expect(DealCommissionService.fee(100_000, 0)).toBe(0);
    expect(DealCommissionService.fee(100_000, -5)).toBe(0);
  });

  it('never charges on a non-positive base, and never more than the base', () => {
    expect(DealCommissionService.fee(0, 100)).toBe(0);
    expect(DealCommissionService.fee(-100, 100)).toBe(0);
    // A nonsense 200% rate still cannot bill more than the goods were worth.
    expect(DealCommissionService.fee(1_000, 20_000)).toBe(1_000);
  });
});

describe('DealCommissionService.rates', () => {
  it('reads both rates off the billing singleton so an admin edit lands immediately', async () => {
    const prisma = settings(100, 50);
    const svc = new DealCommissionService(prisma as never);
    expect(await svc.rates()).toEqual({ auctionBps: 100, buyerBidBps: 50 });
  });
});

describe('DealCommissionService.record', () => {
  const charge = {
    kind: 'auction' as const,
    ref: 'auction:lot-1',
    payerId: 'seller-1',
    baseCents: 100_000,
    rateBps: 100,
    amountCents: 1_000,
  };

  it('writes what is owed and returns the amount', async () => {
    const create = vi.fn(async () => ({}));
    const svc = new DealCommissionService(settings(100, 50) as never);
    const recorded = await svc.record({ commissionCharge: { create } } as never, charge);

    expect(recorded).toBe(1_000);
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].data).toMatchObject({ ref: 'auction:lot-1', payerId: 'seller-1', amountCents: 1_000 });
  });

  it('writes nothing at all when the rate produced no fee', async () => {
    const create = vi.fn(async () => ({}));
    const svc = new DealCommissionService(settings(0, 0) as never);
    const recorded = await svc.record({ commissionCharge: { create } } as never, { ...charge, amountCents: 0 });

    expect(recorded).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('swallows a replayed settlement instead of charging the same deal twice', async () => {
    // A manual auction close racing the 5-minute cron: `ref` is unique, so the
    // second write collides. That must be a no-op, not a 500 and not a
    // double charge.
    const create = vi.fn(async () => {
      throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
    });
    const svc = new DealCommissionService(settings(100, 50) as never);

    await expect(svc.record({ commissionCharge: { create } } as never, charge)).resolves.toBe(0);
  });

  it('still surfaces a genuine database failure', async () => {
    const create = vi.fn(async () => {
      throw new Error('connection reset');
    });
    const svc = new DealCommissionService(settings(100, 50) as never);

    await expect(svc.record({ commissionCharge: { create } } as never, charge)).rejects.toThrow('connection reset');
  });
});
