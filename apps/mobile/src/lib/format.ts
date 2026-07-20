/** Money/number formatting + order status maps — ported from the web console lib. */
import { ORDER_LABELS, nextStatusFor, type ApiOrderStatus } from '@agrotraders/api-client';

/** Extract a human-readable message from an axios error, else fall back. */
export function errMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
}

/**
 * @deprecated Not locale-aware and hardcodes `$`. In components use
 * `useCurrency().fmtCents` (respects the user's display currency) or
 * `useFormat()` from `./useFormat` for plain numbers.
 */
export const usd = (cents: number | null | undefined) =>
  cents == null ? '—' : '$' + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

export const parseAmount = (a: string | null | undefined): number => {
  if (!a) return 0;
  const n = Number(String(a).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Compact dollar label, e.g. 284000 → "$284K". `n` is dollars. */
export const compactUsd = (n: number): string =>
  n >= 1000 ? '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : '$' + Math.round(n).toLocaleString();

/** Compact plain number, e.g. 24100 → "24.1K". */
export const compactNum = (n: number): string =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(Math.round(n));

export type Tone = 'green' | 'gold' | 'mango' | 'warn' | 'error' | 'info' | 'slate';

export const orderTone: Record<string, Tone> = {
  enquiry: 'slate', quote: 'gold', processing: 'info', paid: 'gold',
  packed: 'mango', dispatched: 'info', shipped: 'info',
  in_transit: 'info', delivered: 'green', dispute: 'error', cancelled: 'slate',
};

/** Labels live in the api-client so web and mobile can't drift apart. */
export const orderLabel: Record<string, string> = ORDER_LABELS;

/**
 * The next status a seller can drive by PATCH. Beyond `packed` the seller must
 * dispatch (which mints the OTPs), so this returns null there.
 */
export const nextOrderStatus = (status: ApiOrderStatus) => nextStatusFor(status, 'seller');

export const tripNext: Record<string, string | null> = {
  pending: 'loading', loading: 'in_transit', in_transit: 'delivered', delivered: null, delayed: 'in_transit',
};
export const tripTone: Record<string, Tone> = {
  pending: 'slate', loading: 'warn', in_transit: 'info', delivered: 'green', delayed: 'error',
};
