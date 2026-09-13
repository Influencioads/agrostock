import { fieldsNotOnPath, type AttrField } from '@agrotraders/types';
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

/**
 * Rebuild the tree from a flat array. `parentId` roots it somewhere other than
 * the top; every caller today takes the default.
 *
 * Buckets by `parentId` in one pass rather than re-filtering the whole array per
 * node. That filter made this quadratic — 1615 nodes (the real size of "Seeds &
 * planting material") meant 2.6M comparisons, measured at 119ms on a warm V8 and
 * proportionally worse under Hermes. It runs inside a render-phase useMemo, so
 * that was a hard JS-thread freeze every time someone opened a large category,
 * which reads as the category not responding to the tap at all. Same output,
 * same ordering, ~40x faster.
 */
export function buildSubcategoryTree(subcategories: ApiSubcategory[] = [], parentId: string | null = null): SubcategoryNode[] {
  const byParent = new Map<string | null, ApiSubcategory[]>();
  for (const sub of subcategories) {
    const key = sub.parentId ?? null;
    const siblings = byParent.get(key);
    if (siblings) siblings.push(sub);
    else byParent.set(key, [sub]);
  }
  const build = (under: string | null): SubcategoryNode[] =>
    sortSubcategories(byParent.get(under) ?? []).map((sub) => ({ ...sub, children: build(sub.id) }));
  return build(parentId);
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
 * Fields the path itself already answers are dropped (`fieldsNotOnPath`): once
 * you have drilled to "Nonpareil in-shell", asking for Form and Variety again is
 * the same question twice. Matching is on `nameEn`, since options are English.
 *
 * Pass the path from `findSubcategoryPath` (root-first). Empty means the
 * selection genuinely has no fields, and callers should render none.
 */
export function resolveAttrFields(path: SubcategoryNode[]): AttrField[] {
  for (let i = path.length - 1; i >= 0; i--) {
    const fields = path[i].attrFields;
    if (fields?.length) return fieldsNotOnPath(fields, path.map(schemaName));
  }
  return [];
}

/**
 * The facets to offer a BROWSING buyer standing on `node`.
 *
 * Two narrowings compete on the same screen: the node's children, and the
 * attribute options. At "Nonpareil kernels" the children are "Count 18/20 per
 * oz", "Count 20/22 per oz"… and the `count_per_oz` facet lists 18/20, 20/22…
 * — the same question asked twice, in two controls, in two columns. The
 * drill-down wins, so a facet the children already offer drops out.
 *
 * Browse only. `resolveAttrFields` stays the answer for a SELLER: someone who
 * stops at "Nonpareil kernels" without picking a count still has to state one,
 * and hiding the field would make it unrecordable.
 */
export function browseAttrFields(path: SubcategoryNode[], children: SubcategoryNode[]): AttrField[] {
  return fieldsNotOnPath(resolveAttrFields(path), children.map(schemaName));
}

/** The English name a taxonomy row must be looked up under. */
export const schemaName = <T extends { name: string; nameEn?: string }>(row: T | null | undefined): string =>
  row ? row.nameEn || row.name : '';
