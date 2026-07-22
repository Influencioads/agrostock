import { getAttributeFields } from '@agrotraders/types';
import type { ApiSubcategory } from './index';

/**
 * Helpers for the nested product taxonomy. `GET /categories` returns each
 * category's subcategories as a FLAT array; every client rebuilds the tree from
 * `parentId` with `buildSubcategoryTree`. Shared here so web, admin and mobile
 * cannot drift apart on drill-down behaviour.
 */

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

export function findSubcategoryPath(nodes: SubcategoryNode[], id: string): SubcategoryNode[] {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const childPath = findSubcategoryPath(node.children, id);
    if (childPath.length > 0) return [node, ...childPath];
  }
  return [];
}

/**
 * The name to look attribute fields up under, for a selection at any depth.
 *
 * `ATTRIBUTE_SCHEMA` is keyed by (category name, LEVEL-2 subcategory name), but
 * the taxonomy now runs five levels deep. Walking up from the selected node to
 * the nearest ancestor the schema recognises is what lets a buyer who drilled to
 * "Grain › Rice › Basmati › 1121 Steam" still see Rice's facets, instead of the
 * empty field list a direct lookup would return.
 *
 * Pass the path from `findSubcategoryPath` (root-first). Returns `null` when
 * nothing in the chain has a schema entry — callers should then render no
 * attribute fields rather than guessing.
 */
export function attributeSourceName(path: SubcategoryNode[], categoryName?: string | null): string | null {
  if (!categoryName) return null;
  for (let i = path.length - 1; i >= 0; i--) {
    if (getAttributeFields(categoryName, path[i].name).length > 0) return path[i].name;
  }
  return null;
}
