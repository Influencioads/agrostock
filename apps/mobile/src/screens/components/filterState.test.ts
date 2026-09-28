import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, clearGroup, countActive, filtersFromParams, toQuery, toggleAttr, type Filters } from './filterState';

const withCategory: Filters = {
  ...EMPTY_FILTERS,
  selection: {
    categoryId: 'cat1',
    categoryName: 'Grains',
    categoryNameEn: 'Grains',
    subcategoryId: 'sub9',
    subcategoryName: 'Durum',
    trail: ['Grains', 'Wheat', 'Durum'],
    attrFields: [{ key: 'grade', label: 'Grade', type: 'select', options: ['A', 'B'] }],
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

  it('ignores an unparseable price, as the API does', () => {
    expect(countActive({ ...EMPTY_FILTERS, minPrice: 'abc' })).toBe(0);
  });

  it('counts a value list once however many values it holds', () => {
    expect(countActive({ ...EMPTY_FILTERS, country: ['Russia', 'Ukraine'] })).toBe(1);
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
    const f: Filters = { ...withCategory, grade: ['Premium'], city: ['Odesa'] };
    expect(clearGroup(f, 'grade')).toMatchObject({ city: ['Odesa'], grade: [] });
  });

  it('clears only the flags of its own group', () => {
    const f: Filters = { ...EMPTY_FILTERS, flags: { safe: true, direct: true, verified: true } };
    expect(clearGroup(f, 'dealType').flags).toEqual({ verified: true });
  });

  it('tells an attribute keyed like a list group apart by its prefix', () => {
    const f: Filters = { ...toggleAttr(EMPTY_FILTERS, 'grade', 'Extra'), grade: ['Premium'] };
    expect(clearGroup(f, 'attr:grade')).toMatchObject({ attrs: {}, grade: ['Premium'] });
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
    expect(q.offer).toBeUndefined();
  });

  it('turns a pair of opposite boxes into a tri-state boolean', () => {
    const q = (flags: Record<string, boolean>) => toQuery({ ...EMPTY_FILTERS, flags }, '');
    expect(q({ safe: true }).safe).toBe(true);
    expect(q({ direct: true }).safe).toBe(false);
    expect(q({ safe: true, direct: true }).safe).toBeUndefined();
    expect(q({ fixed: true }).negotiable).toBe(false);
  });

  it('converts a display-currency price to USD cents', () => {
    // 9,000 at 90 per dollar is $100.
    expect(toQuery({ ...EMPTY_FILTERS, minPrice: '9000' }, '', undefined, 90).minPrice).toBe(10000);
  });

  it('sends value lists as arrays and drops empty ones', () => {
    const q = toQuery({ ...EMPTY_FILTERS, country: ['Russia', 'Ukraine'] }, '');
    expect(q.country).toEqual(['Russia', 'Ukraine']);
    expect(q.grade).toBeUndefined();
  });

  it('only sends attributes together with the node that types them', () => {
    expect(toQuery(toggleAttr(EMPTY_FILTERS, 'processing', 'Raw'), '').attrs).toBeUndefined();
    expect(toQuery(toggleAttr(withCategory, 'processing', 'Raw'), '').attrs).toEqual({ processing: ['Raw'] });
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

describe('filtersFromParams', () => {
  it('reads a web /market link into the same API query', () => {
    const f = filtersFromParams({
      search: 'ignored here',
      categoryId: 'cat1,cat2',
      category: 'Grains',
      subcategoryId: 'sub9',
      subcategory: 'Durum',
      country: 'India,Turkey',
      grade: 'A',
      deal: 'safe',
      listing: 'offer,auction',
      verified: 'true',
      attr_colour: 'Mature (brown, husked),Green',
      minPrice: '10',
    });
    expect(f.selection.trail).toEqual(['Grains', 'Durum']);
    expect(toQuery(f, '')).toMatchObject({
      categoryId: 'cat1',
      subcategoryId: 'sub9',
      country: ['India', 'Turkey'],
      grade: ['A'],
      safe: true,
      offer: true,
      auction: true,
      verified: true,
      minPrice: 1000,
      attrs: { colour: ['Mature (brown, husked)', 'Green'] },
    });
  });

  it('is empty for a link with no filter params', () => {
    expect(countActive(filtersFromParams({ q: 'rice', sort: 'rating' }))).toBe(0);
  });
});
