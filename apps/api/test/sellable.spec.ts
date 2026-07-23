import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { assertProductSellable, resolveUnitPriceCents, sellableWhere } from '../src/products/sellable';

const live = { status: 'live', approved: true, sellerId: 's1', isAuction: false, auctionEndsAt: null };

describe('assertProductSellable (F04)', () => {
  it('allows a live, seller-owned listing', () => {
    expect(() => assertProductSellable(live)).not.toThrow();
  });

  it.each(['pending', 'rejected', 'hidden'])('rejects a %s listing (not orderable by id)', (status) => {
    expect(() => assertProductSellable({ ...live, status })).toThrow(BadRequestException);
  });

  it('rejects a listing with no seller', () => {
    expect(() => assertProductSellable({ ...live, sellerId: null })).toThrow(BadRequestException);
  });

  it('rejects an auction that has already ended', () => {
    const ended = { ...live, isAuction: true, auctionEndsAt: new Date(Date.now() - 1000) };
    expect(() => assertProductSellable(ended)).toThrow(BadRequestException);
  });

  it('allows an auction still open', () => {
    const open = { ...live, isAuction: true, auctionEndsAt: new Date(Date.now() + 60_000) };
    expect(() => assertProductSellable(open)).not.toThrow();
  });
});

describe('resolveUnitPriceCents (F12)', () => {
  it('prefers the canonical priceCents', () => {
    expect(resolveUnitPriceCents({ priceCents: 118000, price: '$999' })).toBe(118000);
  });

  it('backfills from a parseable price string when cents are missing', () => {
    expect(resolveUnitPriceCents({ priceCents: null, price: '$1,180' })).toBe(118000);
  });

  it('rejects a listing with no valid price instead of coercing to 0', () => {
    expect(() => resolveUnitPriceCents({ priceCents: null, price: 'call us' })).toThrow(BadRequestException);
    expect(() => resolveUnitPriceCents({ priceCents: 0, price: '' })).toThrow(BadRequestException);
    expect(() => resolveUnitPriceCents({ priceCents: -50, price: '' })).toThrow(BadRequestException);
  });
});

describe('sellableWhere (F04)', () => {
  it('filters to live and excludes finished auctions', () => {
    const w = sellableWhere();
    expect(w.status).toBe('live');
    expect(w.NOT).toMatchObject({ isAuction: true });
  });
});
