import type { ProductQuery } from '@agrotraders/api-client';
import { splitValues } from './filterParams';

/**
 * The /market query string ↔ the products API query. Pure and React-free, so
 * /market and the home hero's draft build the identical query — and the hero's
 * "Show N results" counts exactly what /market will then list.
 */

/**
 * Deal type / price type / listing type are three checkbox groups whose boxes
 * are two sides of the same coin. Ticking BOTH boxes in a group has to be
 * expressible and has to mean "either" — which a tri-state `?safe=true|false`
 * could not say, so those groups carry their own multi-value param and are
 * translated to the API's booleans at query time.
 */
export const DEAL_SAFE = 'safe';
export const DEAL_DIRECT = 'direct';
export const PRICING_NEGOTIABLE = 'negotiable';
export const PRICING_FIXED = 'fixed';
export const LISTING_OFFER = 'offer';
export const LISTING_AUCTION = 'auction';

/**
 * A group of exactly two opposite boxes → the API's tri-state boolean.
 * Neither ticked and both ticked are the same query (no constraint); they are
 * different *states* only in the panel, which is the whole point.
 */
function eitherOr(values: string[], truthy: string, falsy: string): boolean | undefined {
  const yes = values.includes(truthy);
  const no = values.includes(falsy);
  if (yes === no) return undefined;
  return yes;
}

/**
 * A price bound as typed, in the display currency. Junk ("abc", "-5") is
 * `undefined` rather than `NaN`, so the chip and the group badge — which read
 * this too — never show a bound the query is not applying.
 */
export function parsePrice(raw: string | null): number | undefined {
  // A space groups thousands on any keyboard.
  const compact = (raw ?? '').replace(/\s/g, '');
  if (!compact) return undefined;
  // "1,000" / "1,500.50" is English grouping — reading that comma as a decimal
  // point filtered at $1. Any other comma is a Russian keyboard's decimal key.
  const amount = Number(
    /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(compact) ? compact.replace(/,/g, '') : compact.replace(',', '.'),
  );
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

/** A typed price bound → USD cents, which is what listings are stored in. */
function priceCents(raw: string | null, rate: number): number | undefined {
  const amount = parsePrice(raw);
  return amount === undefined ? undefined : Math.round((amount / (rate > 0 ? rate : 1)) * 100);
}

/**
 * The /market query string → the API query. Pure, so the hero can count its
 * draft with exactly the query /market will run on it.
 *
 * `minPrice`/`maxPrice` are in the viewer's DISPLAY currency — a ₽ buyer types
 * roubles, the way the cards read — and `rate` (USD → display) converts them.
 * ponytail: a shared link keeps the number, not the currency; carry a `cur`
 * param if cross-currency links start to matter.
 */
export function productQueryFromParams(params: URLSearchParams, rate = 1): ProductQuery {
  const list = (key: string) => {
    const picked = splitValues(params.get(key));
    return picked.length ? picked : undefined;
  };
  const deal = splitValues(params.get('deal'));
  const pricing = splitValues(params.get('pricing'));
  const listing = splitValues(params.get('listing'));
  // Attribute values stay canonical English — they are what products store.
  const attrs: Record<string, string[]> = {};
  for (const [key, raw] of params.entries()) {
    const picked = key.startsWith('attr_') ? splitValues(raw) : [];
    if (picked.length) attrs[key.slice(5)] = picked;
  }
  const categoryId = list('categoryId');
  const subcategoryId = params.get('subcategoryId') || undefined;
  const sort = params.get('sort');
  return {
    categoryId,
    // The name twins are display text in the viewer's language; the API only
    // matches English names. Sent only for an old deep link that has no id.
    category: categoryId ? undefined : list('category'),
    subcategoryId,
    subcategory: subcategoryId ? undefined : params.get('subcategory') || undefined,
    market: list('market'),
    city: list('city'),
    country: list('country'),
    supplyCountry: list('supplyCountry'),
    grade: list('grade'),
    search: params.get('search')?.trim() || undefined,
    minPrice: priceCents(params.get('minPrice'), rate),
    maxPrice: priceCents(params.get('maxPrice'), rate),
    verified: splitValues(params.get('verified')).includes('true') || undefined,
    safe: eitherOr(deal, DEAL_SAFE, DEAL_DIRECT),
    negotiable: eitherOr(pricing, PRICING_NEGOTIABLE, PRICING_FIXED),
    // Ticking both ORs them server-side — "show me offers and auctions".
    offer: listing.includes(LISTING_OFFER) || undefined,
    auction: listing.includes(LISTING_AUCTION) || undefined,
    sort: sort && sort !== 'relevance' ? sort : undefined,
    attrs: Object.keys(attrs).length ? attrs : undefined,
  };
}

/** Attribute picks belong to a specific taxonomy node — drop them when it changes. */
export function clearTaxonScopedParams(next: URLSearchParams) {
  next.delete('subcategoryId');
  next.delete('subcategory');
  for (const k of Array.from(next.keys())) if (k.startsWith('attr_')) next.delete(k);
}
