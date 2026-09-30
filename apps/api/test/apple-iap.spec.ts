import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VerificationException, VerificationStatus } from '@apple/app-store-server-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppleIapService } from '../src/billing/apple/apple-iap.service';
import { appleAccountToken } from '../src/billing/apple/apple-account-token';
import { PaymentsService } from '../src/billing/payments.service';
import { SubscriptionsService } from '../src/billing/subscriptions.service';

const DAY = 864e5;
const PLANS = [
  { id: 'std', code: 'seller_standard', role: 'seller', name: 'Standard', active: true },
  { id: 'pro', code: 'seller_pro', role: 'seller', name: 'Pro', active: true },
];

function tx(over: Record<string, unknown> = {}) {
  return {
    originalTransactionId: 'orig1',
    transactionId: 't1',
    productId: 'seller_standard_monthly',
    appAccountToken: appleAccountToken('u1').toUpperCase(),
    type: 'Auto-Renewable Subscription',
    purchaseDate: Date.now() - DAY,
    expiresDate: Date.now() + 29 * DAY,
    price: 990000,
    currency: 'RUB',
    environment: 'Sandbox',
    ...over,
  };
}

function appleRow(over: Record<string, unknown> = {}) {
  return {
    id: 'sub1',
    userId: 'u1',
    role: 'seller',
    planId: 'std',
    status: 'active',
    provider: 'apple',
    appleOriginalTransactionId: 'orig1',
    currentPeriodStart: new Date(Date.now() - DAY),
    currentPeriodEnd: new Date(Date.now() + 29 * DAY),
    ...over,
  };
}

type Row = Record<string, unknown>;
type Where = { id?: string; userId_role?: { userId: string; role: string }; appleOriginalTransactionId?: string };

/** An in-memory stand-in for the Subscription/Payment tables — enough to see which rows a call touched. */
function build(...rows: Row[]) {
  const state = { subs: rows.map((r) => ({ ...r })), payments: new Map<string, Row>() };
  const find = (where: Where) =>
    state.subs.find((s) =>
      where.id
        ? s.id === where.id
        : where.userId_role
          ? s.userId === where.userId_role.userId && s.role === where.userId_role.role
          : s.appleOriginalTransactionId === where.appleOriginalTransactionId,
    );
  const prisma = {
    plan: { findUnique: vi.fn(async ({ where }: { where: { code: string } }) => PLANS.find((p) => p.code === where.code) ?? null) },
    subscription: {
      findUnique: vi.fn(async ({ where }: { where: Where }) => {
        const s = find(where);
        return s ? { ...s } : null;
      }),
      upsert: vi.fn(async ({ where, create, update }: { where: Where; create: Row; update: Row }) => {
        const s = find(where);
        if (s) return { ...Object.assign(s, update) };
        const row = { id: `sub${state.subs.length + 1}`, ...create };
        state.subs.push(row);
        return { ...row };
      }),
      update: vi.fn(async ({ where, data }: { where: Where; data: Row }) => ({ ...Object.assign(find(where)!, data) })),
      updateMany: vi.fn(async ({ where, data }: { where: { appleOriginalTransactionId: string; userId: { not: string } }; data: Row }) => {
        const hit = state.subs.filter((s) => s.appleOriginalTransactionId === where.appleOriginalTransactionId && s.userId !== where.userId.not);
        hit.forEach((s) => Object.assign(s, data));
        return { count: hit.length };
      }),
    },
    payment: {
      create: vi.fn(async ({ data }: { data: { idempotencyKey: string } }) => {
        if (state.payments.has(data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
        }
        const row = { id: `pay${state.payments.size + 1}`, ...data };
        state.payments.set(data.idempotencyKey, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { idempotencyKey: string } }) => state.payments.get(where.idempotencyKey) ?? null),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async ({ where, data }: { where: { idempotencyKey: string }; data: Row }) => {
        const p = state.payments.get(where.idempotencyKey);
        if (p) Object.assign(p, data);
        return { count: p ? 1 : 0 };
      }),
    },
    // Array form only; the mock calls above already ran in order.
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const subscriptions = { moveToFree: vi.fn(async () => undefined) };
  const notifications = { create: vi.fn(async () => undefined) };
  const svc = new AppleIapService(prisma as never, subscriptions as never, { invalidate: vi.fn() } as never, notifications as never);
  const sub = (userId = 'u1') => state.subs.find((s) => s.userId === userId);
  return { svc, prisma, state, sub, subscriptions, notifications };
}

/** Replace Apple's signature check with canned payloads — no network, no certificates. */
function stubVerifier(svc: AppleIapService, payloads: { transaction?: object; notification?: object }) {
  (svc as unknown as { verifier: () => unknown }).verifier = () => ({
    verifyAndDecodeTransaction: async () => payloads.transaction,
    verifyAndDecodeNotification: async () => payloads.notification,
    verifyAndDecodeRenewalInfo: async () => ({}),
  });
}

function notify(type: string, transaction: object, subtype?: string) {
  return { notification: { notificationType: type, subtype, data: { signedTransactionInfo: 'x.y.z' } }, transaction };
}

describe('appleAccountToken', () => {
  it('is a deterministic lowercase version-5 UUID, distinct per user', () => {
    const a = appleAccountToken('ckabc123');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(appleAccountToken('ckabc123')).toBe(a);
    expect(appleAccountToken('ckabc124')).not.toBe(a);
  });
});

describe('AppleIapService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a transaction bought under another account', async () => {
    const { svc, prisma } = build();
    stubVerifier(svc, { transaction: tx({ appAccountToken: appleAccountToken('someone-else') }) });
    await expect(svc.submitTransaction('u1', 'a.b.c')).rejects.toThrow(/different AgroTraders account/);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('refuses a payload that does not verify', async () => {
    const { svc } = build();
    (svc as unknown as { verifier: () => unknown }).verifier = () => ({
      verifyAndDecodeTransaction: async () => {
        throw new Error('bad signature');
      },
    });
    await expect(svc.submitTransaction('u1', 'a.b.c')).rejects.toBeInstanceOf(BadRequestException);
  });

  it("applies Apple's period once, however often the same transaction arrives", async () => {
    const { svc, state, sub, notifications } = build();
    const t = tx();
    stubVerifier(svc, { transaction: t });

    await svc.submitTransaction('u1', 'a.b.c');
    await svc.submitTransaction('u1', 'a.b.c');

    expect(sub()).toMatchObject({
      planId: 'std',
      status: 'active',
      provider: 'apple',
      providerToken: null,
      appleOriginalTransactionId: 'orig1',
      currentPeriodEnd: new Date(t.expiresDate),
    });
    expect(state.payments.size).toBe(1);
    // 990.000 RUB in Apple's milli-units → 99 000 kopecks.
    expect([...state.payments.values()][0]).toMatchObject({ provider: 'apple', status: 'succeeded', amountMinor: 99000 });
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('moves the matching subscription to free when its transaction is revoked', async () => {
    const t = tx({ revocationDate: Date.now() });
    const { svc, prisma, subscriptions } = build(appleRow({ currentPeriodEnd: new Date(t.expiresDate as number) }));
    await svc.applyTransaction('u1', t as never);
    expect(subscriptions.moveToFree).toHaveBeenCalledWith('u1', 'seller', 'expired');
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { idempotencyKey: 'apple:t1' },
      data: { status: 'canceled', failureReason: 'refunded' },
    });
  });

  it('never shortens the period for an older transaction', async () => {
    const later = new Date(Date.now() + 59 * DAY);
    const { svc, prisma, sub, subscriptions } = build(appleRow({ currentPeriodEnd: later }));
    await svc.applyTransaction('u1', tx({ transactionId: 't0', purchaseDate: Date.now() - 20 * DAY, expiresDate: Date.now() + 10 * DAY }) as never);
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(subscriptions.moveToFree).not.toHaveBeenCalled();
    expect(sub()).toMatchObject({ currentPeriodEnd: later });
  });

  it('applies an upgrade to a higher tier on a shorter cycle at once', async () => {
    const { svc, sub } = build(
      appleRow({ cycle: 'yearly', currentPeriodStart: new Date(Date.now() - 65 * DAY), currentPeriodEnd: new Date(Date.now() + 300 * DAY) }),
    );
    const t = tx({ transactionId: 't2', productId: 'seller_pro_monthly', purchaseDate: Date.now(), expiresDate: Date.now() + 30 * DAY });
    await svc.applyTransaction('u1', t as never);
    expect(sub()).toMatchObject({ planId: 'pro', cycle: 'monthly', currentPeriodEnd: new Date(t.expiresDate) });
  });

  it('hands a shared Apple ID subscription to the account that bought last', async () => {
    const { svc, sub, subscriptions } = build(appleRow({ userId: 'uA', status: 'expired', currentPeriodEnd: new Date(Date.now() - DAY) }));
    stubVerifier(svc, { transaction: tx({ transactionId: 't2', appAccountToken: appleAccountToken('uB') }) });
    await svc.submitTransaction('uB', 'a.b.c');
    expect(sub('uB')).toMatchObject({ status: 'active', appleOriginalTransactionId: 'orig1' });
    expect(sub('uA')).toMatchObject({ appleOriginalTransactionId: null });
    // Already expired: no second "downgraded" notice.
    expect(subscriptions.moveToFree).not.toHaveBeenCalled();
  });

  it('leaves a holder that moved to a card gateway on its plan, clearing only the stale Apple id', async () => {
    const { svc, sub, subscriptions } = build(appleRow({ userId: 'uA', provider: 'yookassa' }));
    stubVerifier(svc, { transaction: tx({ transactionId: 't2', appAccountToken: appleAccountToken('uB') }) });
    await svc.submitTransaction('uB', 'a.b.c');
    expect(subscriptions.moveToFree).not.toHaveBeenCalled();
    expect(sub('uA')).toMatchObject({ status: 'active', provider: 'yookassa', appleOriginalTransactionId: null });
    expect(sub('uB')).toMatchObject({ status: 'active', appleOriginalTransactionId: 'orig1' });
  });

  it('ignores a notification bound to another account than the row holding the transaction', async () => {
    const { svc, prisma, sub, subscriptions } = build(appleRow({ userId: 'uA' }));
    stubVerifier(svc, notify('EXPIRED', tx({ appAccountToken: appleAccountToken('uB') })));
    await svc.handleNotification('a.b.c');
    expect(subscriptions.moveToFree).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(sub('uA')).toMatchObject({ status: 'active' });
  });

  it('does not re-grant a refunded plan when the pre-refund transaction is replayed', async () => {
    const t = tx();
    const { svc, state, prisma, sub } = build(
      appleRow({ status: 'expired', planId: 'free', currentPeriodStart: new Date(t.purchaseDate), currentPeriodEnd: new Date() }),
    );
    state.payments.set('apple:t1', { id: 'pay1', idempotencyKey: 'apple:t1', status: 'canceled', failureReason: 'refunded' });
    await svc.applyTransaction('u1', t as never);
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(sub()).toMatchObject({ status: 'expired', planId: 'free' });
  });

  it('restores the plan and the payment when a refund is reversed', async () => {
    const t = tx();
    const { svc, state, sub } = build(
      appleRow({ status: 'expired', planId: 'free', currentPeriodStart: new Date(t.purchaseDate), currentPeriodEnd: new Date() }),
    );
    state.payments.set('apple:t1', { id: 'pay1', idempotencyKey: 'apple:t1', status: 'canceled', failureReason: 'refunded' });
    stubVerifier(svc, notify('REFUND_REVERSED', t));
    await svc.handleNotification('a.b.c');
    expect(state.payments.get('apple:t1')).toMatchObject({ status: 'succeeded', failureReason: null });
    expect(sub()).toMatchObject({ status: 'active', planId: 'std', currentPeriodEnd: new Date(t.expiresDate) });
  });

  it('leaves a renewed row alone when an EXPIRED for an older period is retried', async () => {
    const { svc, sub, subscriptions } = build(appleRow());
    stubVerifier(svc, notify('EXPIRED', tx({ transactionId: 't0', purchaseDate: Date.now() - 31 * DAY, expiresDate: Date.now() - DAY })));
    await svc.handleNotification('a.b.c');
    expect(subscriptions.moveToFree).not.toHaveBeenCalled();
    expect(sub()).toMatchObject({ status: 'active' });
  });

  it('keeps the subscription past due, not lapsed, when the grace period runs out', async () => {
    const { svc, sub, subscriptions } = build(appleRow({ status: 'past_due' }));
    stubVerifier(svc, notify('GRACE_PERIOD_EXPIRED', tx()));
    await svc.handleNotification('a.b.c');
    expect(subscriptions.moveToFree).not.toHaveBeenCalled();
    expect(sub()).toMatchObject({ status: 'past_due' });
    expect((sub()!.currentPeriodEnd as Date).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('marks the plan as ending when auto-renew is switched off', async () => {
    const { svc, sub } = build(appleRow());
    stubVerifier(svc, notify('DID_CHANGE_RENEWAL_STATUS', tx(), 'AUTO_RENEW_DISABLED'));
    await svc.handleNotification('a.b.c');
    expect(sub()).toMatchObject({ cancelAtPeriodEnd: true, status: 'canceled' });
  });

  it('falls back to the sandbox for a notification production rejects on the app identifier', async () => {
    const { svc, sub } = build(appleRow());
    const payload = notify('DID_CHANGE_RENEWAL_STATUS', tx(), 'AUTO_RENEW_DISABLED');
    const sandbox = {
      verifyAndDecodeNotification: vi.fn(async () => payload.notification),
      verifyAndDecodeTransaction: async () => payload.transaction,
    };
    (svc as unknown as { verifier: (env: string) => unknown }).verifier = (env) =>
      env === 'Production'
        ? {
            verifyAndDecodeNotification: async () => {
              throw new VerificationException(VerificationStatus.INVALID_APP_IDENTIFIER);
            },
          }
        : sandbox;
    await svc.handleNotification('a.b.c');
    expect(sandbox.verifyAndDecodeNotification).toHaveBeenCalled();
    expect(sub()).toMatchObject({ status: 'canceled' });
  });
});

describe('PaymentsService.subscriptionIntent', () => {
  function intent(sub: Row) {
    const plans = {
      byId: async () => ({ id: 'pro', role: 'seller', name: 'Pro', active: true }),
      priceFor: async () => ({ active: true, amountMinor: 99000, currency: 'RUB' }),
    };
    const prisma = { subscription: { findUnique: async () => ({ discountPercent: 0, ...sub }) }, payment: { findUnique: async () => null } };
    const gateways = {
      credentialsFor: async () => {
        throw new Error('gateway reached');
      },
    };
    const svc = new PaymentsService(prisma as never, gateways as never, plans as never, ...([{}, {}, {}, {}, {}] as never[]));
    return svc.subscriptionIntent({ userId: 'u1', role: 'seller' as never, planId: 'pro', cycle: 'monthly', provider: 'yookassa' as never });
  }

  it("refuses card checkout while Apple is still retrying the renewal", async () => {
    await expect(intent({ provider: 'apple', status: 'past_due', currentPeriodEnd: new Date(Date.now() - 10 * DAY) })).rejects.toThrow(/App Store/);
  });

  it("allows it once Apple's 60-day retry window is over", async () => {
    await expect(intent({ provider: 'apple', status: 'past_due', currentPeriodEnd: new Date(Date.now() - 61 * DAY) })).rejects.toThrow(/gateway reached/);
  });
});

describe('SubscriptionsService', () => {
  function subs(existing: Row | null) {
    const upsert = vi.fn(async ({ update }: { update: Row }) => update);
    const prisma = { subscription: { findMany: vi.fn(async () => []), findUnique: async () => existing, upsert } };
    const plans = { byId: async () => ({ id: 'pro', role: 'seller' }) };
    const svc = new SubscriptionsService(prisma as never, plans as never, {} as never, {} as never, { invalidate: vi.fn() } as never, {} as never, {} as never);
    return { svc, prisma, upsert };
  }

  it('renewDue skips App Store subscriptions without dropping rows that have no provider', async () => {
    const { svc, prisma } = subs(null);
    await svc.renewDue();
    const where = (prisma.subscription.findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(where.OR).toEqual([{ provider: null }, { provider: { not: 'apple' } }]);
    expect(where).not.toHaveProperty('provider');
  });

  it('grant refuses to comp over a live App Store subscription', async () => {
    const { svc, upsert } = subs(appleRow());
    await expect(svc.grant({ userId: 'u1', planId: 'pro', cycle: 'monthly' })).rejects.toThrow(/live App Store subscription/);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('grant refuses while Apple is still retrying the renewal', async () => {
    const { svc, upsert } = subs(appleRow({ status: 'past_due', currentPeriodEnd: new Date(Date.now() - 10 * DAY) }));
    await expect(svc.grant({ userId: 'u1', planId: 'pro', cycle: 'monthly' })).rejects.toThrow(/live App Store subscription/);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("grant comps over it once Apple's 60-day retry window is over", async () => {
    const { svc, upsert } = subs(appleRow({ status: 'past_due', currentPeriodEnd: new Date(Date.now() - 61 * DAY) }));
    await svc.grant({ userId: 'u1', planId: 'pro', cycle: 'monthly' });
    expect(upsert.mock.calls[0][0].update).toMatchObject({ provider: null, appleOriginalTransactionId: null, status: 'active' });
  });

  it('grant turns a lapsed App Store row into a plain comp', async () => {
    const { svc, upsert } = subs(appleRow({ status: 'expired', currentPeriodEnd: new Date(Date.now() - DAY) }));
    await svc.grant({ userId: 'u1', planId: 'pro', cycle: 'monthly' });
    expect(upsert.mock.calls[0][0].update).toMatchObject({ provider: null, appleOriginalTransactionId: null, status: 'active' });
  });
});
