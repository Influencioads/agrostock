/**
 * A permissive `EntitlementsService` double.
 *
 * Most specs exercise something other than billing — listing filters, currency
 * conversion, visibility rules — and would only be made noisier by having to set
 * up a plan first. This stub lets every write through and reports "unlimited",
 * which is exactly the behaviour of an unpriced platform.
 *
 * Quota behaviour itself is covered directly in `entitlements.spec.ts`, and the
 * live enforcement path in the domain services is exercised against a real API.
 */
export function noQuotas() {
  return {
    assertWithin: async () => undefined,
    assertArrayWithin: async () => undefined,
    photoLimit: async () => null,
    limit: async () => null,
    usage: async () => [],
    usageOf: async () => null,
    forRole: async () => null,
    feature: async (_u: string, _r: string, _k: string, fallback: boolean | string = false) => fallback,
    resolve: async (userId: string) => ({ userId, roles: {} }),
    invalidate: () => undefined,
  } as never;
}
