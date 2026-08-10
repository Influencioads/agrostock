import { describe, expect, it } from 'vitest';
import { comparableUnits, convertQty, minOrderQty, parseQtyIn, stockDisplay, stockQtyText } from './units';

describe('convertQty', () => {
  it('restates a mass in any other mass unit', () => {
    expect(convertQty(50, 'MT', 'KG')).toBe(50_000);
    expect(convertQty(500, 'KG', 'MT')).toBe(0.5);
    expect(convertQty(10, 'QUINTAL', 'KG')).toBe(1000);
    expect(convertQty(1, 'TON', 'KG')).toBeCloseTo(907.18474, 5);
  });

  it('is identity for the same unit, including the countable ones', () => {
    expect(convertQty(7, 'BAG', 'BAG')).toBe(7);
    expect(convertQty(3.5, 'MT', 'MT')).toBe(3.5);
  });

  it('refuses to price a count as a mass', () => {
    expect(convertQty(5, 'BAG', 'KG')).toBeUndefined();
    expect(convertQty(5, 'MT', 'PIECE')).toBeUndefined();
  });
});

describe('comparableUnits', () => {
  it('offers every mass unit for a mass, and only itself for a count', () => {
    expect(comparableUnits('MT')).toEqual(['KG', 'MT', 'QUINTAL', 'TON']);
    expect(comparableUnits('BAG')).toEqual(['BAG']);
  });
});

describe('minOrderQty', () => {
  it('restates the listing MOQ in the metric the buyer types in', () => {
    expect(minOrderQty('5 MT', 'MT', 'KG')).toBe(5000);
    expect(minOrderQty('500 KG', 'MT', 'MT')).toBe(0.5);
  });

  it('floors at a sane minimum when the listing has no MOQ', () => {
    expect(minOrderQty(null, 'MT', 'MT')).toBe(0.01);
    expect(minOrderQty(null, 'BAG', 'BAG')).toBe(1);
  });
});

/**
 * The single stock figure. Everything a user sees goes through `stockDisplay`,
 * and `Product.qty` is written from `stockQtyText` — so these two are what stop
 * a listing from ever showing two different quantities again.
 */
describe('stockDisplay', () => {
  it('reports a tracked count in the listing unit', () => {
    expect(stockDisplay(500, 'MT')).toEqual({ kind: 'count', count: 500, unit: 'MT' });
    // Legacy rows store the display form of the unit.
    expect(stockDisplay(12, '/MT')).toEqual({ kind: 'count', count: 12, unit: 'MT' });
    expect(stockDisplay(40, 'bags')).toEqual({ kind: 'count', count: 40, unit: 'BAG' });
  });

  it('distinguishes "out of stock" from "not tracked"', () => {
    // 0 is a real answer; null/undefined means the seller does not count stock.
    expect(stockDisplay(0, 'MT')).toEqual({ kind: 'out' });
    expect(stockDisplay(null, 'MT')).toEqual({ kind: 'untracked' });
    expect(stockDisplay(undefined, 'MT')).toEqual({ kind: 'untracked' });
  });

  it('treats a non-finite count as untracked rather than rendering NaN', () => {
    expect(stockDisplay(Number.NaN, 'MT')).toEqual({ kind: 'untracked' });
  });

  it('falls back to the default unit like the rest of the module', () => {
    expect(stockDisplay(5)).toEqual({ kind: 'count', count: 5, unit: 'MT' });
  });
});

describe('stockQtyText', () => {
  it('mirrors the canonical count into the legacy display column', () => {
    expect(stockQtyText(500, 'MT')).toBe('500 MT');
    expect(stockQtyText(25000, 'kg')).toBe('25000 KG');
  });

  it('is null when there is nothing to display', () => {
    // Matches the migration: an out-of-stock or untracked listing stores NULL.
    expect(stockQtyText(0, 'MT')).toBeNull();
    expect(stockQtyText(null, 'MT')).toBeNull();
  });

  it('round-trips through parseQtyIn, so a legacy client cannot drift', () => {
    const text = stockQtyText(1200, 'KG');
    expect(parseQtyIn(text, 'KG')).toBe(1200);
  });
});
