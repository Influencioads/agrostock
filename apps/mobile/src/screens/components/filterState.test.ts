import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, clearGroup, countActive, toQuery, toggleAttr, type Filters } from './filterState';

const withCategory: Filters = {
  ...EMPTY_FILTERS,
  selection: {
    categoryId: 'cat1',
    categoryName: 'Grains',
    subcategoryId: 'sub9',
    subcategoryName: 'Durum',
    trail: ['Grains', 'Wheat', 'Durum'],
    attrSource: 'Wheat',
  },
};

describe('countActive', () => {
  it('counts nothing for empty filters', () => {
    expect(countActive(EMPTY_FILTERS)).toBe(0);
  });

  it('counts a price range once however many ends are filled', () => {
    expect(countActive({ ...EMPTY_FILTERS, minPrice: '10' })).toBe(1);
    expect(countActive({ ...EMPTY_FILTERS, minPrice: '10', maxPrice: '90' })).toBe(1);
  });

  it('counts an attribute facet once regardless of how many values it holds', () => {
    const f = toggleAttr(toggleAttr(EMPTY_FILTERS, 'moisture', 'low'), 'moisture', 'medium');
    expect(f.attrs.moisture).toEqual(['low', 'medium']);
    expect(countActive(f)).toBe(1);
  });

  it('counts each boolean flag separately', () => {
    expect(countActive({ ...EMPTY_FILTERS, flags: { verified: true, offer: true } })).toBe(2);
  });
});

describe('toggleAttr', () => {
  it('drops the key entirely once its last value is removed', () => {
    const on = toggleAttr(EMPTY_FILTERS, 'grade', 'A');
    const off = toggleAttr(on, 'grade', 'A');
    expect(Object.keys(off.attrs)).toEqual([]);
  });
});

describe('clearGroup', () => {
  it('clears attribute picks along with the category that defined them', () => {
    const f = toggleAttr(withCategory, 'moisture', 'low');
    const cleared = clearGroup(f, 'category');
    expect(cleared.selection.categoryId).toBe('');
    expect(cleared.attrs).toEqual({});
  });

  it('leaves other groups untouched', () => {
    const f: Filters = { ...withCategory, grade: 'Premium', city: 'Odesa' };
    expect(clearGroup(f, 'grade')).toMatchObject({ city: 'Odesa', grade: '' });
  });

  it('treats an unknown group as an attribute field key', () => {
    const f = toggleAttr(EMPTY_FILTERS, 'protein', '12%');
    expect(clearGroup(f, 'protein').attrs).toEqual({});
  });
});

describe('toQuery', () => {
  it('converts whole-unit prices to cents and omits blanks', () => {
    const q = toQuery({ ...EMPTY_FILTERS, minPrice: '12.5' }, '', 'relevance');
    expect(q.minPrice).toBe(1250);
    expect(q.maxPrice).toBeUndefined();
    expect(q.city).toBeUndefined();
  });

  it('promotes set flags to top-level booleans', () => {
    const q = toQuery({ ...EMPTY_FILTERS, flags: { verified: true, offer: false } }, '', 'relevance');
    expect(q).toMatchObject({ verified: true });
    expect('offer' in q).toBe(false);
  });

  it('sends both category and subcategory ids so the API can filter branch-inclusively', () => {
    const q = toQuery(withCategory, 'wheat', 'price_asc');
    expect(q).toMatchObject({
      categoryId: 'cat1',
      subcategoryId: 'sub9',
      search: 'wheat',
      sort: 'price_asc',
    });
  });
});
