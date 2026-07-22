import { describe, expect, it } from 'vitest';
import type { ApiSubcategory } from '@agrotraders/api-client';
import { buildSubcategoryTree, findSubcategoryPath } from '@agrotraders/api-client';

const sub = (id: string, name: string, parentId: string | null = null): ApiSubcategory =>
  ({ id, name, slug: id, parentId, categoryId: 'cat', sort: 0, emoji: null, options: [], _count: { products: 0 } }) as ApiSubcategory;

describe('category tree helpers', () => {
  it('finds the full drill path for a nested subcategory', () => {
    const tree = buildSubcategoryTree([
      sub('grain', 'Grain'),
      sub('rice', 'Rice', 'grain'),
      sub('basmati', 'Basmati', 'rice'),
      sub('fruit', 'Fruit'),
    ]);

    expect(findSubcategoryPath(tree, 'basmati').map((node) => node.name)).toEqual(['Grain', 'Rice', 'Basmati']);
  });
});
