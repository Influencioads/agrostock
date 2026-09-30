import {
  deepLinkToSubscriptions,
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type Purchase,
} from 'expo-iap';
// Type-only, so Metro never loads the Android stub from here.
import type { PurchaseHandler, StoreProduct, SyncResult } from './iap';

/**
 * App Store In-App Purchase — iOS half (StoreKit 2 via expo-iap).
 *
 * Nothing here decides that a purchase counts. Every transaction StoreKit hands
 * over — a fresh purchase, a renewal delivered while the app runs, one left
 * over from an earlier launch — goes to the purchase handler, which uploads the
 * signed transaction for the API to verify. It is finished only once the handler
 * reports the API accepted it: StoreKit replays an unfinished transaction on the
 * next launch, so a failed upload is retried rather than lost.
 */
export const IAP_AVAILABLE = true;

let connection: Promise<boolean> | null = null;
function connect() {
  if (!connection) {
    connection = initConnection().catch((e: unknown) => {
      connection = null; // let the next call retry
      throw e;
    });
  }
  return connection;
}

export async function fetchStoreSubscriptions(skus: string[]): Promise<StoreProduct[]> {
  if (!skus.length) return []; // the store rejects an empty request
  await connect();
  // Unknown SKUs are simply omitted, which is how an unlisted product shows up.
  const products: StoreProduct[] = (await fetchProducts({ skus, type: 'subs' })) ?? [];
  return products.map(({ id, displayPrice }) => ({ id, displayPrice }));
}

let handler: PurchaseHandler | null = null;
export function setPurchaseHandler(h: PurchaseHandler | null) {
  handler = h;
}

/** A compact JWS; expo-iap falls back to a bare transaction id when it has none. */
const isJws = (s: string | null | undefined): s is string => !!s && s.split('.').length === 3;

// requestPurchase resolves with the same transaction the listener receives, so
// a second caller shares the first upload's outcome instead of skipping it.
const inFlight = new Map<string, Promise<boolean>>();

/** True once the API accepted the transaction; rejects with the handler's error. */
function processPurchase(purchase: Purchase): Promise<boolean> {
  const jws = purchase.purchaseToken;
  if (!handler || !isJws(jws)) return Promise.resolve(false);
  let run = inFlight.get(purchase.id);
  if (!run) {
    const h = handler;
    run = (async () => {
      try {
        const accepted = await h({ transactionId: purchase.id, productId: purchase.productId, jws });
        if (accepted) await finishTransaction({ purchase });
        return accepted;
      } finally {
        inFlight.delete(purchase.id);
      }
    })();
    inFlight.set(purchase.id, run);
  }
  return run;
}

export function listenForPurchases(): () => void {
  const sub = purchaseUpdatedListener((p) => void processPurchase(p).catch(() => {}));
  return () => sub.remove();
}

export async function buySubscription(sku: string, appAccountToken: string): Promise<'purchased' | 'cancelled' | 'pending'> {
  await connect();
  try {
    const result = await requestPurchase({ type: 'subs', request: { apple: { sku, appAccountToken } } });
    // Paid but not credited is a failure the screen must show, not a success.
    for (const p of [result ?? []].flat()) {
      if (!(await processPurchase(p))) throw new Error('The App Store purchase was not accepted.');
    }
    return 'purchased';
  } catch (e) {
    if (isUserCancelledError(e)) return 'cancelled';
    // Ask to Buy: the transaction arrives through the listener once approved.
    if ((e as { code?: unknown } | null)?.code === ErrorCode.DeferredPayment) return 'pending';
    throw e;
  }
}

/** Uploads every subscription this Apple ID currently holds. */
export async function syncOwnedPurchases(): Promise<SyncResult> {
  await connect();
  const owned = await getAvailablePurchases();
  let rejected = 0;
  let error: unknown;
  // One refused transaction must not stop the rest from uploading.
  for (const p of owned) {
    const accepted = await processPurchase(p).catch((e: unknown) => {
      if (error === undefined) error = e;
      return false;
    });
    if (!accepted) rejected++;
  }
  return { found: owned.length, rejected, error };
}

export async function restoreOwnedPurchases(): Promise<SyncResult> {
  await connect();
  await restorePurchases();
  return syncOwnedPurchases();
}

export async function manageSubscriptions() {
  await deepLinkToSubscriptions();
}

// The rest of the app type-checks against iap.ts; this keeps the halves in step.
const _sameApi: typeof import('./iap') = {
  IAP_AVAILABLE,
  fetchStoreSubscriptions,
  setPurchaseHandler,
  listenForPurchases,
  buySubscription,
  syncOwnedPurchases,
  restoreOwnedPurchases,
  manageSubscriptions,
};
