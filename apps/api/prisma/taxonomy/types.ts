/**
 * Shape of the product taxonomy tree. One module per top-level category lives
 * alongside this file; `index.ts` assembles them into `TAXONOMY`, which is the
 * single source of truth for both `seed.ts` (dev reseed) and `taxonomy-sync.ts`
 * (idempotent production sync).
 *
 * Levels 1 and 2 are FROZEN — they mirror the original agrobazar-derived list
 * name-for-name because `ATTRIBUTE_SCHEMA` in @agrotraders/types is keyed by
 * (category name, level-2 subcategory name), and the per-locale category labels
 * in packages/i18n/locales/<lng>/db-labels.json are keyed by the level-1 slug.
 * Renaming either would silently detach 2544 attribute fields and 10 locales.
 *
 * Levels 3+ are free to grow. The authoring rule: a node exists only if a buyer
 * would filter on it or a seller would list against it. Per-listing specs
 * (moisture %, packing, harvest year, origin port) belong in ATTRIBUTE_SCHEMA,
 * not here.
 */

/** A node at level 2 or deeper. `ru` is the Russian label seeded inline. */
export interface TaxNode {
  name: string;
  ru?: string;
  emoji?: string;
  children?: TaxNode[];
}

/** A top-level category. `tint` is the pastel card background used by the web UI. */
export interface TaxCategory {
  name: string;
  emoji: string;
  tint: string;
  children: TaxNode[];
}

/** Pastel card tints, kept identical to the originals in seed.ts. */
export const TINT = {
  green: '#DFF3E4',
  mint: '#EDF7EF',
  sand: '#FBF4E4',
  blush: '#FBE9E6',
  sky: '#E6F0F4',
  stone: '#F0EFEA',
} as const;

/** Depth cap enforced by the admin API. Level 1 is a Category, so 6 => 5 nested subcategory levels. */
export const MAX_TAXONOMY_DEPTH = 6;

/** Walk every node of a category depth-first, yielding the node and its ancestor chain. */
export function walkTaxonomy(
  category: TaxCategory,
  visit: (node: TaxNode, ancestors: TaxNode[]) => void,
): void {
  const recurse = (nodes: TaxNode[], ancestors: TaxNode[]) => {
    for (const node of nodes) {
      visit(node, ancestors);
      if (node.children?.length) recurse(node.children, [...ancestors, node]);
    }
  };
  recurse(category.children, []);
}
