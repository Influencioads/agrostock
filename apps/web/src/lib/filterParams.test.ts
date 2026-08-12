import { describe, expect, it } from 'vitest';
import { countActiveFilters, joinValues, splitValues, toggleValue } from './filterParams';

describe('splitValues', () => {
  it('reads a multi-select facet out of one comma-separated param', () => {
    expect(splitValues('India,Turkey')).toEqual(['India', 'Turkey']);
  });

  it('treats a single value as a selection of one, so old deep links still work', () => {
    expect(splitValues('kandla')).toEqual(['kandla']);
  });

  it('drops blanks and duplicates rather than sending them to the API', () => {
    expect(splitValues('India, ,India,  Turkey ')).toEqual(['India', 'Turkey']);
    expect(splitValues('')).toEqual([]);
    expect(splitValues(null)).toEqual([]);
  });
});

describe('joinValues', () => {
  it('drops the param entirely when the last box is unticked', () => {
    expect(joinValues([])).toBeNull();
    expect(joinValues(['  '])).toBeNull();
  });

  it('serializes a selection back to one param', () => {
    expect(joinValues(['India', 'Turkey'])).toBe('India,Turkey');
  });
});

describe('toggleValue', () => {
  it('ticks and unticks without disturbing the rest of the selection', () => {
    expect(toggleValue(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleValue(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
});

describe('countActiveFilters', () => {
  it('counts every ticked box, not every param — three countries is three filters', () => {
    expect(countActiveFilters(new URLSearchParams('country=India,Turkey,Brazil'))).toBe(3);
  });

  it('ignores sort and page — they change how results are shown, not which', () => {
    expect(countActiveFilters(new URLSearchParams('sort=price_asc&page=3&grade=Organic'))).toBe(1);
  });

  it('counts a category once, not twice, despite the id/name param pair', () => {
    expect(countActiveFilters(new URLSearchParams('categoryId=c1&category=Nuts'))).toBe(1);
    expect(countActiveFilters(new URLSearchParams('categoryId=c1,c2&category=Nuts,Grains'))).toBe(2);
  });

  it('still counts a taxonomy pick deep-linked with only one half of the pair', () => {
    // `/market?categoryId=…` is what the homepage tiles emit — the badge used to
    // ignore it entirely and show a filtered grid with no filter count.
    expect(countActiveFilters(new URLSearchParams('categoryId=c1'))).toBe(1);
    expect(countActiveFilters(new URLSearchParams('category=Nuts'))).toBe(1);
    expect(countActiveFilters(new URLSearchParams('subcategoryId=s1'))).toBe(1);
  });

  it('counts each value of an attribute facet', () => {
    expect(countActiveFilters(new URLSearchParams('attr_packing=Jute,PP&verified=true'))).toBe(3);
  });

  it('is zero on a clean browse', () => {
    expect(countActiveFilters(new URLSearchParams(''))).toBe(0);
  });
});
