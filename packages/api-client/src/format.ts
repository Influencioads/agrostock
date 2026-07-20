/**
 * Locale-aware date and number formatting, shared by web, admin and mobile so a
 * number reads identically everywhere.
 *
 * `locale` is always explicit — an omitted locale silently falls back to the
 * host's, which is exactly the bug this module exists to prevent. Mobile's Hermes
 * ships `Intl.NumberFormat`/`DateTimeFormat` (but not `PluralRules`, which is
 * polyfilled in the app entry).
 *
 * Money lives in `helpers.ts` (`formatMoney`), which already takes a locale.
 */

/** e.g. `formatDate(iso, 'ru')` → "10 июл. 2026 г." */
export function formatDate(
  value: string | number | Date | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (value == null) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Month + year only, for "joined" style columns. */
export function formatMonthYear(value: string | number | Date | null | undefined, locale: string): string {
  return formatDate(value, locale, { month: 'short', year: 'numeric' });
}

export function formatNumber(value: number | null | undefined, locale: string, options?: Intl.NumberFormatOptions): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, options).format(value);
}

/** e.g. 24100 → "24K" (en) / "24 тыс." (ru). Replaces the hand-rolled `compactNum`. */
export function formatCompact(value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** e.g. "3 days ago" / "через 2 часа". */
export function formatRelative(value: string | number | Date | null | undefined, locale: string): string {
  if (value == null) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diff = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(Math.round(diff / 1000), 'second');
}
