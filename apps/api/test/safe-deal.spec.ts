import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  assertSafeDealSettlement,
  requireSafeDeal,
  resolveListingSafeDeal,
} from '../src/products/safe-deal';

/**
 * Safe Deal is mandatory on auctions and bids. These cover the rule at the
 * service layer, which is where it has to hold: the UI toggles are gone, but a
 * hand-rolled request or an older mobile build can still send `safeDeal: false`.
 */
describe('requireSafeDeal', () => {
  it('accepts an omitted flag — the ordinary path once the toggle is gone', () => {
    expect(requireSafeDeal(undefined)).toBe(true);
    expect(requireSafeDeal(null)).toBe(true);
  });

  it('accepts an explicit opt-in', () => {
    expect(requireSafeDeal(true)).toBe(true);
  });

  it('REJECTS an explicit opt-out rather than silently coercing it', () => {
    // Coercing would let an old client believe it created a direct deal.
    expect(() => requireSafeDeal(false)).toThrow(BadRequestException);
  });
});

describe('resolveListingSafeDeal', () => {
  it('forces escrow on an auction listing', () => {
    expect(resolveListingSafeDeal(undefined, true)).toBe(true);
    expect(resolveListingSafeDeal(true, true)).toBe(true);
  });

  it('rejects a seller trying to list an auction as a direct deal', () => {
    expect(() => resolveListingSafeDeal(false, true)).toThrow(BadRequestException);
  });

  it('leaves an ordinary listing to the seller — direct deals stay legal there', () => {
    expect(resolveListingSafeDeal(false, false)).toBe(false);
    expect(resolveListingSafeDeal(true, false)).toBe(true);
    // Unspecified still defaults to escrow, as it always did.
    expect(resolveListingSafeDeal(undefined, false)).toBe(true);
  });
});

describe('assertSafeDealSettlement', () => {
  it('lets an escrow-protected row settle', () => {
    expect(() => assertSafeDealSettlement({ safeDeal: true })).not.toThrow();
  });

  it('blocks settlement of a legacy direct-deal row', () => {
    // Rows written before the rule existed must not be awardable outside escrow.
    expect(() => assertSafeDealSettlement({ safeDeal: false })).toThrow(BadRequestException);
    expect(() => assertSafeDealSettlement({ safeDeal: null })).toThrow(BadRequestException);
    expect(() => assertSafeDealSettlement({})).toThrow(BadRequestException);
  });
});
