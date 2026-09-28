import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';
import { noQuotas } from './helpers/entitlements-stub';
import { noTranslate } from './helpers/text-translation-stub';

/** sub3 (level 2) → sub4 (level 3); `other` is an unrelated level-2 branch. */
const NODES = [
  { id: 'sub3', name: 'Rice', parentId: null, categoryId: 'cat1', translations: [] },
  { id: 'sub4', name: 'Basmati', parentId: 'sub3', categoryId: 'cat1', translations: [] },
  { id: 'other', name: 'Wheat', parentId: null, categoryId: 'cat1', translations: [] },
];

const LISTING = { id: 'p1', name: 'Basmati 1121', subcategoryId: 'sub3', attributes: null, translations: [] };

function serviceForProducts() {
  const prisma = {
    product: {
      findMany: vi.fn(async (_args: { where: Record<string, unknown>; orderBy?: unknown }) => [] as unknown[]),
      count: vi.fn(async () => 0),
    },
    category: { findUnique: vi.fn(async () => ({ name: 'Grains', translations: [] })) },
    subcategory: {
      findMany: vi.fn(async () => NODES.map(({ id, parentId }) => ({ id, parentId }))),
      // The empty-result fallback resolves the selected node and labels the
      // ancestor it widened to, so this is no longer optional for a zero match.
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => NODES.find((n) => n.id === where.id) ?? null),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { svc: new ProductsService(prisma as never, {} as never, {} as never, {
    // These specs assert the `where` clause, not the rendered rows — an empty
    // field map means no attribute specs and no facet definitions, which is
    // exactly the shape a product with no subcategory fields produces.
    fieldMap: async () => new Map(),
  } as never, noQuotas(), noTranslate()), prisma };
}

type Where = Record<string, unknown>;
const whereAt = (prisma: ReturnType<typeof serviceForProducts>['prisma'], i = 0) =>
  prisma.product.findMany.mock.calls[i][0].where as Where;

describe('ProductsService filters', () => {
  it('filters public products by category id and the selected subcategory branch', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1', subcategoryId: 'sub3' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          // API-11: browse now uses the canonical sellable predicate (status),
          // matching the detail read and order placement, not `approved`.
          status: 'live',
          categoryId: 'cat1',
          subcategoryId: { in: ['sub3', 'sub4'] },
        }),
      }),
    );
  });

  it('loads the taxonomy links once and shares them across requests', async () => {
    const { svc, prisma } = serviceForProducts();

    // One facets request builds a dozen predicates; each used to re-read the tree.
    await Promise.all([
      svc.findAll({ subcategoryId: 'sub3' }),
      svc.findAll({ subcategoryId: 'sub4' }),
    ]);
    await svc.findAll({ subcategoryId: 'other' });

    expect(prisma.subcategory.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.subcategory.findMany).toHaveBeenCalledWith({ select: { id: true, parentId: true } });
  });

  it('matches a place against the listing itself OR its market, beside the search words', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ country: 'India', city: 'Kandla', search: 'rice' });

    const where = whereAt(prisma);
    const and = where.AND as Where[];
    // A listing with no market attached must still be findable by its own place.
    expect(and.slice(0, 2)).toEqual([
      { OR: [{ city: { equals: 'Kandla', mode: 'insensitive' } }, { market: { is: { city: { equals: 'Kandla', mode: 'insensitive' } } } }] },
      { OR: [{ country: { equals: 'India', mode: 'insensitive' } }, { market: { is: { country: { equals: 'India', mode: 'insensitive' } } } }] },
    ]);
    // The search word is its own AND entry, so no OR can swallow another.
    expect(where.OR).toBeUndefined();
    expect(and[2].OR).toEqual(expect.arrayContaining([{ name: { contains: 'rice', mode: 'insensitive' } }]));
  });

  it('requires EVERY search word, in any order, anywhere the listing is named', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ search: '  rice   basmati ' });

    const and = whereAt(prisma).AND as { OR: Where[] }[];
    expect(and).toHaveLength(2);
    const [rice, basmati] = and;
    const c = { contains: 'rice', mode: 'insensitive' };
    expect(rice.OR).toEqual(
      expect.arrayContaining([
        { name: c },
        { translations: { some: { name: c } } },
        { grade: c },
        { market: { is: { OR: [{ city: c }, { country: c }, { name: c }] } } },
        // A Rice-subcategory listing whose title never says "rice" is still rice.
        { subcategory: { is: { OR: [{ name: c }, { translations: { some: { name: c } } }] } } },
        { category: { is: { OR: [{ name: c }, { translations: { some: { name: c } } }] } } },
      ]),
    );
    expect(basmati.OR).toContainEqual({ name: { contains: 'basmati', mode: 'insensitive' } });
  });

  it('dedupes the search words and caps them at eight', async () => {
    const { svc, prisma } = serviceForProducts();

    // A pasted paragraph used to exceed Postgres's bind-param cap and 500.
    await svc.findAll({ search: `Rice rice ${Array.from({ length: 3000 }, (_, i) => `w${i}`).join(' ')}` });

    const and = whereAt(prisma).AND as { OR: Where[] }[];
    expect(and).toHaveLength(8);
    expect(and[0].OR).toContainEqual({ name: { contains: 'rice', mode: 'insensitive' } });
    expect(and[1].OR).toContainEqual({ name: { contains: 'w0', mode: 'insensitive' } });
  });

  it('matches a picked grade or place literally, not as an ILIKE pattern', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ grade: '5% broken', city: 'A_b' });

    const where = whereAt(prisma);
    // Unescaped, "5%" also matched "50% broken" and grade=% matched everything.
    expect(where.grade).toEqual({ equals: '5\\% broken', mode: 'insensitive' });
    expect((where.AND as Where[])[0]).toEqual({
      OR: [{ city: { equals: 'A\\_b', mode: 'insensitive' } }, { market: { is: { city: { equals: 'A\\_b', mode: 'insensitive' } } } }],
    });
  });

  it('clamps the price bounds to the INT4 column instead of letting Prisma throw', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ minPrice: '99999999999', maxPrice: '-5' });

    expect(whereAt(prisma).priceCents).toEqual({ gte: 2147483647, lte: 0 });
  });

  it('sorts unrated and unpriced listings last', async () => {
    const orderOf = async (sort: string) => {
      const { svc, prisma } = serviceForProducts();
      await svc.findAll({ sort });
      return prisma.product.findMany.mock.calls[0][0].orderBy;
    };
    // Postgres puts NULLs FIRST on DESC: "best rated" opened on the unrated.
    expect(await orderOf('rating')).toEqual([{ ratingAvg: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }]);
    expect(await orderOf('price_desc')).toEqual([{ priceCents: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }]);
    expect(await orderOf('price_asc')).toEqual([{ priceCents: { sort: 'asc', nulls: 'last' } }, { id: 'desc' }]);
  });
});

describe('ProductsService multi-select facets', () => {
  it('ORs the values of one facet — two categories means either, not both', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1,cat2', market: 'kandla,mundra', grade: 'Organic,Premium' });

    const where = whereAt(prisma);
    expect(where.categoryId).toEqual({ in: ['cat1', 'cat2'] });
    expect(where.market).toEqual({ slug: { in: ['kandla', 'mundra'] } });
    expect(where.AND).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { grade: { equals: 'Organic', mode: 'insensitive' } },
            { grade: { equals: 'Premium', mode: 'insensitive' } },
          ],
        },
      ]),
    );
  });

  it('accepts repeated keys and keeps commas inside parentheses in one value', async () => {
    const { svc, prisma } = serviceForProducts();

    // `?grade=Premium&grade=Feed` arrives as an array and used to 500 on `.split`.
    await svc.findAll({
      grade: ['Premium', 'Feed'],
      search: ['rice', 'ignored'],
      subcategoryId: 'sub3',
      attr_type: ['Mature (brown, husked),Raw', 'Soft'],
    });

    const and = whereAt(prisma).AND as Where[];
    expect(and).toContainEqual({
      OR: [
        { grade: { equals: 'Premium', mode: 'insensitive' } },
        { grade: { equals: 'Feed', mode: 'insensitive' } },
      ],
    });
    // "Mature (brown, husked)" is ONE option, not "Mature (brown" + "husked)".
    expect(and).toContainEqual({
      OR: [
        { attributes: { path: ['type'], equals: 'Mature (brown, husked)' } },
        { attributes: { path: ['type'], equals: 'Raw' } },
        { attributes: { path: ['type'], equals: 'Soft' } },
      ],
    });
    // A single-valued param keeps its first value.
    expect(JSON.stringify(and)).not.toContain('ignored');
  });

  it('keeps the scalar form for a single value, so every existing deep link is unchanged', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1', market: 'kandla', grade: 'Organic' });

    const where = whereAt(prisma);
    expect(where.categoryId).toBe('cat1');
    expect(where.market).toEqual({ slug: 'kandla' });
    expect(where.grade).toEqual({ equals: 'Organic', mode: 'insensitive' });
  });

  it('matches several places against either the listing or its market', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ country: 'India,Turkey' });

    expect(whereAt(prisma).AND).toEqual([
      {
        OR: [
          { country: { equals: 'India', mode: 'insensitive' } },
          { market: { is: { country: { equals: 'India', mode: 'insensitive' } } } },
          { country: { equals: 'Turkey', mode: 'insensitive' } },
          { market: { is: { country: { equals: 'Turkey', mode: 'insensitive' } } } },
        ],
      },
    ]);
  });

  it('ORs offers and auctions when both boxes are ticked, instead of asking for both at once', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ offer: 'true', auction: 'true' });

    const where = whereAt(prisma);
    // AND-ing them wanted a listing that is simultaneously a discount and a live
    // lot — nearly always nothing, which read as a broken filter.
    expect(where.isOffer).toBeUndefined();
    expect(where.isAuction).toBeUndefined();
    expect(where.AND).toEqual([{ OR: [{ isOffer: true }, { isAuction: true }] }]);
  });

  it('still constrains directly when only one listing type is ticked', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ offer: 'true' });

    const where = whereAt(prisma);
    expect(where.isOffer).toBe(true);
    expect(where.AND).toBeUndefined();
  });

  it('widens "ships to" to hasSome across several countries', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ supplyCountry: 'India,Oman' });

    expect(whereAt(prisma).supplyCountries).toEqual({ hasSome: ['India', 'Oman'] });
  });
});

/**
 * "It should not stop": an empty page 1 is padded with the nearest listings the
 * API can find by loosening the query rung by rung. `hits` decides which
 * attempt finds something — the first where it returns true gets LISTING.
 */
function ladder(hits: (where: string) => boolean) {
  const ctx = serviceForProducts();
  ctx.prisma.product.findMany.mockImplementation(async ({ where }) => (hits(JSON.stringify(where)) ? [LISTING] : []));
  return ctx;
}
type Similar = { total: number; similar?: { id: string }[]; similarFrom?: unknown; relaxed?: string[] };

describe('ProductsService similar ladder', () => {
  it('drops an attribute nobody lists before anything else', async () => {
    const { svc, prisma } = ladder((w) => !w.includes('processing'));

    const res = (await svc.findAll({ categoryId: 'cat1', subcategoryId: 'sub3', attr_processing: 'Roasted' })) as Similar;

    expect(res.total).toBe(0);
    expect(res.similar?.map((p) => p.id)).toEqual(['p1']);
    expect(res.relaxed).toEqual(['attributes']);
    // The node was kept, so there is no "showing X instead".
    expect(res.similarFrom).toBeUndefined();
    expect(whereAt(prisma, 1)).toMatchObject({ status: 'live', categoryId: 'cat1', subcategoryId: { in: ['sub3', 'sub4'] } });
  });

  it('drops one attribute pick at a time, the last first, before all of them', async () => {
    // Roasted exists, just not at 18/20: keep Roasted rather than any processing.
    const { svc, prisma } = ladder((w) => w.includes('Roasted') && !w.includes('18/20'));

    const res = (await svc.findAll({ subcategoryId: 'sub3', attr_processing: 'Roasted', attr_count: '18/20' })) as Similar;

    expect(res.relaxed).toEqual(['attributes']);
    expect(prisma.product.findMany).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(whereAt(prisma, 1))).toContain('Roasted');
  });

  it('loosens cumulatively and reports every group it dropped', async () => {
    const { svc } = ladder((w) => !w.includes('Nope') && !w.includes('gte'));

    const res = (await svc.findAll({ subcategoryId: 'sub4', grade: 'Nope', minPrice: '999' })) as Similar;

    expect(res.relaxed).toEqual(['grade', 'price']);
  });

  it('climbs to the nearest ancestor branch when a drill-down matches nothing', async () => {
    // Empty at sub4, but sub3 has one listing — sellers list shallower than buyers drill.
    const { svc, prisma } = ladder((w) => w.includes('"sub3"'));

    const res = (await svc.findAll({ categoryId: 'cat1', subcategoryId: 'sub4' })) as Similar;

    expect(res.similar?.map((p) => p.id)).toEqual(['p1']);
    expect(res.similarFrom).toEqual({ id: 'sub3', name: 'Rice', kind: 'subcategory' });
    expect(res.relaxed).toEqual(['taxonomy']);
    expect(whereAt(prisma, 1)).toMatchObject({ status: 'live', categoryId: 'cat1', subcategoryId: { in: ['sub3', 'sub4'] } });
  });

  it('falls back to the whole category from an empty level-2 node', async () => {
    // `other` has no parent to climb — this used to be a dead end.
    const { svc, prisma } = ladder((w) => !w.includes('subcategoryId'));

    const res = (await svc.findAll({ subcategoryId: 'other' })) as Similar;

    expect(res.similarFrom).toEqual({ id: 'cat1', name: 'Grains', kind: 'category' });
    expect(res.relaxed).toEqual(['taxonomy']);
    expect(whereAt(prisma, 1)).toEqual({ status: 'live', categoryId: 'cat1' });
  });

  it('tries any search word before dropping the search', async () => {
    // A typo in one word should not empty the page.
    const { svc, prisma } = ladder(() => true);
    const loose = (await svc.findAll({ search: 'rice zzzz' })) as Similar;
    expect(loose.relaxed).toEqual(['search']);
    // One OR over both words, instead of one AND entry per word.
    const and = whereAt(prisma, 1).AND as { OR: unknown[] }[];
    expect(and).toHaveLength(1);
    expect(and[0].OR).toHaveLength(2);

    // A single-word miss has nothing to loosen but the word itself.
    const miss = ladder((w) => !w.includes('zzzz'));
    expect(((await miss.svc.findAll({ search: 'zzzz' })) as Similar).relaxed).toEqual(['search', 'all']);
  });

  it('ends on the newest listings when nothing narrower matches', async () => {
    const { svc, prisma } = ladder((w) => w === '{"status":"live"}');

    const res = (await svc.findAll({ search: 'zzzz', grade: 'Nope' })) as Similar;

    expect(res.relaxed).toEqual(['grade', 'search', 'all']);
    expect(res.similarFrom).toBeUndefined();
    // Only visibility survives the last rung.
    expect(whereAt(prisma, prisma.product.findMany.mock.calls.length - 1)).toEqual({ status: 'live' });
  });

  it('never pads a result that has rows, and never invents one for an empty catalog', async () => {
    const full = ladder(() => true);
    full.prisma.product.count.mockResolvedValue(1);
    const res = (await full.svc.findAll({ grade: 'Nope' })) as Similar;
    expect(res.similar).toBeUndefined();
    expect(full.prisma.product.findMany).toHaveBeenCalledTimes(1);

    const empty = ladder(() => false);
    expect(((await empty.svc.findAll({})) as Similar).similar).toBeUndefined();
    expect(empty.prisma.product.findMany).toHaveBeenCalledTimes(1);
  });
});
