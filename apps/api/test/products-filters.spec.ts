import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';
import { noQuotas } from './helpers/entitlements-stub';

/** sub3 (level 2) → sub4 (level 3); `other` is an unrelated level-2 branch. */
const NODES = [
  { id: 'sub3', name: 'Rice', parentId: null, categoryId: 'cat1', translations: [] },
  { id: 'sub4', name: 'Basmati', parentId: 'sub3', categoryId: 'cat1', translations: [] },
  { id: 'other', name: 'Wheat', parentId: null, categoryId: 'cat1', translations: [] },
];

function serviceForProducts() {
  const prisma = {
    product: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    subcategory: {
      findMany: vi.fn(async () => NODES.map(({ id, parentId }) => ({ id, parentId }))),
      // The empty-result fallback resolves the selected node and walks its
      // ancestors, so this is no longer optional for a zero-match query.
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => NODES.find((n) => n.id === where.id) ?? null),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { svc: new ProductsService(prisma as never, {} as never, {} as never, {
    // These specs assert the `where` clause, not the rendered rows — an empty
    // field map means no attribute specs and no facet definitions, which is
    // exactly the shape a product with no subcategory fields produces.
    fieldMap: async () => new Map(),
  } as never, noQuotas()), prisma };
}

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
    expect(prisma.subcategory.findMany).toHaveBeenCalledWith({
      where: { categoryId: 'cat1' },
      select: { id: true, parentId: true },
    });
  });

  it('matches a place against the listing itself OR its market, and keeps the search OR intact', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ country: 'India', city: 'Kandla', search: 'rice' });

    const { where } = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    // A listing with no market attached must still be findable by its own place.
    expect(where.AND).toEqual([
      { OR: [{ city: { equals: 'Kandla', mode: 'insensitive' } }, { market: { is: { city: { equals: 'Kandla', mode: 'insensitive' } } } }] },
      { OR: [{ country: { equals: 'India', mode: 'insensitive' } }, { market: { is: { country: { equals: 'India', mode: 'insensitive' } } } }] },
    ]);
    // The place filters live under AND precisely so they cannot swallow this.
    expect(where.OR).toEqual(
      expect.arrayContaining([{ name: { contains: 'rice', mode: 'insensitive' } }]),
    );
  });

  it('falls back to the nearest ancestor branch when a drill-down matches nothing', async () => {
    const { svc, prisma } = serviceForProducts();
    // Empty at sub4, but sub3 has one listing — the shape that used to render a
    // blank grid, because sellers list shallower than buyers drill.
    prisma.product.findMany
      .mockImplementationOnce(async () => [])
      .mockImplementationOnce(async () => [
        { id: 'p1', name: 'Basmati 1121', subcategoryId: 'sub3', attributes: null, translations: [] },
      ]);

    const res = (await svc.findAll({ categoryId: 'cat1', subcategoryId: 'sub4' })) as {
      total: number;
      similar?: { id: string }[];
      similarFrom?: { id: string; name: string };
    };

    expect(res.total).toBe(0);
    expect(res.similar?.map((p) => p.id)).toEqual(['p1']);
    expect(res.similarFrom).toEqual({ id: 'sub3', name: 'Rice' });
    // The relaxed query widens ONLY the taxonomy — it still runs the sellable
    // predicate and every other filter the buyer set.
    const relaxed = prisma.product.findMany.mock.calls[1][0] as { where: Record<string, unknown> };
    expect(relaxed.where).toMatchObject({ status: 'live', categoryId: 'cat1', subcategoryId: { in: ['sub3', 'sub4'] } });
  });

  it('does not invent a fallback when no subcategory was selected', async () => {
    const { svc } = serviceForProducts();
    const res = (await svc.findAll({ grade: 'NoSuchGrade' })) as { similar?: unknown };
    expect(res.similar).toBeUndefined();
  });
});

describe('ProductsService multi-select facets', () => {
  it('ORs the values of one facet — two categories means either, not both', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1,cat2', market: 'kandla,mundra', grade: 'Organic,Premium' });

    const { where } = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
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

  it('keeps the scalar form for a single value, so every existing deep link is unchanged', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1', market: 'kandla', grade: 'Organic' });

    const { where } = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where.categoryId).toBe('cat1');
    expect(where.market).toEqual({ slug: 'kandla' });
    expect(where.grade).toEqual({ equals: 'Organic', mode: 'insensitive' });
  });

  it('matches several places against either the listing or its market', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ country: 'India,Turkey' });

    const { where } = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where.AND).toEqual([
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

    const { where } = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    // AND-ing them wanted a listing that is simultaneously a discount and a live
    // lot — nearly always nothing, which read as a broken filter.
    expect(where.isOffer).toBeUndefined();
    expect(where.isAuction).toBeUndefined();
    expect(where.AND).toEqual([{ OR: [{ isOffer: true }, { isAuction: true }] }]);
  });

  it('still constrains directly when only one listing type is ticked', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ offer: 'true' });

    const { where } = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where.isOffer).toBe(true);
    expect(where.AND).toBeUndefined();
  });

  it('widens "ships to" to hasSome across several countries', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ supplyCountry: 'India,Oman' });

    const { where } = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where.supplyCountries).toEqual({ hasSome: ['India', 'Oman'] });
  });

  it('scopes the subcategory branch walk to a category only when exactly one is picked', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1,cat2', subcategoryId: 'sub3' });

    // With two categories selected there is no single branch to scope to, so the
    // walk spans every subcategory — wider, but never wrong.
    expect(prisma.subcategory.findMany).toHaveBeenCalledWith({
      where: undefined,
      select: { id: true, parentId: true },
    });
  });
});
