import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from './storage';

/**
 * Where the buyer last said goods should be delivered. Home's "Deliver to" row
 * was removed at the user's request (2026-09-28), so nothing sets this any more;
 * a value saved before then still seeds Checkout, which has its own city picker.
 *
 * Stored on the device, not the account: a guest can set it, and a trader who
 * buys for two depots switches it without editing their profile. `city` and
 * `country` are the English names the catalog and order APIs match on; `label`
 * is what the picker showed (localized), kept so the header needn't translate.
 * Checkout seeds its delivery address from this before falling back to the
 * profile, so the choice made here is the one an order ships to.
 */
export interface DeliverTo {
  city: string;
  country: string;
  label: string;
}

interface DeliverToValue {
  place: DeliverTo | null;
  set: (next: DeliverTo | null) => void;
}

/** SecureStore keys must be alphanumeric + underscore. */
const KEY = 'agrotraders_deliver_to';

const Ctx = createContext<DeliverToValue>({ place: null, set: () => {} });

export function DeliverToProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<DeliverTo | null>(null);

  useEffect(() => {
    let alive = true;
    void storage
      .get(KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const parsed = JSON.parse(raw) as Partial<DeliverTo>;
        if (typeof parsed.city === 'string' && typeof parsed.label === 'string') {
          setPlace({ city: parsed.city, country: parsed.country ?? '', label: parsed.label });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const set = useCallback((next: DeliverTo | null) => {
    setPlace(next);
    void (next ? storage.set(KEY, JSON.stringify(next)) : storage.del(KEY)).catch(() => {});
  }, []);

  const value = useMemo(() => ({ place, set }), [place, set]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDeliverTo() {
  return useContext(Ctx);
}
