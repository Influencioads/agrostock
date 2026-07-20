/**
 * Shared display helpers used by web AND mobile so both platforms render
 * identical numbers (social proof, currency conversion, price parsing).
 */

/* ── social proof (feature: "100+ people watching") ─────────────── */

/** FNV-1a — tiny, stable, identical output on every JS runtime. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface SocialProof {
  watching: number;
  orderedLastMonth: number;
}

/**
 * Deterministic per-product engagement numbers, seeded by the product id so
 * every visitor (and every platform) sees the same stable figures.
 * watching: 40–320 · orderedLastMonth: 3–48.
 */
export function socialProof(productId: string): SocialProof {
  const h = fnv1a(productId);
  return {
    watching: 40 + (h % 281),
    orderedLastMonth: 3 + ((h >>> 8) % 46),
  };
}

/* ── money ──────────────────────────────────────────────────────── */

/** "$1,180" → 118000 cents; null for unparseable strings ("POA", ranges). */
export function parsePriceCents(price: string | null | undefined): number | null {
  if (!price) return null;
  const n = parseFloat(price.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Currencies offered in the selector (must exist in the fx rates payload). */
export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AED', 'INR', 'CNY', 'TRY', 'RUB', 'BRL',
  'PKR', 'BDT', 'VND', 'THB', 'EGP', 'KZT', 'UAH', 'SAR', 'NGN', 'KES', 'JPY',
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', INR: '₹', CNY: '¥', TRY: '₺',
  RUB: '₽', BRL: 'R$', PKR: '₨', BDT: '৳', VND: '₫', THB: '฿', EGP: 'E£',
  KZT: '₸', UAH: '₴', SAR: '﷼', NGN: '₦', KES: 'KSh', JPY: '¥',
};

/** USD cents → target-currency amount (major units). */
export function convertCents(usdCents: number, rate: number): number {
  return (usdCents / 100) * rate;
}

/** Zero-decimal display currencies (large-denomination). */
const NO_DECIMALS = new Set(['VND', 'JPY', 'KZT', 'IDR', 'NGN', 'PKR', 'INR', 'KES', 'RUB']);

/**
 * Format USD cents in the given currency. Uses Intl when available (Hermes on
 * Expo SDK 54 ships Intl) and falls back to a symbol map otherwise.
 */
export function formatMoney(usdCents: number, currency: string, rate: number, locale?: string): string {
  const amount = convertCents(usdCents, rate);
  const decimals = NO_DECIMALS.has(currency) || amount >= 1000 ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale ?? 'en', {
      style: 'currency',
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    const sym = SYMBOLS[currency] ?? currency + ' ';
    return `${sym}${amount.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
  }
}
