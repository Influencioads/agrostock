import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';

function serviceForProducts() {
  const prisma = {
    product: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    subcategory: {
      findMany: vi.fn(async () => [
        { id: 'sub3', parentId: null },
        { id: 'sub4', parentId: 'sub3' },
        { id: 'other', parentId: null },
      ]),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { svc: new ProductsService(prisma as never, {} as never, {} as never, {
    // These specs assert the `where` clause, not the rendered rows — an empty
    // field map means no attribute specs and no facet definitions, which is
    // exactly the shape a product with no subcategory fields produces.
    fieldMap: async () => new Map(),
  } as never), prisma };
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
});
