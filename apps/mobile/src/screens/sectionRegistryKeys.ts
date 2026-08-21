import { SERVICE_ROLES } from '@agrotraders/types';

/**
 * Roles that run another role's console verbatim.
 *
 * A general labour company IS a loading company with a wider catalogue of worker
 * types, and the five service roles differ only in which categories they may
 * offer — which their own profile form already scopes. Registering each alias
 * with its own copy of every key would be a dozen duplicated lines and a dozen
 * chances to forget one, so `getSection` falls through to the target instead.
 *
 * Lives here rather than in `registry.tsx` because this module imports no React
 * Native, which is what lets the parity test read it.
 */
export const ROLE_ALIAS: Record<string, string> = {
  workerco: 'loaderco',
  ...Object.fromEntries(SERVICE_ROLES.map((role) => [role, 'service'])),
};

/** Keys the registry declares directly, mirroring `sectionRegistry` in registry.tsx. */
const OWN_KEYS = [
  // Plan & billing — shared across every role.
  'buyer:billing',
  'seller:billing',
  'transporter:billing',
  'loaderco:billing',
  'worker:billing',
  'service:billing',
  // Verification (KYC) — shared across every role.
  'buyer:verify',
  'seller:verify',
  'transporter:verify',
  'loaderco:verify',
  'worker:verify',
  'service:verify',
  'seller:add',
  'seller:bids',
  'seller:auctions',
  'seller:offers',
  'seller:analytics',
  'seller:payouts',
  'seller:ads',
  'seller:wallet',
  'seller:invoices',
  'seller:hires',
  'buyer:dashboard',
  'buyer:bids',
  'buyer:auctions',
  'buyer:invoices',
  'buyer:messages',
  'buyer:saved',
  'buyer:safedeal',
  'buyer:transport',
  'buyer:wallet',
  'transporter:loads',
  'transporter:myrequests',
  'transporter:quotes',
  'transporter:vehicles',
  'transporter:drivers',
  'transporter:routes',
  'transporter:invoices',
  'transporter:earnings',
  'transporter:wallet',
  'transporter:hires',
  'transporter:ratings',
  'transporter:tracking',
  'loaderco:teams',
  'loaderco:labour',
  'loaderco:availability',
  'loaderco:attendance',
  'loaderco:pricing',
  'loaderco:earnings',
  'loaderco:wallet',
  'loaderco:reviews',
  'loaderco:invoices',
  'loaderco:hires',
  'worker:labour',
  'worker:wallet',
  'worker:earnings',
  'worker:attendance',
  'worker:reviews',
  'worker:invoices',
  'worker:hires',
  // Service providers — one set behind the five roles that alias onto it.
  'service:enquiries',
  'service:serviceProfile',
  'service:invoices',
  'service:earnings',
  'service:wallet',
  'service:hires',
] as const;

/** Every `role:section` pair `getSection` resolves, aliases expanded. */
export const SECTION_REGISTRY_KEYS: readonly string[] = [
  ...OWN_KEYS,
  ...Object.entries(ROLE_ALIAS).flatMap(([role, target]) =>
    OWN_KEYS.filter((key) => key.startsWith(`${target}:`)).map((key) => `${role}:${key.slice(target.length + 1)}`),
  ),
];
