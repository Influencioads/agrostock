import { describe, expect, it } from 'vitest';
import { comparableUnits, convertQty, minOrderQty } from './units';

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
