import { useMemo } from 'react';
import { formatCompact, formatDate, formatMonthYear, formatNumber, formatRelative, ORDER_LABELS } from '@agrotraders/api-client';
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
/**
 * Order-status labels in the reader's language.
 *
 * `ORDER_LABELS` in the api-client is hardcoded English, so a Russian buyer's
 * order cards read "Order placed" / "Packed & ready". The translated strings
 * already exist for every locale under `enums:order_status`; this reads those,
 * falling back to the English constant for any status the catalog misses.
 */
export function useOrderLabel(): Record<string, string> {
  const { t } = useI18n();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(ORDER_LABELS).map(([status, en]) => [
          status,
          t(`enums:order_status.${status}`, { defaultValue: en }),
        ]),
      ),
    [t],
  );
}

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
