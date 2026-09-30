import { describe, expect, it } from 'vitest';
import { isBilledElsewhere, laddersFor, planAction, shownRoleFor } from './planLadder';

describe('laddersFor', () => {
  it('shows buyers and sellers both ladders, everyone else only their own', () => {
    expect(laddersFor('buyer', false)).toEqual(['buyer', 'seller']);
    expect(laddersFor('seller', false)).toEqual(['buyer', 'seller']);
    expect(laddersFor('transporter', false)).toEqual(['transporter']);
    expect(laddersFor('worker', false)).toEqual(['worker']);
  });

  it('never sells the buyer or worker ladder through the App Store', () => {
    expect(laddersFor('buyer', true)).toEqual(['seller']);
    expect(laddersFor('seller', true)).toEqual(['seller']);
    expect(laddersFor('worker', true)).toEqual([]);
    expect(laddersFor('transporter', true)).toEqual(['transporter']);
  });
});

describe('shownRoleFor', () => {
  it('follows the ladder on screen only when the role’s own ladder is hidden', () => {
    // iOS buyer: only the seller ladder is sold, so its plan heads the screen.
    expect(shownRoleFor('buyer', laddersFor('buyer', true), 'seller')).toBe('seller');
    expect(shownRoleFor('seller', laddersFor('seller', true), 'seller')).toBe('seller');
    // Android buyer browsing the seller ladder keeps their own plan up top.
    expect(shownRoleFor('buyer', laddersFor('buyer', false), 'seller')).toBe('buyer');
    // iOS worker: no ladder at all, so nothing to follow.
    expect(shownRoleFor('worker', laddersFor('worker', true), 'worker')).toBe('worker');
  });
});

describe('planAction', () => {
  it('routes an unheld role to Roles & Access instead of a checkout the API would refuse', () => {
    expect(planAction(1, undefined)).toBe('addRole');
  });

  it('offers checkout only above the current tier', () => {
    expect(planAction(2, { tier: 1 })).toBe('choose');
    expect(planAction(1, { tier: 1 })).toBe('none');
    expect(planAction(0, { tier: 1 })).toBe('none');
  });

  it('offers no checkout while the held plan is billed through the other channel', () => {
    expect(planAction(2, { tier: 1 }, true)).toBe('none');
    expect(planAction(2, { tier: 1 }, false)).toBe('choose');
    // Adding a role charges nothing, so it stays open either way.
    expect(planAction(1, undefined, true)).toBe('addRole');
  });
});

describe('isBilledElsewhere', () => {
  const now = Date.parse('2026-09-29T00:00:00Z');
  const day = 24 * 3600e3;
  const sub = (provider: string | null, status: string, endInDays: number) => ({
    provider,
    status,
    currentPeriodEnd: new Date(now + endInDays * day).toISOString(),
  });

  it('on iOS, blocks only a running paid gateway plan', () => {
    expect(isBilledElsewhere(sub('yookassa', 'active', 10), 1, true, now)).toBe(true);
    expect(isBilledElsewhere(sub('yookassa', 'canceled', 10), 1, true, now)).toBe(true);
    // An admin grant has no provider: nothing renews it, so upgrading is safe.
    expect(isBilledElsewhere(sub(null, 'active', 10), 1, true, now)).toBe(false);
    expect(isBilledElsewhere(sub('apple', 'active', 10), 1, true, now)).toBe(false);
    expect(isBilledElsewhere(sub('yookassa', 'active', -1), 1, true, now)).toBe(false);
    expect(isBilledElsewhere(sub('yookassa', 'active', 10), 0, true, now)).toBe(false);
    expect(isBilledElsewhere(undefined, 1, true, now)).toBe(false);
  });

  it('on Android, blocks an App Store plan the API would refuse a card checkout for', () => {
    expect(isBilledElsewhere(sub('apple', 'active', 10), 1, false, now)).toBe(true);
    expect(isBilledElsewhere(sub('apple', 'canceled', 10), 1, false, now)).toBe(true);
    // Past due reads tier 0 and a lapsed period, but Apple is still retrying.
    expect(isBilledElsewhere(sub('apple', 'past_due', -10), 0, false, now)).toBe(true);
    expect(isBilledElsewhere(sub('apple', 'past_due', -61), 0, false, now)).toBe(false);
    expect(isBilledElsewhere(sub('apple', 'canceled', -1), 0, false, now)).toBe(false);
    expect(isBilledElsewhere(sub('apple', 'expired', 10), 0, false, now)).toBe(false);
    expect(isBilledElsewhere(sub('yookassa', 'active', 10), 1, false, now)).toBe(false);
    expect(isBilledElsewhere(sub(null, 'active', 10), 1, false, now)).toBe(false);
  });
});
