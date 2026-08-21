import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntitlementsService } from '../src/billing/entitlements.service';

interface Opts {
  quotasEnforced?: boolean;
  sub?: Record<string, unknown> | null;
  freeLimits?: Record<string, number | null>;
  counts?: Record<string, number>;
  addons?: number;
}

function build(opts: Opts = {}) {
  const counts = opts.counts ?? {};
  const prisma = {
    billingSettings: { upsert: vi.fn(async () => ({ id: 1, quotasEnforced: opts.quotasEnforced ?? true })) },
    user: { findUnique: vi.fn(async () => ({ role: 'seller', roles: [] })) },
    subscription: { findMany: vi.fn(async () => (opts.sub ? [opts.sub] : [])) },
    plan: {
      findMany: vi.fn(async () => [
        {
          id: 'free',
          code: 'seller_basic',
          role: 'seller',
          tier: 0,
          name: 'Basic',
          limits: opts.freeLimits ?? { activeListings: 5, auctionLotsPerMonth: 1 },
          features: {},
        },
      ]),
    },
    addonPurchase: { count: vi.fn(async () => opts.addons ?? 0) },
    product: {
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        where.isAuction ? (counts.auctions ?? 0) : (counts.listings ?? 0),
      ),
    },
    buyerBid: { count: vi.fn(async () => counts.rfqs ?? 0) },
    vehicle: { count: vi.fn(async () => counts.vehicles ?? 0) },
    driver: { count: vi.fn(async () => counts.drivers ?? 0) },
    worker: { count: vi.fn(async () => 0) },
    providerService: { count: vi.fn(async () => counts.services ?? 0) },
    hireRequest: { count: vi.fn(async () => 0) },
    transportQuote: { count: vi.fn(async () => 0) },
    profile: { findUnique: vi.fn(async () => ({ operatingCities: ['a', 'b'] })) },
    serviceProvider: { findUnique: vi.fn(async () => null) },
  };
  return { svc: new EntitlementsService(prisma as never), prisma };
}

const SELLER = 'seller' as never;

const PAID = {
  id: 'sub1',
  role: 'seller',
  planId: 'std',
  status: 'active',
  currentPeriodStart: new Date(Date.now() - 864e5),
  currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
  cancelAtPeriodEnd: false,
  plan: {
    id: 'std',
    code: 'seller_standard',
    role: 'seller',
    tier: 1,
    name: 'Standard',
    limits: { activeListings: 50 },
    features: { verifiedBadge: true },
  },
};

describe('EntitlementsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('falls back to the free tier when there is no subscription', async () => {
    const { svc } = build();
    expect(await svc.forRole('u1', SELLER)).toMatchObject({ planCode: 'seller_basic', tier: 0, status: 'free' });
  });

  it('uses the paid plan while the period is live', async () => {
    const { svc } = build({ sub: PAID });
    expect(await svc.forRole('u1', SELLER)).toMatchObject({ planCode: 'seller_standard', tier: 1 });
    expect(await svc.feature('u1', SELLER, 'verifiedBadge')).toBe(true);
  });

  it('does NOT honour a subscription whose period has already ended', async () => {
    // The renewal cron may not have run yet; a lapsed period must not buy a free month.
    const { svc } = build({ sub: { ...PAID, currentPeriodEnd: new Date(Date.now() - 1000) } });
    expect(await svc.forRole('u1', SELLER)).toMatchObject({ planCode: 'seller_basic', tier: 0 });
  });

  it('blocks the write that would exceed the quota, and allows the one below it', async () => {
    const at = build({ counts: { listings: 5 } });
    await expect(at.svc.assertWithin('u1', SELLER, 'activeListings')).rejects.toBeInstanceOf(ForbiddenException);

    const under = build({ counts: { listings: 4 } });
    await expect(under.svc.assertWithin('u1', SELLER, 'activeListings')).resolves.toBeUndefined();
  });

  it('carries the numbers in the error so the client can render an upsell', async () => {
    expect.assertions(1);
    const { svc } = build({ counts: { listings: 5 } });
    await svc.assertWithin('u1', SELLER, 'activeListings').catch((e: ForbiddenException) => {
      expect(e.getResponse()).toMatchObject({
        code: 'QUOTA_EXCEEDED',
        quota: { key: 'activeListings', limit: 5, used: 5 },
      });
    });
  });

  it('counts a bulk add as N, not 1 — otherwise one call bypasses the quota', async () => {
    const { svc } = build({ counts: { services: 0 }, freeLimits: { pricedServices: 3 } });
    await expect(svc.assertWithin('u1', SELLER, 'pricedServices', 3)).resolves.toBeUndefined();
    await expect(svc.assertWithin('u1', SELLER, 'pricedServices', 4)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('adds purchased add-on slots on top of the plan limit', async () => {
    const { svc } = build({ counts: { listings: 5 }, addons: 2 });
    expect(await svc.limit('u1', SELLER, 'activeListings')).toBe(7);
    await expect(svc.assertWithin('u1', SELLER, 'activeListings')).resolves.toBeUndefined();
  });

  it('treats null as unlimited, not zero', async () => {
    const { svc } = build({ freeLimits: { activeListings: null }, counts: { listings: 9999 } });
    expect(await svc.limit('u1', SELLER, 'activeListings')).toBeNull();
    await expect(svc.assertWithin('u1', SELLER, 'activeListings')).resolves.toBeUndefined();
  });

  it('treats zero as a real block', async () => {
    const { svc } = build({ freeLimits: { driverAccounts: 0 } });
    await expect(svc.assertWithin('u1', SELLER, 'driverAccounts')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets everything through while the master switch is off (Phase 0)', async () => {
    const { svc } = build({ quotasEnforced: false, counts: { listings: 500 } });
    await expect(svc.assertWithin('u1', SELLER, 'activeListings')).resolves.toBeUndefined();
  });

  it('does not fake a block for a quota nothing counts yet', async () => {
    const { svc } = build({ freeLimits: { savedSearches: 3 } });
    expect(await svc.usageOf('u1', SELLER, 'savedSearches')).toBeNull();
    await expect(svc.assertWithin('u1', SELLER, 'savedSearches', 99)).resolves.toBeUndefined();
  });

  it('caps a scalar array by its resulting length', async () => {
    const { svc } = build({ freeLimits: { serviceAreas: 1 } });
    await expect(svc.assertArrayWithin('u1', SELLER, 'serviceAreas', 1)).resolves.toBeUndefined();
    await expect(svc.assertArrayWithin('u1', SELLER, 'serviceAreas', 2)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reports meters, flagging which keys are actually enforced', async () => {
    const { svc } = build({ freeLimits: { activeListings: 5, savedSearches: 3 }, counts: { listings: 2 } });
    expect(await svc.usage('u1', SELLER)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'activeListings', used: 2, limit: 5, enforced: true }),
        expect.objectContaining({ key: 'savedSearches', enforced: false }),
      ]),
    );
  });

  it('invalidate drops the cache so an upgrade takes effect at once', async () => {
    const { svc, prisma } = build();
    await svc.resolve('u1');
    await svc.resolve('u1');
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    svc.invalidate('u1');
    await svc.resolve('u1');
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
  });
});
