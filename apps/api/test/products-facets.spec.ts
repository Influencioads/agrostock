import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';
import { noQuotas } from './helpers/entitlements-stub';

/**
 * The facet endpoint exists so the browse panel stops inventing its own options.
 * These specs pin the two properties that makes it worth having: every option
 * the catalog holds comes back, and a facet is never counted against itself.
 */

const CATEGORIES = [
  { id: 'cat1', name: 'Grains', emoji: '🌾', translations: [] },
  // No listings anywhere — still a real choice a buyer can make.
  { id: 'cat2', name: 'Nuts', emoji: '🥜', translations: [] },
];

const MARKETS = [
  { id: 'm1', slug: 'kandla', name: 'Kandla', city: 'Kandla', country: 'India', flag: '🇮🇳', translations: [] },
  { id: 'm2', slug: 'mersin', name: 'Mersin', city: 'Mersin', country: 'Turkey', flag: '🇹🇷', translations: [] },
];

const ATTR_FIELDS = [
  { key: 'packing', label: 'Packing', type: 'select', options: ['Jute', 'PP'], optionLabels: ['Jute bag', 'PP bag'] },
  { key: 'organic', label: 'Organic', type: 'boolean' },
  // Not a discrete choice — must not become a checkbox group.
  { key: 'moisture', label: 'Moisture', type: 'number' },
];

interface FacetCase {
  groupBy?: Record<string, unknown[]>;
  scan?: { id: string; supplyCountries: string[]; attributes: Record<string, unknown> | null }[];
}

function serviceForFacets({ groupBy = {}, scan = [] }: FacetCase = {}) {
  const groupByCalls: { by: string[]; where: Record<string, unknown> }[] = [];
  const prisma = {
    product: {
      groupBy: vi.fn(async (args: { by: string[]; where: Record<string, unknown> }) => {
        groupByCalls.push({ by: args.by, where: args.where });
        return groupBy[args.by.join(',')] ?? [];
      }),
      findMany: vi.fn(async () => scan),
      count: vi.fn(async () => 0),
      aggregate: vi.fn(async () => ({ _min: { priceCents: 1000 }, _max: { priceCents: 90000 } })),
    },
    category: { findMany: vi.fn(async () => CATEGORIES) },
    market: {
      findMany: vi.fn(async (args: { select: Record<string, unknown> }) =>
        // The place-fallback lookup selects only id/city/country.
        'slug' in args.select ? MARKETS : MARKETS.map(({ id, city, country }) => ({ id, city, country })),
      ),
    },
    subcategory: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => ({ id: 'sub1', name: 'Rice', parentId: null, categoryId: 'cat1' })),
    },
  };
  const categories = { fieldMap: async () => new Map([['sub1', ATTR_FIELDS]]) };
  return { svc: new ProductsService(prisma as never, {} as never, {} as never, categories as never, noQuotas()), prisma, groupByCalls };
}

describe('ProductsService facets', () => {
  it('returns every category and market, including those with nothing listed', async () => {
    const { svc } = serviceForFacets({ groupBy: { categoryId: [{ categoryId: 'cat1', _count: { _all: 7 } }] } });

    const facets = await svc.facets({});

    // cat2 has no listings. Omitting it would make the panel disagree with the
    // backend's own category list — the whole bug this endpoint fixes.
    expect(facets.categories.map((c) => [c.value, c.count])).toEqual([['cat1', 7], ['cat2', 0]]);
    expect(facets.markets.map((m) => m.value).sort()).toEqual(['kandla', 'mersin']);
  });

  it('counts a facet WITHOUT its own selection, so a second value stays addable', async () => {
    const { svc, groupByCalls } = serviceForFacets();

    await svc.facets({ country: 'India', grade: 'Premium' });

    // The country grouping must not carry the country filter, or the list would
    // collapse to India alone and Turkey could never be ticked.
    const placeCall = groupByCalls.find((c) => c.by.includes('country') && c.by.includes('city'));
    expect(JSON.stringify(placeCall?.where)).not.toContain('India');
    // …but it DOES still carry every other filter.
    expect(JSON.stringify(placeCall?.where)).toContain('Premium');
    // And the grade grouping is the mirror image.
    const gradeCall = groupByCalls.find((c) => c.by.join() === 'grade');
    expect(JSON.stringify(gradeCall?.where)).not.toContain('Premium');
    expect(JSON.stringify(gradeCall?.where)).toContain('India');
  });

  it('merges case variants of a free-text grade, keeping the commonest spelling', async () => {
    const { svc } = serviceForFacets({
      groupBy: {
        grade: [
          { grade: 'premium', _count: { _all: 2 } },
          { grade: 'Premium', _count: { _all: 9 } },
          { grade: '  ', _count: { _all: 4 } },
          { grade: null, _count: { _all: 5 } },
        ],
      },
    });

    const facets = await svc.facets({});

    // The filter matches grade case-insensitively, so two spellings are ONE box.
    expect(facets.grades).toEqual([{ value: 'Premium', label: 'Premium', count: 11 }]);
  });

  it('falls back to the market place when a listing carries none, without double counting', async () => {
    const { svc } = serviceForFacets({
      groupBy: {
        'city,country,marketId': [
          { city: 'Kandla', country: 'India', marketId: 'm1', _count: { _all: 3 } },
          // No place of its own — inherits its market's.
          { city: null, country: null, marketId: 'm2', _count: { _all: 2 } },
          { city: 'Pune', country: 'India', marketId: null, _count: { _all: 1 } },
        ],
      },
    });

    const facets = await svc.facets({});

    // India = 3 (own) + 1 (own) and NOT counted twice for the market that
    // repeats it; Turkey comes entirely from the market fallback.
    expect(facets.countries).toEqual([
      { value: 'India', label: 'India', count: 4 },
      { value: 'Turkey', label: 'Turkey', count: 2 },
    ]);
    expect(facets.cities.map((c) => c.value).sort()).toEqual(['Kandla', 'Mersin', 'Pune']);
  });

  it('offers only the discrete attribute fields, both sides of a boolean, and retired values', async () => {
    const { svc } = serviceForFacets({
      scan: [
        { id: 'p1', supplyCountries: ['UAE'], attributes: { packing: 'Jute', organic: true } },
        { id: 'p2', supplyCountries: ['UAE', 'Oman'], attributes: { packing: 'Jute', organic: false } },
        // "Hessian" is no longer in the schema's options — the listing that uses
        // it must stay reachable or it is invisible stock.
        { id: 'p3', supplyCountries: [], attributes: { packing: 'Hessian' } },
      ],
    });

    const facets = await svc.facets({ subcategoryId: 'sub1' });

    expect(facets.attributes.map((a) => a.key)).toEqual(['packing', 'organic']);
    const packing = facets.attributes.find((a) => a.key === 'packing')!;
    expect(packing.options).toEqual([
      { value: 'Jute', label: 'Jute bag', count: 2 },
      { value: 'PP', label: 'PP bag', count: 0 },
      { value: 'Hessian', label: 'Hessian', count: 1 },
    ]);
    // A boolean is two boxes, so "no" is as askable as "yes".
    const organic = facets.attributes.find((a) => a.key === 'organic')!;
    expect(organic.options).toEqual([
      { value: 'true', label: 'true', count: 1 },
      { value: 'false', label: 'false', count: 1 },
    ]);
    expect(facets.supplyCountries).toEqual([
      { value: 'UAE', label: 'UAE', count: 2 },
      { value: 'Oman', label: 'Oman', count: 1 },
    ]);
  });

  it('does not let an attribute selection narrow its own option list', async () => {
    const { svc } = serviceForFacets({
      scan: [
        { id: 'p1', supplyCountries: [], attributes: { packing: 'Jute' } },
        { id: 'p2', supplyCountries: [], attributes: { packing: 'PP' } },
      ],
    });

    const facets = await svc.facets({ subcategoryId: 'sub1', attr_packing: 'Jute' });

    // PP still shows a real count — otherwise a buyer could never widen to it.
    const packing = facets.attributes.find((a) => a.key === 'packing')!;
    expect(packing.options.find((o) => o.value === 'PP')?.count).toBe(1);
    expect(packing.options.find((o) => o.value === 'Jute')?.count).toBe(1);
  });

  it('reports the price range so the inputs can hint at real bounds', async () => {
    const { svc } = serviceForFacets();
    const facets = await svc.facets({});
    expect(facets.priceRange).toEqual({ minCents: 1000, maxCents: 90000 });
  });
});
