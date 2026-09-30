import { useMemo } from 'react';
import { formatCompact, formatDate, formatMonthYear, formatMoney, formatNumber, formatRelative } from '@agrotraders/api-client';
import { useI18n } from '../i18n';

/**
 * Minor units → hundredths, the scale formatMoney divides by 100. Not every
 * currency has two decimals: App Store payments are stored in yen for JPY (0)
 * and in fils for KWD (3).
 */
function minorToCents(amountMinor: number, currency: string): number {
  let digits = 2;
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Unknown currency code: assume two decimals.
  }
  return (amountMinor * 100) / 10 ** digits;
}

/**
 * Date and number formatters bound to the active locale.
 *
 * The admin console reports in USD platform-wide, so `money` fixes the currency
 * but still formats grouping and symbol placement for the current language.
 */
export function useFormat() {
  const { lang } = useI18n();
  return useMemo(
    () => ({
      date: (v: string | number | Date | null | undefined, o?: Intl.DateTimeFormatOptions) => formatDate(v, lang, o),
      monthYear: (v: string | number | Date | null | undefined) => formatMonthYear(v, lang),
      relative: (v: string | number | Date | null | undefined) => formatRelative(v, lang),
      number: (v: number | null | undefined, o?: Intl.NumberFormatOptions) => formatNumber(v, lang, o),
      compact: (v: number | null | undefined) => formatCompact(v, lang),
      money: (usdCents: number | null | undefined) => (usdCents == null ? '—' : formatMoney(usdCents, 'USD', 1, lang)),
      /**
       * Plan and payment amounts, which are stored in the minor units of their
       * OWN currency (kopecks for RUB) rather than in the USD platform baseline.
       * Passing rate 1 formats the amount as-is, which is what a sticker price
       * needs — it must not drift with an FX rate.
       */
      minor: (amountMinor: number | null | undefined, currency = 'RUB') =>
        amountMinor == null ? '—' : formatMoney(minorToCents(amountMinor, currency), currency, 1, lang),
    }),
    [lang],
  );
}
