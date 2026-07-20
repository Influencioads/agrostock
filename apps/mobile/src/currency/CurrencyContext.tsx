import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { CURRENCIES, formatMoney, parsePriceCents, type ApiFxRates } from '@agrotraders/api-client';
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
  /** Product-ish price: converts when a cents baseline exists, else raw string. */
  fmtPrice: (p: { price: string; priceCents?: number | null }) => string;
}

const Ctx = createContext<CurrencyContextValue | null>(null);

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

  const fmtPrice = useCallback(
    (p: { price: string; priceCents?: number | null }) => {
      if (currency === 'USD') return p.price;
      const cents = p.priceCents ?? parsePriceCents(p.price);
      if (cents == null) return p.price;
      return formatMoney(cents, currency, fx?.rates?.[currency] ?? 1, lang);
    },
    [currency, fx, lang],
  );

  const value = useMemo(() => ({ currency, setCurrency, rate, fmtCents, fmtPrice }), [currency, setCurrency, rate, fmtCents, fmtPrice]);
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
