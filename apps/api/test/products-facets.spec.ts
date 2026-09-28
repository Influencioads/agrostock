import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';
import { noQuotas } from './helpers/entitlements-stub';
import { noTranslate } from './helpers/text-translation-stub';

/**
 * The facet endpoint exists so the browse panel stops inventing its own options.
 * These specs pin the two properties that makes it worth having: every option
 * the catalog holds comes back, and a facet is never counted against itself —
 * so every count is exactly what ticking that box returns.
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
  { key: 'use', label: 'Use', type: 'multiselect', options: ['Food', 'Feed'] },
  // Not a discrete choice — must not become a checkbox group.
  { key: 'moisture', label: 'Moisture', type: 'number' },
];

/** Taxonomy for the roll-up: rice (L2) → basmati (L3) → steam (L4); wheat is a sibling L2. */
const TREE = [
  { id: 'rice', name: 'Rice', emoji: null, parentId: null, translations: [] },
  { id: 'basmati', name: 'Basmati', emoji: null, parentId: 'rice', translations: [{ name: 'Басмати' }] },
  { id: 'steam', name: 'Steam', emoji: null, parentId: 'basmati', translations: [] },
  { id: 'wheat', name: 'Wheat', emoji: null, parentId: null, translations: [] },
];

type Scan = { id: string; supplyCountries: string[]; attributes: Record<string, unknown> | null }[];

interface FacetCase {
  groupBy?: Record<string, unknown[]>;
  scan?: Scan;
  blocks?: { blockerId: string; blockedId: string }[];
  total?: number;
  /** A market only a matching listing points at (e.g. a seller's own pending one). */
  extraMarkets?: typeof MARKETS;
}

function serviceForFacets({ groupBy = {}, scan = [], blocks = [], total = 0, extraMarkets = [] }: FacetCase = {}) {
  const groupByCalls: { by: string[]; where: Record<string, unknown> }[] = [];
  const allMarkets = [...MARKETS, ...extraMarkets];
  const prisma = {
    product: {
      groupBy: vi.fn(async (args: { by: string[]; where: Record<string, unknown> }) => {
        groupByCalls.push({ by: args.by, where: args.where });
        return groupBy[args.by.join(',')] ?? [];
      }),
      findMany: vi.fn(async (_args: { where: Record<string, unknown> }) => scan),
      // The plain count is `total`; the flag counts wrap their where in an AND.
      count: vi.fn(async (args: { where: Record<string, unknown> }) => ('status' in args.where ? total : 0)),
      aggregate: vi.fn(async (_args: { where: Record<string, unknown> }) => ({ _min: { priceCents: 1000 }, _max: { priceCents: 90000 } })),
    },
    category: { findMany: vi.fn(async () => CATEGORIES) },
    market: {
      findMany: vi.fn(async (args: { select: Record<string, unknown>; where: Record<string, unknown> }) =>
        // The place-fallback lookup selects only id/city/country.
        'slug' in args.select ? allMarkets : allMarkets.map(({ id, city, country }) => ({ id, city, country })),
      ),
    },
    communityUserBlock: { findMany: vi.fn(async () => blocks) },
    subcategory: {
      // The branch walk loads bare links; the facet labels select names too.
      findMany: vi.fn(async (args: { select: Record<string, unknown>; where?: { id: { in: string[] } } }) =>
        'name' in args.select
          ? TREE.filter((n) => args.where?.id.in.includes(n.id))
          : TREE.map(({ id, parentId }) => ({ id, parentId })),
      ),
      findUnique: vi.fn(async () => ({ id: 'sub1', name: 'Rice', parentId: null, categoryId: 'cat1' })),
    },
  };
  const categories = { fieldMap: async () => new Map([['sub1', ATTR_FIELDS]]) };
  return { svc: new ProductsService(prisma as never, {} as never, {} as never, categories as never, noQuotas(), noTranslate()), prisma, groupByCalls };
}

const whereOf = (calls: { by: string[]; where: unknown }[], by: string) =>
  JSON.stringify(calls.find((c) => c.by.join() === by)?.where);

describe('ProductsService facets', () => {
  it('returns every category and market, including those with nothing listed', async () => {
    const { svc } = serviceForFacets({ groupBy: { categoryId: [{ categoryId: 'cat1', _count: { _all: 7 } }] } });

    const facets = await svc.facets({});

    // cat2 has no listings. Omitting it would make the panel disagree with the
    // backend's own category list — the whole bug this endpoint fixes.
    expect(facets.categories.map((c) => [c.value, c.count])).toEqual([['cat1', 7], ['cat2', 0]]);
    expect(facets.markets.map((m) => m.value).sort()).toEqual(['kandla', 'mersin']);
  });

  it('reports the whole-query total — the "Show N results" number', async () => {
    const { svc, prisma } = serviceForFacets({ total: 5 });

    const facets = await svc.facets({ grade: 'Premium' });

    expect(facets.total).toBe(5);
    // Counted on the FULL where, own selections included.
    const plain = prisma.product.count.mock.calls.find(([a]) => 'status' in a.where)![0];
    expect(JSON.stringify(plain.where)).toContain('Premium');
  });

  it('counts a facet WITHOUT its own selection, so a second value stays addable', async () => {
    const { svc, groupByCalls } = serviceForFacets();

    await svc.facets({ country: 'India', grade: 'Premium' });

    // The country grouping must not carry the country filter, or the list would
    // collapse to India alone and Turkey could never be ticked.
    expect(whereOf(groupByCalls, 'country,marketId')).not.toContain('India');
    // …but it DOES still carry every other filter.
    expect(whereOf(groupByCalls, 'country,marketId')).toContain('Premium');
    // And the grade grouping is the mirror image.
    expect(whereOf(groupByCalls, 'grade')).not.toContain('Premium');
    expect(whereOf(groupByCalls, 'grade')).toContain('India');
  });

  it('counts cities under the country filter and countries under the city filter', async () => {
    const { svc, groupByCalls } = serviceForFacets();

    await svc.facets({ country: 'Netherlands', city: 'Rotterdam' });

    // Lifting both together offered Paris under Netherlands, and ticking it
    // returned nothing: each keeps the OTHER's filter.
    expect(whereOf(groupByCalls, 'city,marketId')).toContain('Netherlands');
    expect(whereOf(groupByCalls, 'city,marketId')).not.toContain('Rotterdam');
    expect(whereOf(groupByCalls, 'country,marketId')).toContain('Rotterdam');
    expect(whereOf(groupByCalls, 'country,marketId')).not.toContain('Netherlands');
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

  it('tallies a place under the listing OR its market, case-insensitively, once per row', async () => {
    const { svc } = serviceForFacets({
      groupBy: {
        'country,marketId': [
          { country: 'India', marketId: 'm1', _count: { _all: 3 } },
          // No place of its own — inherits its market's.
          { country: null, marketId: 'm2', _count: { _all: 2 } },
          { country: 'india', marketId: null, _count: { _all: 1 } },
        ],
        'city,marketId': [
          { city: 'Kandla', marketId: 'm1', _count: { _all: 3 } },
          // Its own city differs from its market's: city=Pune AND city=Mersin both
          // return it, so it is counted under both.
          { city: 'Pune', marketId: 'm2', _count: { _all: 2 } },
        ],
      },
    });

    const facets = await svc.facets({});

    // India = 3 + 1 (spelling merged, not double counted for the market that
    // repeats it); Turkey comes entirely from the market side.
    expect(facets.countries).toEqual([
      { value: 'India', label: 'India', count: 4 },
      { value: 'Turkey', label: 'Turkey', count: 2 },
    ]);
    expect(facets.cities).toEqual([
      { value: 'Kandla', label: 'Kandla', count: 3 },
      { value: 'Mersin', label: 'Mersin', count: 2 },
      { value: 'Pune', label: 'Pune', count: 2 },
    ]);
  });

  it('rolls subcategory counts up the branch, with parent links, the way selecting a node filters', async () => {
    const { svc } = serviceForFacets({
      groupBy: {
        subcategoryId: [
          { subcategoryId: 'steam', _count: { _all: 2 } },
          { subcategoryId: 'rice', _count: { _all: 1 } },
          { subcategoryId: null, _count: { _all: 4 } },
        ],
      },
    });

    const facets = await svc.facets({ categoryId: 'cat1' });

    // rice has one listing of its own plus two on a level-4 grandchild. The old
    // direct count said 1 — and selecting it returned 3. Nodes with nothing in
    // their branch (wheat) are not listed.
    expect([...facets.subcategories].sort((a, b) => a.value.localeCompare(b.value))).toEqual([
      { value: 'basmati', label: 'Басмати', emoji: undefined, parentId: 'rice', count: 2 },
      { value: 'rice', label: 'Rice', emoji: undefined, parentId: null, count: 3 },
      { value: 'steam', label: 'Steam', emoji: undefined, parentId: 'basmati', count: 2 },
    ]);
  });

  it('counts categories and subcategories without the node and attribute picks a switch clears', async () => {
    const { svc, groupByCalls } = serviceForFacets();

    await svc.facets({ categoryId: 'cat1', subcategoryId: 'sub1', attr_packing: 'Jute' });

    expect(whereOf(groupByCalls, 'categoryId')).not.toContain('cat1');
    expect(whereOf(groupByCalls, 'categoryId')).not.toContain('Jute');
    expect(whereOf(groupByCalls, 'categoryId')).not.toContain('sub1');
    // The node facet keeps the category, drops the node and its attribute picks.
    expect(whereOf(groupByCalls, 'subcategoryId')).toContain('cat1');
    expect(whereOf(groupByCalls, 'subcategoryId')).not.toContain('Jute');
    // Everything else still carries them.
    expect(whereOf(groupByCalls, 'grade')).toContain('Jute');
  });

  it('offers only the discrete attribute fields, both sides of a boolean, and retired values', async () => {
    const { svc } = serviceForFacets({
      scan: [
        { id: 'p1', supplyCountries: ['UAE'], attributes: { packing: 'Jute', organic: true, use: ['Food', 'Feed'] } },
        { id: 'p2', supplyCountries: ['UAE', 'Oman'], attributes: { packing: 'Jute', organic: false, use: 'Food' } },
        // "Hessian" is no longer in the schema's options — the listing that uses
        // it must stay reachable or it is invisible stock.
        { id: 'p3', supplyCountries: [], attributes: { packing: 'Hessian', organic: 'true' } },
      ],
    });

    const facets = await svc.facets({ subcategoryId: 'sub1' });

    expect(facets.attributes.map((a) => a.key)).toEqual(['packing', 'organic', 'use']);
    const packing = facets.attributes.find((a) => a.key === 'packing')!;
    expect(packing.options).toEqual([
      { value: 'Jute', label: 'Jute bag', count: 2 },
      { value: 'PP', label: 'PP bag', count: 0 },
      { value: 'Hessian', label: 'Hessian', count: 1 },
    ]);
    // A boolean is two boxes, so "no" is as askable as "yes" — and the string
    // "true" is not a boolean: the JSON-equality filter would never return it.
    const organic = facets.attributes.find((a) => a.key === 'organic')!;
    expect(organic.options).toEqual([
      { value: 'true', label: 'true', count: 1 },
      { value: 'false', label: 'false', count: 1 },
    ]);
    // array_contains only matches a JSON array, so p2's scalar "Food" is not counted.
    const use = facets.attributes.find((a) => a.key === 'use')!;
    expect(use.options.map((o) => [o.value, o.count])).toEqual([['Food', 1], ['Feed', 1]]);
    expect(facets.supplyCountries).toEqual([
      { value: 'UAE', label: 'UAE', count: 2 },
      { value: 'Oman', label: 'Oman', count: 1 },
    ]);
  });

  it('does not let an attribute selection narrow its own option list', async () => {
    const { svc, prisma } = serviceForFacets({
      scan: [
        { id: 'p1', supplyCountries: [], attributes: { packing: 'Jute', organic: true } },
        { id: 'p2', supplyCountries: [], attributes: { packing: 'PP', organic: true } },
        { id: 'p3', supplyCountries: [], attributes: { packing: 'PP', organic: false } },
      ],
    });

    const facets = await svc.facets({ subcategoryId: 'sub1', attr_packing: 'Jute', attr_organic: 'true' });

    // The scan itself carries no attribute pick — they are applied per facet.
    expect(JSON.stringify(prisma.product.findMany.mock.calls[0][0].where)).not.toContain('packing');
    // PP still shows a real count (under organic=true only) — otherwise a buyer
    // could never widen to it.
    const packing = facets.attributes.find((a) => a.key === 'packing')!;
    expect(packing.options.map((o) => [o.value, o.count])).toEqual([['Jute', 1], ['PP', 1]]);
    // …while organic is counted under packing=Jute.
    const organic = facets.attributes.find((a) => a.key === 'organic')!;
    expect(organic.options.map((o) => [o.value, o.count])).toEqual([['true', 1], ['false', 0]]);
  });

  it('counts ships-to as a union (its own picks lifted) and attributes under it', async () => {
    const { svc } = serviceForFacets({
      scan: [
        { id: 'p1', supplyCountries: ['India'], attributes: { packing: 'Jute' } },
        { id: 'p2', supplyCountries: ['Turkey'], attributes: { packing: 'PP' } },
        { id: 'p3', supplyCountries: ['India', 'Turkey'], attributes: { packing: 'PP' } },
      ],
    });

    const facets = await svc.facets({ subcategoryId: 'sub1', supplyCountry: 'India' });

    // Picks in one group OR together (hasSome), so each box is counted as if it
    // were the only pick: Turkey alone returns p2 and p3. The old code counted
    // only rows ALSO shipping to India, i.e. Turkey = 1.
    expect(facets.supplyCountries).toEqual([
      { value: 'India', label: 'India', count: 2 },
      { value: 'Turkey', label: 'Turkey', count: 2 },
    ]);
    // Attribute counts honour the ships-to pick: p2 (Turkey only) is out.
    const packing = facets.attributes.find((a) => a.key === 'packing')!;
    expect(packing.options.map((o) => [o.value, o.count])).toEqual([['Jute', 1], ['PP', 1]]);
  });

  it('excludes blocked sellers from every count, like the grid', async () => {
    const { svc, groupByCalls, prisma } = serviceForFacets({ blocks: [{ blockerId: 'me', blockedId: 'rude' }] });

    await svc.facets({}, 'en', 'me');

    for (const call of groupByCalls) expect(JSON.stringify(call.where)).toContain('rude');
    expect(JSON.stringify(prisma.product.findMany.mock.calls[0][0].where)).toContain('rude');
    for (const [args] of prisma.product.count.mock.calls) expect(JSON.stringify(args.where)).toContain('rude');
  });

  it('lists a non-approved market that a matching listing sits in', async () => {
    const pending = { id: 'm3', slug: 'my-yard', name: 'My yard', city: 'Pune', country: 'India', flag: null, translations: [] };
    const { svc, prisma } = serviceForFacets({
      groupBy: { marketId: [{ marketId: 'm3', _count: { _all: 1 } }] },
      extraMarkets: [pending as never],
    });

    const facets = await svc.facets({});

    const marketQuery = prisma.market.findMany.mock.calls.find(([a]) => 'slug' in a.select)![0];
    expect(JSON.stringify(marketQuery.where)).toContain('m3');
    expect(facets.markets.find((m) => m.value === 'my-yard')?.count).toBe(1);
  });

  it('reports the price range without the price filter, so the inputs hint at real bounds', async () => {
    const { svc, prisma } = serviceForFacets();
    const facets = await svc.facets({ minPrice: '50000', maxPrice: '120000' });
    expect(facets.priceRange).toEqual({ minCents: 1000, maxCents: 90000 });
    expect(JSON.stringify(prisma.product.aggregate.mock.calls[0][0].where)).not.toContain('50000');
  });
});
