/**
 * Product attribute fields: the per-subcategory detail panel on the "Add
 * product" form, and the facets buyers filter on.
 *
 * THE DEFINITIONS LIVE IN THE DATABASE, on `Subcategory.attrFields`, and are
 * edited by admins (Admin › Categories › Fields). This module holds only their
 * shape. It used to hold a 26,500-line generated table too, which meant nobody
 * could add a field without regenerating a checked-in artifact and eleven locale
 * catalogs by hand; that table is now `apps/api/prisma/attribute-seed.json`,
 * used once by `seed:attrs` and never shipped to a client.
 *
 * How the definitions reach you:
 *   · clients — on the category tree, per node; resolve with `resolveAttrFields`
 *     (`@agrotraders/api-client`), which walks up to the nearest ancestor that
 *     defines any, because a node with none inherits.
 *   · API     — `CategoriesService.fieldMap(locale)`.
 *   · display — read surfaces get `product.attributeSpecs`, already localized
 *     and formatted, rather than resolving definitions themselves.
 */

export type AttrFieldType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date';

export interface AttrField {
  /** Stable snake_case key — the JSON storage key under Product.attributes. */
  key: string;
  /** Display label, already localized by the API. */
  label: string;
  type: AttrFieldType;
  /** Unit suffix for number fields (e.g. "%", "mm", "kg"). */
  unit?: string;
  /**
   * Choices for select / multiselect fields. Always canonical ENGLISH — these
   * are the values stored on Product.attributes and matched by the `attr_*`
   * buyer facets, so they must never be translated. Display text rides in
   * `optionLabels`.
   */
  options?: string[];
  /**
   * Positional display labels for `options`, filled in by the API from the
   * subcategory's locale dict. Same length as `options` when present; absent
   * means "render the option values themselves".
   */
  optionLabels?: string[];
  /** Suggested-required at submission. */
  required?: boolean;
  help?: string;
}

/** Field types that make sensible buyer filter facets (discrete choices). */
export const FILTERABLE_TYPES: AttrFieldType[] = ['select', 'multiselect', 'boolean'];

/** The subset of a field list usable as buyer facets. */
export function filterFields(fields: AttrField[]): AttrField[] {
  return fields.filter((f) => FILTERABLE_TYPES.includes(f.type));
}

/** Display text for one option value, honouring the locale overlay. */
export function optionLabel(field: AttrField, value: string): string {
  const i = field.options?.indexOf(value) ?? -1;
  return i >= 0 ? (field.optionLabels?.[i] ?? value) : value;
}
