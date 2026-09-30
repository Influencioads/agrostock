import { useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { api } from './api';
import { IAP_AVAILABLE, listenForPurchases, setPurchaseHandler, syncOwnedPurchases } from './iap';
import { queryClient } from './queryClient';

/**
 * Uploads App Store transactions to the API while someone is signed in — new
 * purchases, renewals StoreKit delivers while the app runs, and whatever an
 * earlier launch left unfinished. Renders nothing; inert on Android.
 */
export function IapSync() {
  const { user } = useAuth();
  // By id: a refreshed user object must not re-run the sync.
  const userId = user?.id;

  useEffect(() => {
    if (!IAP_AVAILABLE || !userId) return;
    // A refusal propagates, so the purchase screen can show the API's reason
    // ("belongs to a different account"). Either way the transaction is left
    // unfinished, so StoreKit offers it again on the next launch.
    setPurchaseHandler(async (p) => {
      await api.billing.appleTransaction({ signedTransaction: p.jws });
      void queryClient.invalidateQueries({ queryKey: ['billing-overview'] });
      return true;
    });
    const stop = listenForPurchases();
    syncOwnedPurchases().catch(() => {});
    return () => {
      stop();
      setPurchaseHandler(null);
    };
  }, [userId]);

  return null;
}
