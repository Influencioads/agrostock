import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CategoriesService } from '../src/catalog/catalog.module';

function serviceForTaxonomy() {
  const prisma = {
    category: {
      findUnique: vi.fn(async () => ({ id: 'cat1', slug: 'grain' })),
      findMany: vi.fn(async () => []),
    },
    subcategory: {
      findUnique: vi.fn(async () => ({ id: 'parent1', categoryId: 'cat1', slug: 'grain-rice', _count: { products: 0, children: 0 } })),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }) => ({ id: 'child1', ...data })),
      update: vi.fn(async ({ data }) => ({ id: 'sub1', ...data })),
      delete: vi.fn(async () => ({ id: 'sub1' })),
    },
  };
  return { svc: new CategoriesService(prisma as never), prisma };
}

describe('CategoriesService nested taxonomy', () => {
  it('creates a child subcategory under another subcategory', async () => {
    const { svc, prisma } = serviceForTaxonomy();

    await svc.createSubcategory('cat1', { name: 'Basmati', parentId: 'parent1' });

    expect(prisma.subcategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Basmati',
          categoryId: 'cat1',
          parentId: 'parent1',
        }),
      }),
    );
  });

  it('rejects a parent subcategory from a different category', async () => {
    const { svc, prisma } = serviceForTaxonomy();
    prisma.subcategory.findUnique.mockResolvedValueOnce({ id: 'parent1', categoryId: 'other', slug: 'other-parent' });

    await expect(svc.createSubcategory('cat1', { name: 'Basmati', parentId: 'parent1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows the same child name under a different parent branch', async () => {
    const { svc, prisma } = serviceForTaxonomy();

    await svc.createSubcategory('cat1', { name: 'Premium', parentId: 'parent1' });

    expect(prisma.subcategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { categoryId: 'cat1', parentId: 'parent1', name: 'Premium' },
      }),
    );
    expect(prisma.subcategory.create).toHaveBeenCalled();
  });

  it('rejects a duplicate subcategory name under the same parent', async () => {
    const { svc, prisma } = serviceForTaxonomy();
    prisma.subcategory.findFirst.mockResolvedValueOnce({ id: 'existing' });

    await expect(svc.createSubcategory('cat1', { name: 'Premium', parentId: 'parent1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.subcategory.create).not.toHaveBeenCalled();
  });

  it('does not delete a subcategory that still has child subcategories', async () => {
    const { svc, prisma } = serviceForTaxonomy();
    prisma.subcategory.findUnique.mockResolvedValueOnce({ id: 'parent1', categoryId: 'cat1', _count: { products: 0, children: 2 } });

    await expect(svc.removeSubcategory('parent1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.subcategory.delete).not.toHaveBeenCalled();
  });
});
