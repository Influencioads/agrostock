import { useMemo } from 'react';
import { formatCompact, formatDate, formatMonthYear, formatNumber, formatRelative } from '@agrotraders/api-client';
import { useI18n } from '../i18n';

/**
 * Date and number formatters bound to the active locale.
 *
 * For money use `useCurrency().fmtCents` / `fmtPrice`, which also apply the
 * user's selected display currency and FX rate. The `usd`/`compactNum` helpers
 * in `./format` are the non-locale-aware fallbacks for non-component code.
 *
 * Hermes ships Intl.NumberFormat and Intl.DateTimeFormat, so these work on device.
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
    }),
    [lang],
  );
}
