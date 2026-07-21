import type { ApiSubcategory } from '@agrotraders/api-client';

export type SubcategoryNode = ApiSubcategory & { children: SubcategoryNode[] };

export type FlatSubcategoryNode = {
  node: SubcategoryNode;
  depth: number;
};

const sortSubcategories = <T extends Pick<ApiSubcategory, 'name' | 'sort'>>(items: T[]) =>
  [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));

export function buildSubcategoryTree(subcategories: ApiSubcategory[] = [], parentId: string | null = null): SubcategoryNode[] {
  return sortSubcategories(subcategories.filter((sub) => (sub.parentId ?? null) === parentId)).map((sub) => ({
    ...sub,
    children: buildSubcategoryTree(subcategories, sub.id),
  }));
}

export function flattenSubcategoryTree(nodes: SubcategoryNode[], depth = 0): FlatSubcategoryNode[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flattenSubcategoryTree(node.children, depth + 1),
  ]);
}
