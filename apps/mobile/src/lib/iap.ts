/**
 * App Store In-App Purchase — Android (and default) half. Always inert.
 *
 * iOS sells plans as App Store subscriptions through iap.ios.ts, which Metro
 * resolves ahead of this file on iOS only. Android keeps the gateway checkout
 * and never links expo-iap (excluded from autolinking in package.json), so this
 * file must NOT import it: an unlinked native module crashes at runtime.
 *
 * tsc resolves `./iap` here on every platform, so the two halves must export
 * the same API — iap.ios.ts checks itself against this file.
 */

export interface StoreProduct {
  id: string;
  /** Apple's localized price, e.g. "$4.99" or "499,00 ₽". */
  displayPrice: string;
}

export interface StorePurchase {
  transactionId: string;
  productId: string;
  /** The StoreKit 2 signed transaction the API verifies. */
  jws: string;
}

/**
 * Resolves true once the API has accepted the purchase; only then is it finished.
 * Rejects with the API's error when it refuses one, so the screen can say why.
 */
export type PurchaseHandler = (p: StorePurchase) => Promise<boolean>;

/** What a sync found on the Apple ID, and how many of those the API did not accept. */
export interface SyncResult {
  found: number;
  rejected: number;
  /** The first refusal's error, so the screen can say why (absent when none threw). */
  error?: unknown;
}

// Annotated, not inferred as `false`: tsc must not treat the iOS branches as dead.
export const IAP_AVAILABLE: boolean = false;

export async function fetchStoreSubscriptions(_skus: string[]): Promise<StoreProduct[]> {
  return [];
}

export function setPurchaseHandler(_h: PurchaseHandler | null): void {}

export function listenForPurchases(): () => void {
  return () => {};
}

export async function buySubscription(_sku: string, _appAccountToken: string): Promise<'purchased' | 'cancelled' | 'pending'> {
  return 'cancelled';
}

export async function syncOwnedPurchases(): Promise<SyncResult> {
  return { found: 0, rejected: 0 };
}

export async function restoreOwnedPurchases(): Promise<SyncResult> {
  return { found: 0, rejected: 0 };
}

export async function manageSubscriptions(): Promise<void> {}
