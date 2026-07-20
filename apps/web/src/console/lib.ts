import type { BadgeTone } from '@agrotraders/ui';
import { ORDER_LABELS, nextStatusFor, type ApiOrderStatus } from '@agrotraders/api-client';

/**
 * @deprecated Not locale-aware and hardcodes `$`. In components use
 * `useCurrency().fmtCents`, which respects the user's display currency.
 */
export const usd = (cents: number | null | undefined) =>
  cents == null ? '—' : '$' + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

/** Parse an API amount/price string like "$48,200" into a plain number. */
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

export const orderTone: Record<string, BadgeTone> = {
  enquiry: 'slate',
  quote: 'gold',
  processing: 'info',
  paid: 'gold',
  packed: 'mango',
  dispatched: 'info',
  shipped: 'info',
  in_transit: 'info',
  delivered: 'green',
  dispute: 'error',
  cancelled: 'slate',
};

/** Labels live in the api-client so web and mobile can't drift apart. */
export const orderLabel: Record<string, string> = ORDER_LABELS;

/**
 * The next status a seller can drive by PATCH. Beyond `packed` the seller must
 * use the dispatch modal (which mints the OTPs), so this returns null there.
 */
export const nextStatus = (status: ApiOrderStatus) => nextStatusFor(status, 'seller');
