import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CategoriesService, MAX_TAXONOMY_DEPTH } from '../src/catalog/catalog.module';
import { ProductsService } from '../src/products/products.module';

type Node = { id: string; name: string; parentId: string | null; categoryId: string };

/**
 * A stateful fake over a real nested tree, so the ancestor walks (`depthOf`,
 * `wouldCycle`, `subtreeHeight`) exercise actual traversal rather than a
 * hand-sequenced list of mock returns.
 */
function serviceWithTree(nodes: Node[], categoryId = 'cat1') {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const prisma = {
    category: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, slug: 'grain', name: 'Grain' })),
      findMany: vi.fn(async () => []),
    },
    subcategory: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => byId.get(where.id) ?? null),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async ({ where }: { where: { parentId?: { in: string[] } } }) => {
        const parents = where?.parentId?.in ?? [];
        return nodes.filter((n) => n.parentId && parents.includes(n.parentId));
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: unknown }) => ({ id: where.id, ...(data as object) })),
      create: vi.fn(async ({ data }: { data: unknown }) => ({ id: 'new', ...(data as object) })),
      delete: vi.fn(async () => ({ id: 'gone' })),
    },
  };
  return { svc: new CategoriesService(prisma as never), prisma, categoryId };
}

/** Grain > Rice > Basmati > 1121 Steam — a genuine four-level branch. */
const riceTree: Node[] = [
  { id: 'rice', name: 'Rice', parentId: null, categoryId: 'cat1' },
  { id: 'basmati', name: 'Basmati', parentId: 'rice', categoryId: 'cat1' },
  { id: 'steam', name: '1121 Steam', parentId: 'basmati', categoryId: 'cat1' },
];

describe('CategoriesService reparenting', () => {
  it('rejects moving a node inside its own subtree', async () => {
    const { svc, prisma } = serviceWithTree(riceTree);

    await expect(svc.updateSubcategory('rice', { parentId: 'steam' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.subcategory.update).not.toHaveBeenCalled();
  });

  it('rejects moving a node under itself', async () => {
    const { svc } = serviceWithTree(riceTree);
    await expect(svc.updateSubcategory('basmati', { parentId: 'basmati' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects moving a node into a different category', async () => {
    const { svc } = serviceWithTree([...riceTree, { id: 'wheat', name: 'Wheat', parentId: null, categoryId: 'cat2' }]);

    await expect(svc.updateSubcategory('basmati', { parentId: 'wheat' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('moves a node and its subtree to a valid new parent', async () => {
    const { svc, prisma } = serviceWithTree(riceTree);

    await svc.updateSubcategory('steam', { parentId: 'rice' });

    expect(prisma.subcategory.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'steam' }, data: expect.objectContaining({ parentId: 'rice' }) }),
    );
  });

  it('promotes a node back to level 2 with parentId null', async () => {
    const { svc, prisma } = serviceWithTree(riceTree);

    await svc.updateSubcategory('steam', { parentId: null });

    expect(prisma.subcategory.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentId: null }) }),
    );
  });

  it('rejects a move that would push the subtree past the depth cap', async () => {
    // A chain already at the maximum depth, plus a two-tall subtree to graft on.
    const deep: Node[] = Array.from({ length: MAX_TAXONOMY_DEPTH - 1 }, (_, i) => ({
      id: `d${i}`,
      name: `Level ${i + 2}`,
      parentId: i === 0 ? null : `d${i - 1}`,
      categoryId: 'cat1',
    }));
    const graft: Node[] = [
      { id: 'top', name: 'Top', parentId: null, categoryId: 'cat1' },
      { id: 'mid', name: 'Mid', parentId: 'top', categoryId: 'cat1' },
    ];
    const { svc, prisma } = serviceWithTree([...deep, ...graft]);

    await expect(
      svc.updateSubcategory('top', { parentId: `d${MAX_TAXONOMY_DEPTH - 2}` }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.subcategory.update).not.toHaveBeenCalled();
  });

  it('refuses to create a child below the depth cap', async () => {
    const deep: Node[] = Array.from({ length: MAX_TAXONOMY_DEPTH - 1 }, (_, i) => ({
      id: `d${i}`,
      name: `Level ${i + 2}`,
      parentId: i === 0 ? null : `d${i - 1}`,
      categoryId: 'cat1',
    }));
    const { svc, prisma } = serviceWithTree(deep);

    await expect(
      svc.createSubcategory('cat1', { name: 'Too deep', parentId: `d${MAX_TAXONOMY_DEPTH - 2}` }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.subcategory.create).not.toHaveBeenCalled();
  });
});

/* ── Products: deep selections must stay branch-inclusive ───────────── */

function serviceForProducts() {
  const prisma = {
    product: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
    category: { findUnique: vi.fn(async () => ({ name: 'Grain' })) },
    subcategory: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        riceTree.find((n) => n.id === where.id) ?? null,
      ),
      findFirst: vi.fn(async ({ where }: { where: { name: string } }) =>
        riceTree.find((n) => n.name === where.name) ?? null,
      ),
      findMany: vi.fn(async () => riceTree.map((n) => ({ id: n.id, parentId: n.parentId }))),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { svc: new ProductsService(prisma as never, {} as never), prisma };
}

describe('ProductsService deep taxonomy filters', () => {
  it('includes level-4 descendants when filtering by a level-2 subcategory id', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1', subcategoryId: 'rice' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subcategoryId: { in: ['rice', 'basmati', 'steam'] } }),
      }),
    );
  });

  it('resolves a subcategory NAME to its branch instead of an exact match', async () => {
    const { svc, prisma } = serviceForProducts();

    await svc.findAll({ categoryId: 'cat1', subcategory: 'Basmati' });

    const call = prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    // Before the fix this was `subcategory: { name: 'Basmati' }`, which matched
    // the one row and silently hid every listing filed under 1121 Steam.
    expect(call.where.subcategoryId).toEqual({ in: ['basmati', 'steam'] });
    expect(call.where.subcategory).toBeUndefined();
  });
});
