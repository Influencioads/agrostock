import type { AttrField } from '@agrotraders/types';

/**
 * The value a category pick produces, kept in its own module so plain logic
 * (and its tests) can depend on it without pulling in the React Native sheet
 * that produces it.
 *
 * Selecting emits ids, not names: the products API is branch-inclusive by
 * `subcategoryId`, so picking a parent returns everything beneath it.
 */
export interface CategorySelection {
  categoryId: string;
  /** Localized label, for display. */
  categoryName: string;
  /**
   * Canonical ENGLISH category name — still shipped because stored product
   * values and the `attr_*` filters are English.
   */
  categoryNameEn: string;
  subcategoryId: string;
  subcategoryName: string;
  /** Names from the category down to the selected node, for the trigger label. */
  trail: string[];
  /**
   * The attribute fields that apply to this pick, already resolved along the
   * path (a node with none inherits from its nearest ancestor that has some)
   * and already localized by the API. Carried on the selection so the form and
   * the filter sheet never have to walk the tree themselves.
   */
  attrFields: AttrField[];
}

export const EMPTY_SELECTION: CategorySelection = {
  categoryId: '',
  categoryName: '',
  categoryNameEn: '',
  subcategoryId: '',
  subcategoryName: '',
  trail: [],
  attrFields: [],
};
