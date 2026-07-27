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
   * Canonical ENGLISH category name. The attribute schema is keyed by it, so
   * looking up with the localized `categoryName` matches nothing and the whole
   * detail section silently disappears in every non-English locale.
   */
  categoryNameEn: string;
  subcategoryId: string;
  subcategoryName: string;
  /** Names from the category down to the selected node, for the trigger label. */
  trail: string[];
  /** ENGLISH name to look attribute fields up under — nearest schema-bearing ancestor. */
  attrSource: string | null;
}

export const EMPTY_SELECTION: CategorySelection = {
  categoryId: '',
  categoryName: '',
  categoryNameEn: '',
  subcategoryId: '',
  subcategoryName: '',
  trail: [],
  attrSource: null,
};
