import { describe, expect, it } from 'vitest';
import type { OrderStatus } from '@prisma/client';
import { ORDER_TRANSITIONS, type OrderParty } from '../src/orders/orders.module';

/** Is `to` reachable from `from` by `party` via PATCH /orders/:id/status? */
const can = (from: OrderStatus, to: OrderStatus, party: OrderParty) =>
  ORDER_TRANSITIONS[from].some((e) => e.to === to && e.by.includes(party));

/** Any party at all. */
const reachable = (from: OrderStatus, to: OrderStatus) =>
  ORDER_TRANSITIONS[from].some((e) => e.to === to);

describe('order state machine', () => {
  it('walks the happy path with the right party driving each edge', () => {
    expect(can('enquiry', 'quote', 'seller')).toBe(true);
    expect(can('quote', 'processing', 'buyer')).toBe(true);
    expect(can('processing', 'paid', 'buyer')).toBe(true);
    expect(can('paid', 'packed', 'seller')).toBe(true);
  });

  it('never exposes the OTP-guarded statuses to a plain status PATCH', () => {
    // dispatched/in_transit/delivered are owned by the dispatch + verify
    // endpoints; letting PATCH reach them would bypass the OTP handshake.
    // There is no exception — an admin bypasses the table entirely.
    const guarded: OrderStatus[] = ['dispatched', 'in_transit', 'delivered'];
    const froms = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];
    for (const from of froms) {
      for (const to of guarded) {
        expect(reachable(from, to), `${from} → ${to} must not be PATCHable`).toBe(false);
      }
    }
  });

  it('rejects the wrong party on each happy-path edge', () => {
    expect(can('enquiry', 'quote', 'buyer')).toBe(false);
    expect(can('quote', 'processing', 'seller')).toBe(false);
    expect(can('processing', 'paid', 'seller')).toBe(false);
    expect(can('paid', 'packed', 'buyer')).toBe(false);
  });

  it('rejects skipping stages', () => {
    expect(reachable('enquiry', 'paid')).toBe(false);
    expect(reachable('enquiry', 'processing')).toBe(false);
    expect(reachable('quote', 'packed')).toBe(false);
    expect(reachable('processing', 'delivered')).toBe(false);
  });

  it('treats delivered and cancelled as terminal', () => {
    expect(ORDER_TRANSITIONS.delivered).toEqual([]);
    expect(ORDER_TRANSITIONS.cancelled).toEqual([]);
  });

  it('lets either trading party open a dispute while goods are in flight', () => {
    for (const from of ['processing', 'paid', 'packed', 'dispatched', 'in_transit'] as OrderStatus[]) {
      expect(can(from, 'dispute', 'buyer'), `${from} → dispute (buyer)`).toBe(true);
      expect(can(from, 'dispute', 'seller'), `${from} → dispute (seller)`).toBe(true);
    }
  });

  it('does not let a transporter cancel or dispute an order', () => {
    const froms = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];
    for (const from of froms) {
      expect(can(from, 'cancelled', 'transporter'), `${from} → cancelled`).toBe(false);
      expect(can(from, 'dispute', 'transporter'), `${from} → dispute`).toBe(false);
    }
  });

  it('offers no forward edge out of packed — dispatch is the only way on', () => {
    const forward = ORDER_TRANSITIONS.packed.filter((e) => e.to !== 'dispute' && e.to !== 'cancelled');
    expect(forward).toEqual([]);
  });

  it('covers every OrderStatus so a new value cannot silently have no rules', () => {
    const declared: OrderStatus[] = [
      'enquiry', 'quote', 'processing', 'paid', 'packed', 'dispatched',
      'shipped', 'in_transit', 'delivered', 'dispute', 'cancelled',
    ];
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual([...declared].sort());
  });
});
