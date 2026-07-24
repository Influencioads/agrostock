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
  return { svc: new ProductsService(prisma as never, {} as never), prisma };
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
});
