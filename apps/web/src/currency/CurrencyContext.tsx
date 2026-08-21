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
  /**
   * Format an amount held in the MINOR units of some other currency — plan
   * prices are kopecks, not the USD cents everything else uses. Converts into
   * the selected display currency through the same FX snapshot.
   */
  fmtMinor: (amountMinor: number | null | undefined, sourceCurrency?: string) => string;
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

  /**
   * WEB-05: amounts are stored in USD. If the FX feed fails (or simply has no
   * rate for the selected currency) we must NOT format a USD number with the
   * foreign symbol — that displayed $840 as "₹840", understating the real price
   * by ~80x. Fall back to displaying USD instead, which is always truthful.
   */
  const liveRate = fx?.rates?.[currency];
  const hasRate = currency === 'USD' || (typeof liveRate === 'number' && liveRate > 0);
  const displayCurrency = hasRate ? currency : 'USD';
  const rate = hasRate ? liveRate ?? 1 : 1;

  const fmtCents = useCallback(
    (usdCents: number | null | undefined) => {
      if (usdCents == null) return '—';
      return formatMoney(usdCents, displayCurrency, rate, lang);
    },
    [displayCurrency, rate, lang],
  );

  const fmtPrice = useCallback(
    (p: { price: string; priceCents?: number | null }) => {
      // Always convert from the USD cents baseline when we have one. The old
      // "USD → return p.price verbatim" shortcut was only safe while every
      // listing was quoted in dollars; sellers now quote in their own currency,
      // so `price` is a ₹/₺/₽ string that must NOT be shown under a $ heading.
      const cents = p.priceCents ?? parsePriceCents(p.price);
      // Unparseable price strings ("POA", ranges) always fall back to the raw string.
      if (cents == null) return p.price;
      return formatMoney(cents, displayCurrency, rate, lang);
    },
    [displayCurrency, rate, lang],
  );

  /**
   * Subscription prices are published in rubles and charged in rubles, so they
   * are stored in kopecks rather than in the USD-cents baseline. The FX table is
   * USD-based, so converting RUB -> target goes through USD: divide out the
   * source rate, multiply by the target's. When the source rate is missing we
   * show the original currency rather than mislabelling the number.
   */
  const fmtMinor = useCallback(
    (amountMinor: number | null | undefined, sourceCurrency = 'RUB') => {
      if (amountMinor == null) return '—';
      const src = sourceCurrency.toUpperCase();
      if (src === displayCurrency) return formatMoney(amountMinor, src, 1, lang);
      const srcRate = src === 'USD' ? 1 : fx?.rates?.[src];
      if (!srcRate || srcRate <= 0) return formatMoney(amountMinor, src, 1, lang);
      // amountMinor is in the source currency's minor units; rate converts the
      // whole amount at once, so the minor-unit scale carries through unchanged.
      return formatMoney(amountMinor, displayCurrency, rate / srcRate, lang);
    },
    [displayCurrency, rate, lang, fx?.rates],
  );

  const value = useMemo<CurrencyContextValue>(
    // `stale` is true when rates are unavailable/outdated — including the
    // no-rate fallback above, so consumers can surface it.
    () => ({ currency: displayCurrency, setCurrency, rate, fmtCents, fmtPrice, fmtMinor, stale: !hasRate || (fx?.stale ?? true) }),
    [displayCurrency, setCurrency, rate, fmtCents, fmtPrice, fmtMinor, hasRate, fx?.stale],
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
