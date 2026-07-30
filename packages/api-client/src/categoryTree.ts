import type { AttrField } from '@agrotraders/types';
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
 * The attribute fields in force for a selection at any depth.
 *
 * Fields are attached to a subcategory by an admin, and a node with none
 * inherits from its nearest ancestor that has some — that is what lets a buyer
 * who drilled to "Grain > Rice > Basmati > 1121 Steam" still see Rice's facets
 * instead of the empty list a direct lookup would return.
 *
 * Pass the path from `findSubcategoryPath` (root-first). Empty means the
 * selection genuinely has no fields, and callers should render none.
 */
export function resolveAttrFields(path: SubcategoryNode[]): AttrField[] {
  for (let i = path.length - 1; i >= 0; i--) {
    const fields = path[i].attrFields;
    if (fields?.length) return fields;
  }
  return [];
}

/** The English name a taxonomy row must be looked up under. */
export const schemaName = <T extends { name: string; nameEn?: string }>(row: T | null | undefined): string =>
  row ? row.nameEn || row.name : '';
