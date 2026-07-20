import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CURRENCIES, formatMoney, parsePriceCents, type ApiFxRates } from '@agrotraders/api-client';
import { useI18n } from '../i18n';
import { api } from '../lib/api';

interface CurrencyContextValue {
  currency: string;
  setCurrency: (c: string) => void;
  /** Rate USD → selected currency (1 when USD or rates unavailable). */
  rate: number;
  /** Format USD cents in the selected currency. */
  fmtCents: (usdCents: number | null | undefined) => string;
  /** Format a product-ish price: converts when a cents baseline exists, else shows the raw string. */
  fmtPrice: (p: { price: string; priceCents?: number | null }) => string;
  stale: boolean;
}

const Ctx = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Currency symbol placement and digit grouping are locale-dependent, so the
  // active language has to reach Intl.NumberFormat.
  const { lang } = useI18n();
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('currency') || 'USD');

  const { data: fx } = useQuery<ApiFxRates>({
    queryKey: ['fx-rates'],
    queryFn: () => api.fx.rates(),
    staleTime: 12 * 3600e3,
    gcTime: 24 * 3600e3,
    retry: 1,
  });

  const setCurrency = useCallback((c: string) => {
    localStorage.setItem('currency', c);
    setCurrencyState(c);
  }, []);

  const rate = fx?.rates?.[currency] ?? 1;

  const fmtCents = useCallback(
    (usdCents: number | null | undefined) => {
      if (usdCents == null) return '—';
      return formatMoney(usdCents, currency, fx?.rates?.[currency] ?? 1, lang);
    },
    [currency, fx, lang],
  );

  const fmtPrice = useCallback(
    (p: { price: string; priceCents?: number | null }) => {
      if (currency === 'USD') return p.price;
      const cents = p.priceCents ?? parsePriceCents(p.price);
      // Unparseable price strings ("POA", ranges) always fall back to the raw string.
      if (cents == null) return p.price;
      return formatMoney(cents, currency, fx?.rates?.[currency] ?? 1, lang);
    },
    [currency, fx, lang],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, rate, fmtCents, fmtPrice, stale: fx?.stale ?? true }),
    [currency, setCurrency, rate, fmtCents, fmtPrice, fx?.stale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

/** Compact header dropdown for picking the display currency. */
export function CurrencySelect({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  const { currency, setCurrency } = useCurrency();
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      title={t('currency.display')}
      className={
        'h-9 cursor-pointer rounded-md border border-surface-border bg-white px-2 font-numeric text-sm font-bold text-ink hover:border-brand-leaf ' +
        className
      }
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
