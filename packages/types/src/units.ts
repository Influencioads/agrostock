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

/**
 * Mass of one unit, in kilograms. BAG and PIECE are counts with no fixed mass,
 * so they are deliberately absent — a quantity in them converts to nothing else.
 * TON is the short ton (the alias table already routes `tonne` to MT).
 */
const UNIT_KG: Partial<Record<ProductUnit, number>> = {
  KG: 1,
  QUINTAL: 100,
  MT: 1000,
  TON: 907.18474,
};

/**
 * Restate `qty` from one unit in another — 50 TON → 45.359 MT. `undefined` when
 * the two aren't comparable (anything involving BAG/PIECE), so callers reject
 * the entry rather than silently pricing a count as a mass.
 */
export function convertQty(qty: number, from: ProductUnit, to: ProductUnit): number | undefined {
  if (from === to) return qty;
  const a = UNIT_KG[from];
  const b = UNIT_KG[to];
  return a && b ? (qty * a) / b : undefined;
}

/**
 * The number inside a stored quantity string (`'25 MT'`, `'1,000 kg'`, `'25'`),
 * restated in `targetUnit`. `Product.moq` and `Product.qty` are free text, so
 * the unit is read back out of the string and only falls back to `targetUnit`
 * when it is absent or unrecognised — the seller forms write
 * `<number> <listing unit>`, but seeded and hand-edited rows carry anything.
 *
 * Digits are extracted the same way the seller form's `bareNumber` strips them,
 * so a value survives a write/read round trip. `undefined` when there is no
 * usable number, or when the two units don't convert (a count against a mass).
 */
export function parseQtyIn(raw: string | null | undefined, targetUnit: ProductUnit): number | undefined {
  if (!raw) return undefined;
  const value = Number(String(raw).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return convertQty(value, normalizeUnit(raw) ?? targetUnit, targetUnit);
}

/**
 * The listing's minimum order, restated in the metric the buyer is typing in.
 * The API rejects anything under it, so a quantity field seeded from this never
 * offers a number that cannot be ordered. Count-based units floor at 1 — half a
 * bag is not a thing.
 */
export function minOrderQty(
  moq: string | null | undefined,
  listingUnit: ProductUnit,
  buyerUnit: ProductUnit,
): number {
  const inBuyerUnit = convertQty(parseQtyIn(moq, listingUnit) ?? 0, listingUnit, buyerUnit) ?? 0;
  const floor = comparableUnits(listingUnit).length === 1 ? 1 : 0.01;
  return Math.max(Math.round(inBuyerUnit * 1000) / 1000, floor);
}

/** Every unit a quantity in `unit` can be restated in — always includes itself. */
export function comparableUnits(unit: ProductUnit): ProductUnit[] {
  if (!UNIT_KG[unit]) return [unit];
  return PRODUCT_UNITS.filter((u) => !!UNIT_KG[u]);
}

/**
 * Price suffix form — `unitSuffix('KG')` → `'/KG'`. Legacy `'/MT'` stays `'/MT'`.
 *
 * Pass the caller's `t` to localize the code (`'/кг'` in Russian). It stays
 * optional because this package has no i18n dependency and a few call sites —
 * option labels built from `PRODUCT_UNITS`, tests — genuinely want the raw code.
 */
export function unitSuffix(raw?: string | null, t?: (key: string) => string): string {
  const unit = toUnit(raw);
  return `/${t ? t(`enums:unitShort.${unit}`) : unit}`;
}
