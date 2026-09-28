import { splitFilterValues, toUsdAmount, type ProductQuery } from '@agrotraders/api-client';
import { EMPTY_SELECTION, type CategorySelection } from './categorySelection';

/**
 * The complete browse-filter state, as one value.
 *
 * Keeping it in a single object is what lets the filter sheet edit a *draft* and
 * commit it on APPLY: the previous screen held nine independent `useState`s, so
 * every chip tap immediately re-ran the products query. The committed object is
 * also the react-query cache key and a navigation param (the home hero hands it
 * to the Products route), so it must stay plain and serialisable.
 */
export interface Filters {
  selection: CategorySelection;
  /** Checkbox flags, keyed by the ids in `FLAG_GROUPS`. */
  flags: Record<string, boolean>;
  /** Multi-select value lists — the API ORs the values within each one. */
  market: string[];
  city: string[];
  country: string[];
  /** Countries the seller ships to. */
  supplyCountry: string[];
  grade: string[];
  /** In the DISPLAY currency, as typed; converted to USD cents in `toQuery`. */
  minPrice: string;
  maxPrice: string;
  /** Category-specific attribute picks: field key → selected values. */
  attrs: Record<string, string[]>;
}

/** The value-list groups, in `Filters` field names (which are also the rail group ids). */
export const LIST_GROUPS = ['country', 'city', 'market', 'supplyCountry', 'grade'] as const;
export type ListGroup = (typeof LIST_GROUPS)[number];

/**
 * The flag checkboxes by rail group, as web's /market lays them out. Deal and
 * pricing are pairs of opposites: ticking one side filters to it, ticking
 * neither or both means "either" — which a single on/off switch could not say.
 */
export const FLAG_GROUPS = {
  dealType: ['safe', 'direct'],
  pricing: ['negotiable', 'fixed'],
  listing: ['offer', 'auction'],
  seller: ['verified'],
} as const;
export type FlagGroup = keyof typeof FLAG_GROUPS;
export const FLAG_IDS = Object.values(FLAG_GROUPS).flat();

/** Grid orderings, shared by the listing and the home hero. Labels come from
 *  `pubX.browse.sort.<id>`; the ids are web's /market ones, so a link's `sort` carries over. */
export const SORTS = ['relevance', 'price_asc', 'price_desc', 'rating'];

/** Rail/chip id prefix for an attribute field, e.g. `attr:processing`. */
export const ATTR_PREFIX = 'attr:';

export const EMPTY_FILTERS: Filters = {
  selection: EMPTY_SELECTION,
  flags: {},
  market: [],
  city: [],
  country: [],
  supplyCountry: [],
  grade: [],
  minPrice: '',
  maxPrice: '',
  attrs: {},
};

/**
 * A web /market query string (as a deep link's string params) → Filters, so
 * agrotraders://market?… opens what the same web URL lists. Web's names: CSV
 * lists, `deal`/`pricing`/`listing` groups whose values are our flag ids,
 * `verified=true` and `attr_<key>`. The sheet holds one category, so only the
 * first `categoryId` is kept. A link carries no resolved attribute fields, so
 * picked attributes still filter but the sheet asks no attribute questions
 * until a category is picked again.
 */
export function filtersFromParams(p: Record<string, unknown>): Filters {
  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : '');
  const list = (k: string) => splitFilterValues(str(k));
  const flags: Record<string, boolean> = {};
  for (const id of ['deal', 'pricing', 'listing'].flatMap(list)) flags[id] = true;
  if (list('verified').includes('true')) flags.verified = true;
  const attrs: Record<string, string[]> = {};
  for (const k of Object.keys(p)) {
    const v = k.startsWith('attr_') ? list(k) : [];
    if (v.length) attrs[k.slice(5)] = v;
  }
  const category = list('category')[0] ?? '';
  return {
    ...EMPTY_FILTERS,
    selection: {
      ...EMPTY_SELECTION,
      categoryId: list('categoryId')[0] ?? '',
      categoryName: category,
      subcategoryId: str('subcategoryId'),
      subcategoryName: str('subcategory'),
      trail: [category, str('subcategory')].filter(Boolean),
    },
    flags,
    market: list('market'),
    city: list('city'),
    country: list('country'),
    supplyCountry: list('supplyCountry'),
    grade: list('grade'),
    minPrice: str('minPrice'),
    maxPrice: str('maxPrice'),
    attrs,
  };
}

/** A typed price as a number, or undefined when blank or unparseable. Accepts a decimal comma. */
function parsePrice(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * How many filters the user has applied — drives the count bubble on the FILTER
 * bar. A price range counts once however many of its two ends are filled, and a
 * value list or attribute facet counts once however many values it holds, so
 * the number reads as "things I narrowed by". An unparseable price is ignored
 * by the API, so it is not counted either.
 */
export function countActive(f: Filters): number {
  let n = 0;
  if (f.selection.categoryId) n++;
  n += FLAG_IDS.filter((id) => f.flags[id]).length;
  n += LIST_GROUPS.filter((g) => f[g].length > 0).length;
  if (parsePrice(f.minPrice) != null || parsePrice(f.maxPrice) != null) n++;
  n += Object.values(f.attrs).filter((v) => v.length > 0).length;
  return n;
}

/** Clears one group without disturbing the rest. */
export function clearGroup(f: Filters, group: string): Filters {
  if (group === 'category') {
    // Attribute facets are defined by the category, so they go with it.
    return { ...f, selection: EMPTY_SELECTION, attrs: {} };
  }
  if (group === 'price') return { ...f, minPrice: '', maxPrice: '' };
  if (group in FLAG_GROUPS) {
    const flags = { ...f.flags };
    for (const id of FLAG_GROUPS[group as FlagGroup]) delete flags[id];
    return { ...f, flags };
  }
  // Attribute rail ids are prefixed: a field can be keyed `grade`, like the list.
  const attr = group.startsWith(ATTR_PREFIX) ? group.slice(ATTR_PREFIX.length) : null;
  if (attr == null && (LIST_GROUPS as readonly string[]).includes(group)) return { ...f, [group]: [] };
  // Anything else is an attribute field key.
  const attrs = { ...f.attrs };
  delete attrs[attr ?? group];
  return { ...f, attrs };
}

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Adds or removes one value from a value-list group. */
export function toggleValue(f: Filters, group: ListGroup, value: string): Filters {
  return { ...f, [group]: toggle(f[group], value) };
}

/** Adds or removes one value from a multi-select attribute facet. */
export function toggleAttr(f: Filters, key: string, value: string): Filters {
  const next = toggle(f.attrs[key] ?? [], value);
  const attrs = { ...f.attrs };
  if (next.length) attrs[key] = next;
  else delete attrs[key];
  return { ...f, attrs };
}

/**
 * Builds the API query. `rate` is the display currency's USD rate: prices are
 * typed in the currency the cards are shown in, and the API filters USD cents.
 * Omit `sort` for a facet query — it only orders the grid.
 */
export function toQuery(f: Filters, search: string, sort?: string, rate = 1): ProductQuery {
  const cents = (v: string) => {
    const n = parsePrice(v);
    return n == null ? undefined : Math.round(toUsdAmount(n, rate) * 100);
  };
  // Neither side or both sides ticked is the same query: no constraint.
  const eitherOr = (yes: string, no: string) => (!!f.flags[yes] === !!f.flags[no] ? undefined : !!f.flags[yes]);
  const list = (v: string[]) => (v.length ? v : undefined);
  return {
    search: search.trim() || undefined,
    sort,
    categoryId: f.selection.categoryId || undefined,
    subcategoryId: f.selection.subcategoryId || undefined,
    market: list(f.market),
    city: list(f.city),
    country: list(f.country),
    supplyCountry: list(f.supplyCountry),
    grade: list(f.grade),
    minPrice: cents(f.minPrice),
    maxPrice: cents(f.maxPrice),
    verified: f.flags.verified || undefined,
    safe: eitherOr('safe', 'direct'),
    negotiable: eitherOr('negotiable', 'fixed'),
    offer: f.flags.offer || undefined,
    auction: f.flags.auction || undefined,
    // The API types attr_* from the selected node, so attributes only travel with one.
    attrs: f.selection.subcategoryId && Object.keys(f.attrs).length ? f.attrs : undefined,
  };
}
