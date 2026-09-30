import type { Subscription } from '@prisma/client';

/** How long Apple keeps retrying a failed renewal before it gives up. */
const BILLING_RETRY_MS = 60 * 864e5;

/**
 * Whether the App Store may still charge for this subscription: a live period,
 * or one in Apple's billing retry (up to 60 days past due). Selling or granting
 * over such a row would bill the customer twice for one plan.
 *
 * Kept free of service imports: payments and subscriptions both use it, and
 * the IAP service imports them.
 */
export function appleStillBilling(
  sub: Pick<Subscription, 'provider' | 'status' | 'currentPeriodEnd'> | null | undefined,
  now = Date.now(),
): boolean {
  if (sub?.provider !== 'apple' || sub.status === 'expired') return false;
  return sub.currentPeriodEnd.getTime() > now - (sub.status === 'past_due' ? BILLING_RETRY_MS : 0);
}
