import { describe, expect, it } from 'vitest';
import type { OrderStatus } from '@prisma/client';
import { ORDER_NEXT, ORDER_STEPS, nextStatusFor } from '@agrotraders/api-client';
import { ORDER_TRANSITIONS } from '../src/orders/orders.module';

/**
 * `ORDER_NEXT` in the api-client is a hand-kept copy of the server's
 * `ORDER_TRANSITIONS` — web and mobile use it to decide which buttons to show.
 * If the two drift, the UI offers moves the API will reject. Pin them together.
 */
describe('client/server order transition parity', () => {
  it('declares the same statuses', () => {
    expect(Object.keys(ORDER_NEXT).sort()).toEqual(Object.keys(ORDER_TRANSITIONS).sort());
  });

  it('declares the same edges and the same parties on each edge', () => {
    for (const status of Object.keys(ORDER_TRANSITIONS) as OrderStatus[]) {
      const server = ORDER_TRANSITIONS[status]
        .map((e) => `${e.to}:${[...e.by].sort().join('|')}`)
        .sort();
      const client = ORDER_NEXT[status]
        .map((e) => `${e.to}:${[...e.by].sort().join('|')}`)
        .sort();
      expect(client, `edges out of "${status}"`).toEqual(server);
    }
  });

  it('nextStatusFor only ever returns an edge the server would accept', () => {
    for (const status of Object.keys(ORDER_TRANSITIONS) as OrderStatus[]) {
      for (const party of ['buyer', 'seller', 'transporter'] as const) {
        const next = nextStatusFor(status, party);
        if (!next) continue;
        const allowed = ORDER_TRANSITIONS[status].some((e) => e.to === next && e.by.includes(party));
        expect(allowed, `${party}: ${status} → ${next}`).toBe(true);
      }
    }
  });

  it('never suggests a forward move into an OTP-guarded status', () => {
    for (const status of Object.keys(ORDER_TRANSITIONS) as OrderStatus[]) {
      for (const party of ['buyer', 'seller'] as const) {
        expect(['dispatched', 'in_transit', 'delivered']).not.toContain(nextStatusFor(status, party));
      }
    }
  });

  it('never offers the buyer a status-only payment transition', () => {
    expect(ORDER_NEXT.processing).not.toContainEqual(expect.objectContaining({ to: 'paid' }));
    expect(nextStatusFor('processing', 'buyer')).toBeNull();
  });

  it('ORDER_STEPS is the happy path, in order, with no dead-end statuses', () => {
    expect(ORDER_STEPS).toEqual([
      'enquiry', 'quote', 'processing', 'paid', 'packed', 'dispatched', 'in_transit', 'delivered',
    ]);
    expect(ORDER_STEPS).not.toContain('shipped');
    expect(ORDER_STEPS).not.toContain('cancelled');
  });
});
