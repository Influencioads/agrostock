import type { AttrField } from './attributes';

/**
 * Listing knobs shared by the seller forms (web + mobile), the API DTOs and the
 * buyer-facing renders. Everything here is a *stored* value, so the IDs must
 * stay stable; labels are translated as `enums:<group>.<ID>`.
 */

/* ── delivery ────────────────────────────────────────────────────── */

/**
 * The seller answers "do you deliver?" — and when they don't, whether the buyer
 * may still collect. Three canonical values live in the existing free-text
 * `Product.delivery` column, so legacy strings ("Ready", "7 days") keep
 * rendering as-is and no migration is needed.
 */
export const DELIVERY_OPTIONS = ['delivery', 'self_pickup', 'no_delivery'] as const;
export type DeliveryOption = (typeof DELIVERY_OPTIONS)[number];

export function isDeliveryOption(value: unknown): value is DeliveryOption {
  return typeof value === 'string' && (DELIVERY_OPTIONS as readonly string[]).includes(value);
}

/* ── procurement window ──────────────────────────────────────────── */

/**
 * When a buyer actually intends to buy, on their posted requirement. Sellers
 * use it to tell a live need from a price-discovery post, so it is a closed set
 * (labels: `enums:procure.<id>`), not free text.
 */
export const PROCURE_WINDOWS = ['immediate', 'within_1_month', 'within_2_months', 'within_3_months', 'flexible'] as const;
export type ProcureWindow = (typeof PROCURE_WINDOWS)[number];

/* ── currency ────────────────────────────────────────────────────── */

/**
 * Currencies a seller may quote in and a buyer may display in. Lives here (not
 * in api-client) because the API validates the seller's choice against it and
 * cannot import a browser package.
 */
export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AED', 'INR', 'CNY', 'TRY', 'RUB', 'BRL',
  'PKR', 'BDT', 'VND', 'THB', 'EGP', 'KZT', 'UAH', 'SAR', 'NGN', 'KES', 'JPY',
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', INR: '₹', CNY: '¥', TRY: '₺',
  RUB: '₽', BRL: 'R$', PKR: '₨', BDT: '৳', VND: '₫', THB: '฿', EGP: 'E£',
  KZT: '₸', UAH: '₴', SAR: '﷼', NGN: '₦', KES: 'KSh', JPY: '¥',
};

/* ── percentages ─────────────────────────────────────────────────── */

/**
 * Choices for every `%` attribute (moisture, oil content, admixture…). Sellers
 * typed these by hand and produced "6", "6%", "<6", "six" — unfilterable. The
 * sub-1% band matters for oils and contaminants, so the scale is 0.1…0.9 in
 * tenths and then 1…100 in whole points.
 */
export const PERCENT_OPTIONS: string[] = [
  ...Array.from({ length: 9 }, (_, i) => ((i + 1) / 10).toFixed(1)),
  ...Array.from({ length: 100 }, (_, i) => String(i + 1)),
];

/** True for the number fields that should render as a `PERCENT_OPTIONS` picker. */
export const isPercentField = (f: AttrField): boolean => f.type === 'number' && f.unit === '%';

/* ── generated product name ──────────────────────────────────────── */

/**
 * Attribute keys that belong in an auto-composed listing title, most
 * distinguishing first. Anything not listed is left out — a title carrying
 * every attribute is noise, and the specs table already shows them all.
 *
 * ponytail: hardcoded key list. Now that admins can rename a field's storage
 * key, renaming e.g. `variety` silently drops it from suggested titles — no
 * error, just a shorter name. Promote to a per-field "use in title" checkbox
 * on the admin field editor if that actually bites.
 */
const NAME_ATTR_KEYS = [
  'variety',
  'variety_type',
  'cultivar',
  'type',
  'form',
  'processing',
  'count_per_oz',
  'count_per_lb',
  'count_per_kg',
  'caliber',
  'caliber_mm',
  'size',
  'size_grade',
  'size_count',
  'grade',
];

/**
 * Compose a listing name from the taxonomy leaf plus the attributes the seller
 * picked — "Almond · Nonpareil · Roasted · 20/22". The seller can still type
 * over it; the forms only overwrite a name they generated themselves.
 */
export function suggestProductName(
  subcategory: string | null | undefined,
  attributes: Record<string, unknown> | null | undefined,
): string {
  const attrs = attributes ?? {};
  const parts = [subcategory?.trim()].filter((s): s is string => !!s);
  for (const key of NAME_ATTR_KEYS) {
    const raw = attrs[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value === undefined || value === null || value === '' || typeof value === 'boolean') continue;
    const text = String(value).trim();
    // A repeated word ("Almond" as both leaf and variety) reads as a stutter.
    if (text && !parts.some((p) => p.toLowerCase() === text.toLowerCase())) parts.push(text);
  }
  return parts.join(' ');
}

/**
 * A buyer requirement's title, composed rather than typed: what it is (the whole
 * taxonomy path), where it goes, and who wants it. Buyers wrote titles nobody
 * could search or compare; these three facts are what a seller scans for.
 *
 * Lives here beside `suggestProductName` so web and mobile compose the same
 * title — the two boards list requirements from both.
 */
export function buyerBidTitle(taxonomy: string[], city?: string, forWhom?: string): string {
  return [taxonomy.join(' › '), city?.trim(), forWhom?.trim()].filter(Boolean).join(' · ');
}
