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
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  /** Names from the category down to the selected node, for the trigger label. */
  trail: string[];
  /** Name to look attribute fields up under — the nearest schema-bearing ancestor. */
  attrSource: string | null;
}

export const EMPTY_SELECTION: CategorySelection = {
  categoryId: '',
  categoryName: '',
  subcategoryId: '',
  subcategoryName: '',
  trail: [],
  attrSource: null,
};
