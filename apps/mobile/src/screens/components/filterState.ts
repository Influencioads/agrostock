import type { ProductQuery } from '@agrotraders/api-client';
import { EMPTY_SELECTION, type CategorySelection } from './categorySelection';

/**
 * The complete browse-filter state, as one value.
 *
 * Keeping it in a single object is what lets the filter sheet edit a *draft* and
 * commit it on APPLY: the previous screen held nine independent `useState`s, so
 * every chip tap immediately re-ran the products query. The committed object is
 * also the react-query cache key, so it must stay plain and serialisable.
 */
export interface Filters {
  selection: CategorySelection;
  /** Boolean product flags: verified · safe · offer · auction. */
  flags: Record<string, boolean>;
  market: string;
  city: string;
  country: string;
  grade: string;
  /** Whole currency units as typed; converted to cents in `toQuery`. */
  minPrice: string;
  maxPrice: string;
  /** Category-specific attribute picks: field key → selected values. */
  attrs: Record<string, string[]>;
}

export const FLAG_IDS = ['verified', 'safe', 'offer', 'auction'] as const;

export const EMPTY_FILTERS: Filters = {
  selection: EMPTY_SELECTION,
  flags: {},
  market: '',
  city: '',
  country: '',
  grade: '',
  minPrice: '',
  maxPrice: '',
  attrs: {},
};

/**
 * How many filters the user has applied — drives the count bubble on the FILTER
 * bar. A price range counts once however many of its two ends are filled, and
 * each attribute facet counts once regardless of how many values it holds, so
 * the number reads as "things I narrowed by".
 */
export function countActive(f: Filters): number {
  let n = 0;
  if (f.selection.categoryId) n++;
  n += FLAG_IDS.filter((id) => f.flags[id]).length;
  if (f.market) n++;
  if (f.city) n++;
  if (f.country) n++;
  if (f.grade) n++;
  if (f.minPrice || f.maxPrice) n++;
  n += Object.values(f.attrs).filter((v) => v.length > 0).length;
  return n;
}

/** Clears one group without disturbing the rest. */
export function clearGroup(f: Filters, group: string): Filters {
  switch (group) {
    case 'category':
      // Attribute facets are defined by the category, so they go with it.
      return { ...f, selection: EMPTY_SELECTION, attrs: {} };
    case 'dealType':
      return { ...f, flags: {} };
    case 'price':
      return { ...f, minPrice: '', maxPrice: '' };
    case 'market':
      return { ...f, market: '' };
    case 'city':
      return { ...f, city: '' };
    case 'country':
      return { ...f, country: '' };
    case 'grade':
      return { ...f, grade: '' };
    default: {
      // Anything else is an attribute field key.
      const attrs = { ...f.attrs };
      delete attrs[group];
      return { ...f, attrs };
    }
  }
}

/** Adds or removes one value from a multi-select attribute facet. */
export function toggleAttr(f: Filters, key: string, value: string): Filters {
  const have = f.attrs[key] ?? [];
  const next = have.includes(value) ? have.filter((v) => v !== value) : [...have, value];
  const attrs = { ...f.attrs };
  if (next.length) attrs[key] = next;
  else delete attrs[key];
  return { ...f, attrs };
}

/** Builds the API query. Prices are entered in whole units and sent as cents. */
export function toQuery(f: Filters, search: string, sort: string): ProductQuery {
  const q: ProductQuery = {
    search: search || undefined,
    sort,
    market: f.market || undefined,
    categoryId: f.selection.categoryId || undefined,
    subcategoryId: f.selection.subcategoryId || undefined,
    city: f.city || undefined,
    country: f.country || undefined,
    grade: f.grade || undefined,
    minPrice: f.minPrice ? Math.round(Number(f.minPrice) * 100) : undefined,
    maxPrice: f.maxPrice ? Math.round(Number(f.maxPrice) * 100) : undefined,
    attrs: Object.keys(f.attrs).length ? f.attrs : undefined,
  };
  for (const id of FLAG_IDS) if (f.flags[id]) (q as Record<string, boolean>)[id] = true;
  return q;
}
