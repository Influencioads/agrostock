import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { CURRENCIES, SYMBOLS, convertCents, formatMoney, parsePriceCents, type ApiFxRates } from '@agrotraders/api-client';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import { Chip } from '../ui';

interface CurrencyContextValue {
  currency: string;
  setCurrency: (c: string) => void;
  rate: number;
  /** Format USD cents in the selected currency. */
  fmtCents: (usdCents: number | null | undefined) => string;
  /** Compact form of `fmtCents`, e.g. "$42K" / "₹35L" — for dashboard KPIs. */
  fmtCompactCents: (usdCents: number | null | undefined) => string;
  /** Product-ish price: converts when a cents baseline exists, else raw string. */
  fmtPrice: (p: { price: string; priceCents?: number | null }) => string;
  /**
   * Format an amount held in the MINOR units of some other currency — plan
   * prices are kopecks, not the USD cents everything else uses.
   */
  fmtMinor: (amountMinor: number | null | undefined, sourceCurrency?: string) => string;
}

const Ctx = createContext<CurrencyContextValue | null>(null);

/** Drops a trailing "/MT", "/ KG" etc. from a stored price string. */
function stripUnit(price: string): string {
  return price.replace(/\s*\/\s*[A-Za-z]+\s*$/, '');
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Currency symbol placement and digit grouping are locale-dependent, so the
  // active language has to reach Intl.NumberFormat.
  const { lang } = useI18n();
  const [currency, setCurrencyState] = useState('USD');

  useEffect(() => {
    storage.get('agrotraders_currency').then((c) => c && setCurrencyState(c));
  }, []);

  const { data: fx } = useQuery<ApiFxRates>({
    queryKey: ['fx-rates'],
    queryFn: () => api.fx.rates(),
    staleTime: 12 * 3600e3,
    gcTime: 24 * 3600e3,
    retry: 1,
  });

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    storage.set('agrotraders_currency', c).catch(() => {});
  }, []);

  const rate = fx?.rates?.[currency] ?? 1;

  const fmtCents = useCallback(
    (usdCents: number | null | undefined) => (usdCents == null ? '—' : formatMoney(usdCents, currency, fx?.rates?.[currency] ?? 1, lang)),
    [currency, fx, lang],
  );

  const fmtCompactCents = useCallback(
    (usdCents: number | null | undefined) => {
      if (usdCents == null) return '—';
      const amount = convertCents(usdCents, fx?.rates?.[currency] ?? 1);
      // Hermes' bundled ICU on Android does NOT include compact decimal
      // patterns, so `Intl … notation:'compact'` silently throws — a straight
      // currency format would then overflow a KPI card ("₹3,620,400"). Compact
      // manually (K/M/B/T) with the currency symbol so it always fits.
      const sym = SYMBOLS[currency] ?? `${currency} `;
      const abs = Math.abs(amount);
      const round1 = (n: number) => (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
      let body: string;
      if (abs >= 1e12) body = round1(amount / 1e12) + 'T';
      else if (abs >= 1e9) body = round1(amount / 1e9) + 'B';
      else if (abs >= 1e6) body = round1(amount / 1e6) + 'M';
      else if (abs >= 1e3) body = round1(amount / 1e3) + 'K';
      else body = Math.round(amount).toLocaleString(lang ?? 'en');
      return sym + body;
    },
    [currency, fx, lang],
  );

  const fmtPrice = useCallback(
    (p: { price: string; priceCents?: number | null }) => {
      // Always format from the numeric baseline when there is one. Stored
      // `price` strings are inconsistent — some carry thousands separators and
      // a unit ("$6,400/MT"), others neither ("$22000") — so rendering them raw
      // puts differently-formatted prices side by side in the same grid.
      const cents = p.priceCents ?? parsePriceCents(p.price);
      if (cents != null) {
        return formatMoney(cents, currency, currency === 'USD' ? 1 : (fx?.rates?.[currency] ?? 1), lang);
      }
      // Unparseable prices ("POA", ranges) fall back to the stored text. The
      // unit is stripped because callers append `unitSuffix(unit)` themselves.
      return stripUnit(p.price);
    },
    [currency, fx, lang],
  );

  /**
   * Subscription prices are published and charged in rubles, so they are stored
   * in kopecks rather than in the USD-cents baseline. The FX table is USD-based,
   * so RUB -> target goes through USD. A missing source rate falls back to the
   * original currency rather than mislabelling the number.
   */
  const fmtMinor = useCallback(
    (amountMinor: number | null | undefined, sourceCurrency = 'RUB') => {
      if (amountMinor == null) return '—';
      const src = sourceCurrency.toUpperCase();
      if (src === currency) return formatMoney(amountMinor, src, 1, lang);
      const srcRate = src === 'USD' ? 1 : fx?.rates?.[src];
      const dstRate = currency === 'USD' ? 1 : fx?.rates?.[currency];
      if (!srcRate || srcRate <= 0 || !dstRate || dstRate <= 0) return formatMoney(amountMinor, src, 1, lang);
      return formatMoney(amountMinor, currency, dstRate / srcRate, lang);
    },
    [currency, fx, lang],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, rate, fmtCents, fmtCompactCents, fmtPrice, fmtMinor }),
    [currency, setCurrency, rate, fmtCents, fmtCompactCents, fmtPrice, fmtMinor],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

/** Horizontal currency picker (Account hub). */
export function CurrencyChips() {
  const { currency, setCurrency } = useCurrency();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {CURRENCIES.map((c) => (
        <Chip key={c} label={c} active={c === currency} onPress={() => setCurrency(c)} />
      ))}
    </ScrollView>
  );
}
