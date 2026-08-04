import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * The buyer's cart — the web twin of the mobile RFQ basket
 * (`apps/mobile/src/basket/BasketContext.tsx`).
 *
 * There is no server-side cart in this product (no Cart model, no /cart
 * endpoints): the cart is local, and checkout submits through the existing
 * `orders.place` / `orders.enquiry` endpoints — one call per line, because an
 * order is per listing and per seller.
 *
 * A line therefore stores identifiers and quantity only. Everything displayable
 * (photo, price, availability, MOQ) is re-fetched from the product API when the
 * checkout renders, which is also what keeps prices from going stale in storage.
 */
export interface CartLine {
  /** Product slug or id — either resolves through `products.get`. */
  slug: string;
  qty: number;
  /** The metric the buyer typed in; omitted means the listing's own unit. */
  unit?: string;
}

interface CartValue {
  lines: CartLine[];
  /** Number of lines — drives the header badge. */
  count: number;
  add: (line: CartLine) => void;
  setLine: (slug: string, patch: Partial<CartLine>) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const KEY = 'agrotraders.cart';
const MAX_LINES = 40;

function read(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine => !!l && typeof (l as CartLine).slug === 'string' && typeof (l as CartLine).qty === 'number',
    );
  } catch {
    // A corrupt cart is not worth surfacing — start empty.
    return [];
  }
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(read);

  /**
   * Single writer: state and storage never diverge.
   *
   * Takes an updater, never a value. Checkout removes each placed line in a
   * loop, and a value-based writer computed every one of those from the same
   * render's `lines` — so seven removals in a row collapsed into whichever ran
   * last, and six paid-for lines stayed in the cart.
   */
  const commit = useCallback((update: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = update(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private mode / quota — the cart still works for this session.
      }
      return next;
    });
  }, []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.length,
      // Re-adding a listing replaces its quantity rather than duplicating the
      // line: the buyer is looking at the listing and just said how much.
      add: (line) =>
        commit((prev) =>
          prev.some((l) => l.slug === line.slug)
            ? prev.map((l) => (l.slug === line.slug ? line : l))
            : [...prev, line].slice(-MAX_LINES),
        ),
      setLine: (slug, patch) => commit((prev) => prev.map((l) => (l.slug === slug ? { ...l, ...patch } : l))),
      remove: (slug) => commit((prev) => prev.filter((l) => l.slug !== slug)),
      clear: () => commit(() => []),
    }),
    [lines, commit],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
