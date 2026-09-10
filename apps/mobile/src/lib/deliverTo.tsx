import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { storage } from './storage';
import { splitPlace } from './place';
import { PickerSheet } from '../screens/components/PickerSheet';
import { useI18n } from '../i18n';

/**
 * Where the buyer wants goods delivered — the "Deliver to" control on Home.
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

/**
 * The focused picker: one searchable list over every city in the dataset, hits
 * read "Mumbai, India". Selecting stores the split value and closes.
 */
export function DeliverToSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { place, set } = useDeliverTo();
  const [q, setQ] = useState('');
  const term = q.trim();
  const { data: options = [], isFetching } = useQuery({
    queryKey: ['geo-cities', '', term],
    queryFn: () => api.geo.cities('', term),
    // An unscoped search spans every country, so it needs something to match on.
    enabled: visible && term.length >= 2,
    staleTime: 3600e3,
    retry: 1,
  });

  return (
    <PickerSheet
      visible={visible}
      title={t('pubX.home.deliverTo')}
      options={options}
      value={place ? `${place.city}, ${place.country}` : undefined}
      onSelect={(value) => {
        const label = options.find((o) => o.value === value)?.label ?? value;
        set({ ...splitPlace(value), label });
      }}
      onClose={onClose}
      onSearch={setQ}
      loading={isFetching}
      searchPlaceholder={t('common:geo.citySearchPlaceholder')}
      emptyLabel={term.length < 2 ? t('common:geo.typeToSearch') : t('common:geo.noCities')}
    />
  );
}
