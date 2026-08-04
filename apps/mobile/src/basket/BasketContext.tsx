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
  /** The metric the buyer typed in; omitted means the listing's own unit. */
  unit?: string;
  /** Denormalised only so the basket can group by supplier before its fetches land. */
  sellerId: string | null;
  sellerName: string | null;
}

interface BasketValue {
  lines: BasketLine[];
  /** Total number of lines — drives the header badge. */
  count: number;
  add: (product: ApiProduct, qty: number, unit?: string) => void;
  setQty: (slug: string, qty: number, unit?: string) => void;
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

  /**
   * Single writer: state and storage never diverge.
   *
   * Takes an updater, never a value. Checkout removes each placed line in a
   * loop, and a value-based writer computed every one of those from the same
   * render's `lines` — so a run of removals collapsed into whichever ran last,
   * leaving paid-for lines in the basket.
   */
  const commit = useCallback((update: (prev: BasketLine[]) => BasketLine[]) => {
    setLines((prev) => {
      const next = update(prev);
      void storage.set(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<BasketValue>(() => {
    const add = (product: ApiProduct, qty: number, unit?: string) =>
      // Re-adding a listing replaces its quantity rather than topping it up: the
      // buyer is looking at the listing and just said how much they want.
      commit((prev) =>
        prev.some((l) => l.slug === product.slug)
          ? prev.map((l) => (l.slug === product.slug ? { ...l, qty, unit } : l))
          : [
              ...prev,
              {
                slug: product.slug,
                qty,
                unit,
                sellerId: product.seller?.id ?? null,
                sellerName: product.seller?.name ?? null,
              },
            ].slice(-MAX_LINES),
      );

    return {
      lines,
      count: lines.length,
      ready,
      add,
      setQty: (slug, qty, unit) =>
        commit((prev) => prev.map((l) => (l.slug === slug ? { ...l, qty, ...(unit === undefined ? {} : { unit }) } : l))),
      remove: (slug) => commit((prev) => prev.filter((l) => l.slug !== slug)),
      clear: () => commit(() => []),
    };
  }, [lines, ready, commit]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): BasketValue {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error('useBasket must be used inside <BasketProvider>');
  return ctx;
}
