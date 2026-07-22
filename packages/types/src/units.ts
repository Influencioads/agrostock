/**
 * Quantity units for products, buyer bids, orders and invoice lines.
 *
 * These IDs are the *stored* value. Everything the platform shipped before this
 * module wrote free text — mostly `'/MT'` (the display form leaked into the
 * column), plus `'MT'` and `'MT/month'` from the seed. `normalizeUnit` folds all
 * of that onto a canonical ID so old and new rows render identically and no data
 * migration is required; `unitSuffix` produces the `/MT` display form.
 *
 * Labels are translated as `enums:unit.<ID>` — never hardcode them in a view.
 */
export const PRODUCT_UNITS = ['KG', 'MT', 'QUINTAL', 'TON', 'BAG', 'PIECE'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

/** The unit assumed for legacy rows and new listings that do not pick one. */
export const DEFAULT_UNIT: ProductUnit = 'MT';

export function isProductUnit(value: unknown): value is ProductUnit {
  return typeof value === 'string' && (PRODUCT_UNITS as readonly string[]).includes(value);
}

/**
 * Aliases seen in stored data and in seller free text. Keys are compared after
 * lowercasing and stripping everything but letters, so `'/MT'`, `'MT/month'`,
 * `' mt '` and `'Metric Ton'` all land on `MT`.
 */
const UNIT_ALIASES: Record<string, ProductUnit> = {
  kg: 'KG',
  kgs: 'KG',
  kilo: 'KG',
  kilos: 'KG',
  kilogram: 'KG',
  kilograms: 'KG',
  mt: 'MT',
  mtmonth: 'MT',
  metricton: 'MT',
  metrictons: 'MT',
  metrictonne: 'MT',
  tonne: 'MT',
  tonnes: 'MT',
  quintal: 'QUINTAL',
  quintals: 'QUINTAL',
  qtl: 'QUINTAL',
  ton: 'TON',
  tons: 'TON',
  shortton: 'TON',
  bag: 'BAG',
  bags: 'BAG',
  sack: 'BAG',
  piece: 'PIECE',
  pieces: 'PIECE',
  pcs: 'PIECE',
  pc: 'PIECE',
  unit: 'PIECE',
};

/** Fold any stored/typed unit string onto a canonical ID (undefined when unknown). */
export function normalizeUnit(raw?: string | null): ProductUnit | undefined {
  if (!raw) return undefined;
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  return UNIT_ALIASES[key];
}

/** Canonical unit for display/storage, falling back to MT like the API always has. */
export function toUnit(raw?: string | null): ProductUnit {
  return normalizeUnit(raw) ?? DEFAULT_UNIT;
}

/** Price suffix form — `unitSuffix('KG')` → `'/KG'`. Legacy `'/MT'` stays `'/MT'`. */
export function unitSuffix(raw?: string | null): string {
  return `/${toUnit(raw)}`;
}
