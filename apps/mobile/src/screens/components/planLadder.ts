/**
 * Buyer and seller share one account and switch between the two freely, so
 * each sees both ladders. Every other role sees only its own.
 *
 * Pure (no React Native) so the rule is unit-testable, like `cardBadges.ts`.
 */
export const TRADE_ROLES = ['buyer', 'seller'];

/**
 * Ladders iOS does not sell. Their paid rungs differ only in quotas nobody
 * counts yet (UNENFORCED_LIMIT_KEYS) and in feature flags nothing checks, and
 * App Review rejects a subscription that unlocks nothing. Android keeps
 * mirroring the website.
 */
export const IAP_HIDDEN_LADDERS = ['buyer', 'worker'];

/** `iap`: this build sells through the App Store. A worker there gets none. */
export function laddersFor(role: string, iap: boolean): string[] {
  const all = TRADE_ROLES.includes(role) ? TRADE_ROLES : [role];
  return iap ? all.filter((r) => !IAP_HIDDEN_LADDERS.includes(r)) : all;
}

/**
 * The role the header, meters and cancel describe: the user's own, unless this
 * build hides that ladder and shows another (a buyer on iOS sees only the seller
 * ladder) — then the ladder on screen, so buying a plan there shows up above it.
 */
export function shownRoleFor(role: string, ladders: string[], ladderRole: string): string {
  return ladders.length && !ladders.includes(role) ? ladderRole : role;
}

/**
 * What a plan card's button does. The API only sells a plan for a role the
 * account holds (`held` is that role's entitlement, absent when it doesn't),
 * so an unheld ladder sends the user to add the role first; a held one offers
 * checkout only on a higher tier than the current plan — and none at all while
 * that plan is `billedElsewhere` (App Store vs gateway): neither channel can
 * stop the other's renewal, so an upgrade would charge the customer twice.
 */
export function planAction(
  planTier: number,
  held: { tier: number } | undefined,
  billedElsewhere?: boolean,
): 'addRole' | 'choose' | 'none' {
  if (!held) return 'addRole';
  return planTier > held.tier && !billedElsewhere ? 'choose' : 'none';
}

/** How long past due the API keeps refusing a card checkout on an App Store plan. */
const APPLE_RETRY_MS = 60 * 24 * 3600e3;

/**
 * Whether the ladder's subscription is billed by the channel this build does
 * not sell through (`iap`: the App Store build).
 *
 * On iOS that is a paid gateway plan still running — a canceled one runs to its
 * period end. An admin-granted plan has no provider and blocks nothing.
 *
 * On Android it is an App Store plan the API refuses a card checkout for: still
 * in its period, or past due while Apple keeps retrying the renewal. Its tier
 * reads 0 while past due, so the tier is not consulted.
 */
export function isBilledElsewhere(
  sub: { status: string; provider: string | null; currentPeriodEnd: string } | undefined,
  tier: number,
  iap: boolean,
  now = Date.now(),
): boolean {
  if (!sub) return false;
  const end = new Date(sub.currentPeriodEnd).getTime();
  if (iap) {
    return (
      !!sub.provider &&
      sub.provider !== 'apple' &&
      tier > 0 &&
      ['active', 'past_due', 'canceled'].includes(sub.status) &&
      end > now
    );
  }
  return (
    sub.provider === 'apple' &&
    sub.status !== 'expired' &&
    (end > now || (sub.status === 'past_due' && end > now - APPLE_RETRY_MS))
  );
}
