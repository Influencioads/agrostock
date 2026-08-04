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

/**
 * Singular stem. The two datasets pluralize freely on one side and not the
 * other — the field says "Hatchery" where the taxonomy node says "Hatcheries",
 * "Briquette press" against "Briquette presses".
 */
const singular = (w: string): string => {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  // "-es" only where English needs it. A single "s" before it is the giveaway
  // that it did not: "presses" → "press" but "farmhouses" → "farmhouse".
  if (w.length > 4 && /(?:sses|(?:x|z|ch|sh)es)$/.test(w)) return w.slice(0, -2);
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
};

/**
 * One spelling per word. The field list writes US English ("Pasteurized",
 * "Color sorter", "Homogenizer"), the taxonomy writes British ("Pasteurised
 * milk", "Optical colour sorters", "Homogenisers") — so the same value never
 * matched itself across the two.
 *
 * Both sides go through this, so the rule only has to be CONSISTENT, not
 * linguistically right: "flour" → "flor" and "cruise" → "cruize" on either side
 * and still match themselves. Plurals come off first, so "colours" → "colour" →
 * "color" lands on the same stem as "color".
 */
const fold = (w: string): string =>
  singular(w)
    .replace(/is(e|ed|er|ing|ation)$/, 'iz$1')
    .replace(/our$/, 'or');

/**
 * Words of a taxonomy label or option value, normalized so the two can be
 * compared: parentheticals dropped ("Medium (MED)" → "medium"), accents folded
 * ("Oblačinska" → "oblacinska"), punctuation flattened ("In-shell" → "in
 * shell"), plurals trimmed and spellings folded (see `fold`). `/` and `.`
 * survive so a size code ("23/25", "No.1") stays one word.
 *
 * Exported for the reverse lookup in `backfill:product-leaf`, which has to check
 * that a candidate node says nothing the listing itself never said.
 */
export const labelWords = (s: string): string[] =>
  s
    .toLowerCase()
    .normalize('NFKD')
    // Drop the combining marks NFKD just split off, rather than letting the
    // punctuation pass turn them into word breaks ("purée" → "pure e").
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9/.]+/g, ' ')
    .split(' ')
    // A lone separator ("Flour / meal" → "/") is punctuation, not a word.
    .filter((w) => /[a-z0-9]/.test(w))
    .map(fold);

/**
 * The readings of one option value. A slash between words means "same thing,
 * two names" — `color` offers "Purple/Violet" where the taxonomy node says
 * "Purple artichoke", and `variety` offers "Williams / Bartlett" against
 * "Williams (Bartlett)". Either half identifies the value, so each is tried on
 * its own; demanding both matched neither, which is what left 387 option/node
 * pairs unable to see each other.
 *
 * A slash BETWEEN DIGITS is a size code, not a choice — "23/25" and "30/32" are
 * single values and are rejoined.
 */
function readings(option: string): string[] {
  // Parentheticals go first: the slash in "Cattle (cow/ox)" is inside the aside,
  // and splitting on it would leave two halves with an unbalanced bracket that
  // `labelWords` can no longer strip.
  const parts = option.replace(/\([^)]*\)/g, ' ').split('/');
  if (parts.length === 1) return parts;
  const out: string[] = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    if (prev !== undefined && /\d\s*$/.test(prev) && /^\s*\d/.test(part)) out[out.length - 1] = `${prev}/${part}`;
    else out.push(part);
  }
  return out;
}

/**
 * Does this taxonomy node name already state `value`? Every word of the value
 * has to appear in the name — "Nonpareil in-shell" states both "Nonpareil" and
 * "In-shell"; "Roasted almond" states "Roasted" but not "Nonpareil". A value
 * with alternative spellings needs only one of them stated (see `readings`).
 *
 * Drives both directions: hiding a field the path answers, and finding the child
 * node an existing listing's attribute value belongs under.
 */
export function nameStatesValue(nodeName: string, value: string): boolean {
  return nodeStates(new Set(labelWords(nodeName)), value);
}

const nodeStates = (nodeWords: Set<string>, option: string): boolean =>
  readings(option).some((reading) => {
    const want = labelWords(reading);
    // A two-letter option ("No", "US") is too weak to pin a whole field on.
    // Measured on the value as a whole, or a numeric range ("60-90 mm", every
    // token short) could never match the node that spells it out.
    if (want.join('').length < 3) return false;
    return want.every((w) => nodeWords.has(w));
  });

/**
 * The fields a taxonomy path has NOT already answered.
 *
 * Levels 3-5 of the taxonomy restate the level-2 attribute options as nodes —
 * `Almond` owns `form`/`variety`/`count_per_oz`, and its descendants spell the
 * same choices out as "In-shell almond" › "Nonpareil in-shell" › "Size 32/34 mm".
 * Asking a seller for a value their subcategory already encodes (and offering a
 * buyer a facet their drill-down already applied) is the same question twice, so
 * any field whose options are named somewhere on the path drops out.
 *
 * `pathNames` must be the CANONICAL ENGLISH names (`nameEn`), because `options`
 * are canonical English — a localized path matches nothing.
 */
export function fieldsNotOnPath(fields: AttrField[], pathNames: string[]): AttrField[] {
  if (!pathNames.length) return fields;
  const nodes = pathNames.map((n) => new Set(labelWords(n)));
  const kept = fields.filter(
    (f) => !(f.options ?? []).some((opt) => nodes.some((words) => nodeStates(words, opt))),
  );
  // Same array back when nothing dropped: `fieldMap` shares one field list by
  // reference across every node that inherits it, and a fresh array per node
  // would multiply that by 13k.
  return kept.length === fields.length ? fields : kept;
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
