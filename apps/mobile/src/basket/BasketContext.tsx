import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApiProduct } from '@agrotraders/api-client';
import { storage } from '../lib/storage';

/**
 * The RFQ basket — the B2B answer to a shopping cart.
 *
 * A buyer collects listings from several suppliers, adjusts quantities, then
 * sends one request-for-quote per supplier. There is no server-side cart in
 * this product (no Cart model, no /cart endpoints); the basket is local, and
 * submission goes through the existing buyer-bids and orders endpoints.
 *
 * Persistence is `lib/storage`, which is SecureStore-backed on native and sized
 * for small values — so a line stores identifiers and quantity only. Everything
 * displayable (image, price, availability) is re-fetched from the product API
 * when the basket renders, which also keeps prices from going stale.
 */
export interface BasketLine {
  slug: string;
  qty: number;
  /** Denormalised only so the basket can group by supplier before its fetches land. */
  sellerId: string | null;
  sellerName: string | null;
}

interface BasketValue {
  lines: BasketLine[];
  /** Total number of lines — drives the header badge. */
  count: number;
  add: (product: ApiProduct, qty: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** False until the stored basket has been read back, so the badge doesn't flash. */
  ready: boolean;
}

/** SecureStore keys must be alphanumeric + underscore. */
const KEY = 'agrotraders_rfq_basket';
const MAX_LINES = 40;

const BasketContext = createContext<BasketValue | null>(null);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const raw = await storage.get(KEY).catch(() => null);
      if (!alive) return;
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setLines(
              parsed.filter(
                (l): l is BasketLine =>
                  !!l && typeof (l as BasketLine).slug === 'string' && typeof (l as BasketLine).qty === 'number',
              ),
            );
          }
        } catch {
          // A corrupt basket is not worth surfacing — start empty.
        }
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Single writer: state and storage never diverge. */
  const commit = useCallback((next: BasketLine[]) => {
    setLines(next);
    void storage.set(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<BasketValue>(() => {
    const add = (product: ApiProduct, qty: number) => {
      const existing = lines.find((l) => l.slug === product.slug);
      // Re-adding a listing tops up its quantity rather than duplicating the line.
      const next = existing
        ? lines.map((l) => (l.slug === product.slug ? { ...l, qty: l.qty + qty } : l))
        : [
            ...lines,
            {
              slug: product.slug,
              qty,
              sellerId: product.seller?.id ?? null,
              sellerName: product.seller?.name ?? null,
            },
          ].slice(-MAX_LINES);
      commit(next);
    };

    return {
      lines,
      count: lines.length,
      ready,
      add,
      setQty: (slug, qty) =>
        commit(lines.map((l) => (l.slug === slug ? { ...l, qty: Math.max(1, qty) } : l))),
      remove: (slug) => commit(lines.filter((l) => l.slug !== slug)),
      clear: () => commit([]),
    };
  }, [lines, ready, commit]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): BasketValue {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error('useBasket must be used inside <BasketProvider>');
  return ctx;
}
