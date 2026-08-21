/**
 * Subscription billing: the shape of a plan's quotas and feature flags, plus the
 * published price card.
 *
 * `PLAN_SEED` is the commercial plan of 17 Aug 2026 expressed as data. It is the
 * SEED and the "restore defaults" source — never the runtime source of truth.
 * Once seeded, prices and quotas are DB rows an admin edits, because a price
 * change must not require a deployment.
 *
 * Money is in RUB minor units (kopecks), VAT-inclusive. Clients display it in
 * whatever currency the user picked by converting through the existing FX
 * snapshot; the ruble figure is the one that is actually charged.
 */

/* ── billing cycles ─────────────────────────────────────────────── */

export const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Months covered by one payment on each cycle — drives the per-month figure. */
export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/* ── quotas ─────────────────────────────────────────────────────── */

/**
 * Every numeric quota the platform enforces. A key that is absent from a plan's
 * `limits`, or set to null, means UNLIMITED — not zero. Keys ending in
 * `PerMonth` are counted within the current billing period; the rest count live
 * rows and so shrink again when the user deletes something.
 */
export const PLAN_LIMIT_KEYS = [
  // seller
  'activeListings',
  'auctionLotsPerMonth',
  'photosPerListing',
  // buyer
  'rfqsPerMonth',
  'savedSearches',
  // transporter
  'vehicles',
  'driverAccounts',
  'operatingRegions',
  // transporter + loaderco
  'hireResponsesPerMonth',
  // loaderco
  'managedWorkers',
  // service providers
  'pricedServices',
  'enquiriesPerMonth',
  // shared
  'serviceAreas',
  'teamMembers',
] as const;
export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

/** `null` = unlimited. Absent = unlimited too, so a sparse object is legal. */
export type PlanLimits = Partial<Record<PlanLimitKey, number | null>>;

export function isPlanLimitKey(v: string): v is PlanLimitKey {
  return (PLAN_LIMIT_KEYS as readonly string[]).includes(v);
}

/**
 * Quota keys counted inside the current billing period rather than as live rows.
 * Derived from the naming convention so the two can never drift.
 */
export const PERIOD_LIMIT_KEYS = PLAN_LIMIT_KEYS.filter((k) => k.endsWith('PerMonth')) as readonly PlanLimitKey[];

export function isPeriodLimit(key: PlanLimitKey): boolean {
  return key.endsWith('PerMonth');
}

/* ── feature flags ──────────────────────────────────────────────── */

/**
 * Non-numeric entitlements. Most are booleans; three are graded enums whose
 * allowed values are listed in `PLAN_FEATURE_OPTIONS` below.
 */
export const PLAN_FEATURE_KEYS = [
  'verifiedBadge',
  'searchPriority',
  'analytics',
  'bidRoom',
  'apiAccess',
  'bulkImport',
  'escrowPriority',
  'routePriority',
  'dispatchBoard',
  'payoutReports',
  'directoryVisible',
  'directHireRequests',
  'directoryPlacement',
] as const;
export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

/** Graded features. Anything not listed here is a plain boolean. */
export const PLAN_FEATURE_OPTIONS = {
  searchPriority: ['none', 'standard', 'top'],
  routePriority: ['none', 'standard', 'top'],
  analytics: ['none', 'basic', 'full'],
  directoryPlacement: ['standard', 'categoryTop', 'sectionTop'],
} as const satisfies Partial<Record<PlanFeatureKey, readonly string[]>>;

export type PlanFeatures = Partial<Record<PlanFeatureKey, boolean | string>>;

export function isPlanFeatureKey(v: string): v is PlanFeatureKey {
  return (PLAN_FEATURE_KEYS as readonly string[]).includes(v);
}

/** True when the feature is graded (a string) rather than a boolean toggle. */
export function isGradedFeature(key: PlanFeatureKey): key is keyof typeof PLAN_FEATURE_OPTIONS {
  return key in PLAN_FEATURE_OPTIONS;
}

/* ── the published price card ───────────────────────────────────── */

export interface PlanSeed {
  /** Stable machine key; plans are upserted on this. */
  code: string;
  /** Prisma `Role` value this ladder serves. */
  role: string;
  /** 0 free · 1 standard/anchor · 2 pro. */
  tier: number;
  name: string;
  description?: string;
  /** Kopecks per cycle. A free tier omits this entirely. */
  prices?: Partial<Record<BillingCycle, number>>;
  limits: PlanLimits;
  features: PlanFeatures;
}

/** Rubles → kopecks, so the table below reads like the printed price card. */
const rub = (n: number) => n * 100;

/**
 * The five service-provider roles share ONE ladder: they differ in what they
 * list, not in how much platform they consume. Five tables would be five things
 * to keep in sync for no extra revenue — so the quotas are defined once here and
 * stamped onto one Plan row per role.
 */
const SERVICE_LIMITS = {
  start: { pricedServices: 3, enquiriesPerMonth: 5, serviceAreas: 1, teamMembers: 1 },
  standard: { pricedServices: 25, enquiriesPerMonth: null, serviceAreas: 5, teamMembers: 5 },
  pro: { pricedServices: null, enquiriesPerMonth: null, serviceAreas: null, teamMembers: 25 },
} satisfies Record<string, PlanLimits>;

const SERVICE_FEATURES = {
  start: { verifiedBadge: false, directoryPlacement: 'standard', apiAccess: false, bulkImport: false },
  standard: { verifiedBadge: true, directoryPlacement: 'categoryTop', apiAccess: false, bulkImport: false },
  pro: { verifiedBadge: true, directoryPlacement: 'sectionTop', apiAccess: true, bulkImport: true },
} satisfies Record<string, PlanFeatures>;

/** Roles on the shared service ladder, and their Standard price in rubles. */
const SERVICE_ROLE_PRICING: { role: string; standard: Partial<Record<BillingCycle, number>> }[] = [
  { role: 'accountant', standard: { monthly: rub(4900), quarterly: rub(13200), yearly: rub(40900) } },
  { role: 'packer', standard: { monthly: rub(4900), quarterly: rub(13200), yearly: rub(40900) } },
  { role: 'fulfillment_partner', standard: { monthly: rub(4900), quarterly: rub(13200), yearly: rub(40900) } },
  { role: 'finance_partner', standard: { monthly: rub(4900), quarterly: rub(13200), yearly: rub(40900) } },
  // Processor exception: roasting, sorting/grading, blanching and pitting lines
  // are capital-equipment businesses quoting per tonne, not per filing, so they
  // carry materially higher job values and take an uplifted Standard tier.
  { role: 'processor', standard: { monthly: rub(6900), quarterly: rub(18900), yearly: rub(57900) } },
];

function serviceLadder(): PlanSeed[] {
  return SERVICE_ROLE_PRICING.flatMap(({ role, standard }) => [
    {
      code: `${role}_start`,
      role,
      tier: 0,
      name: 'Start',
      limits: SERVICE_LIMITS.start,
      features: SERVICE_FEATURES.start,
    },
    {
      code: `${role}_standard`,
      role,
      tier: 1,
      name: 'Standard',
      prices: standard,
      limits: SERVICE_LIMITS.standard,
      features: SERVICE_FEATURES.standard,
    },
    {
      code: `${role}_pro`,
      role,
      tier: 2,
      name: 'Pro',
      prices: { monthly: rub(11900), quarterly: rub(32900), yearly: rub(99900) },
      limits: SERVICE_LIMITS.pro,
      features: SERVICE_FEATURES.pro,
    },
  ]);
}

/**
 * The complete price card. Every role gets a free tier — supply that is not on
 * the platform generates no revenue at any price — and a paid ladder that sells
 * volume and visibility rather than access.
 */
export const PLAN_SEED: PlanSeed[] = [
  /* ── sellers ── farms, cooperatives, trading houses, wholesalers ── */
  {
    code: 'seller_basic',
    role: 'seller',
    tier: 0,
    name: 'Basic',
    limits: { activeListings: 5, auctionLotsPerMonth: 1, photosPerListing: 3, teamMembers: 1 },
    features: { verifiedBadge: false, searchPriority: 'none', analytics: 'none' },
  },
  {
    code: 'seller_standard',
    role: 'seller',
    tier: 1,
    name: 'Standard',
    prices: { monthly: rub(2900), quarterly: rub(7900), yearly: rub(24900) },
    limits: { activeListings: 50, auctionLotsPerMonth: 5, photosPerListing: 10, teamMembers: 3 },
    features: { verifiedBadge: true, searchPriority: 'standard', analytics: 'basic' },
  },
  {
    code: 'seller_pro',
    role: 'seller',
    tier: 2,
    name: 'Pro',
    prices: { monthly: rub(7900), quarterly: rub(21900), yearly: rub(66900) },
    limits: { activeListings: null, auctionLotsPerMonth: null, photosPerListing: 15, teamMembers: 10 },
    features: { verifiedBadge: true, searchPriority: 'top', analytics: 'full' },
  },

  /* ── buyers ── charged last and lightest: demand is the scarcer resource ── */
  {
    code: 'buyer_basic',
    role: 'buyer',
    tier: 0,
    name: 'Basic',
    limits: { rfqsPerMonth: 3, savedSearches: 3, teamMembers: 1 },
    features: { bidRoom: false, apiAccess: false, escrowPriority: false },
  },
  {
    code: 'buyer_business',
    role: 'buyer',
    tier: 1,
    name: 'Business',
    prices: { monthly: rub(1900), quarterly: rub(5100), yearly: rub(15900) },
    limits: { rfqsPerMonth: 30, savedSearches: 25, teamMembers: 5 },
    features: { bidRoom: true, apiAccess: false, escrowPriority: false },
  },
  {
    code: 'buyer_corporate',
    role: 'buyer',
    tier: 2,
    name: 'Corporate',
    prices: { monthly: rub(5900), quarterly: rub(15900), yearly: rub(49900) },
    limits: { rfqsPerMonth: null, savedSearches: null, teamMembers: 25 },
    features: { bidRoom: true, apiAccess: true, escrowPriority: true },
  },

  /* ── transporters ── independent hauliers and fleet operators ── */
  {
    code: 'transporter_basic',
    role: 'transporter',
    tier: 0,
    name: 'Basic',
    limits: { vehicles: 1, hireResponsesPerMonth: 5, driverAccounts: 0, operatingRegions: 1 },
    features: { routePriority: 'none' },
  },
  {
    code: 'transporter_standard',
    role: 'transporter',
    tier: 1,
    name: 'Standard',
    prices: { monthly: rub(3900), quarterly: rub(10500), yearly: rub(32900) },
    limits: { vehicles: 5, hireResponsesPerMonth: null, driverAccounts: 5, operatingRegions: 5 },
    features: { routePriority: 'standard' },
  },
  {
    code: 'transporter_fleet',
    role: 'transporter',
    tier: 2,
    name: 'Fleet',
    prices: { monthly: rub(9900), quarterly: rub(26900), yearly: rub(83900) },
    limits: { vehicles: null, hireResponsesPerMonth: null, driverAccounts: null, operatingRegions: null },
    features: { routePriority: 'top' },
  },

  /* ── loading companies ── contractors managing crews of workers ── */
  {
    code: 'loaderco_basic',
    role: 'loaderco',
    tier: 0,
    name: 'Basic',
    limits: { managedWorkers: 3, hireResponsesPerMonth: 5, serviceAreas: 1 },
    features: { dispatchBoard: false, payoutReports: false },
  },
  {
    code: 'loaderco_standard',
    role: 'loaderco',
    tier: 1,
    name: 'Standard',
    prices: { monthly: rub(2900), quarterly: rub(7900), yearly: rub(24900) },
    limits: { managedWorkers: 10, hireResponsesPerMonth: null, serviceAreas: 5 },
    features: { dispatchBoard: true, payoutReports: true },
  },
  {
    code: 'loaderco_pro',
    role: 'loaderco',
    tier: 2,
    name: 'Pro',
    prices: { monthly: rub(6900), quarterly: rub(18900), yearly: rub(57900) },
    limits: { managedWorkers: 50, hireResponsesPerMonth: null, serviceAreas: null },
    features: { dispatchBoard: true, payoutReports: true },
  },

  /* ── general labour companies ── same product as a loading company ── */
  {
    code: 'workerco_basic',
    role: 'workerco',
    tier: 0,
    name: 'Basic',
    limits: { managedWorkers: 3, hireResponsesPerMonth: 5, serviceAreas: 1 },
    features: { dispatchBoard: false, payoutReports: false },
  },
  {
    code: 'workerco_standard',
    role: 'workerco',
    tier: 1,
    name: 'Standard',
    prices: { monthly: rub(2900), quarterly: rub(7900), yearly: rub(24900) },
    limits: { managedWorkers: 10, hireResponsesPerMonth: null, serviceAreas: 5 },
    features: { dispatchBoard: true, payoutReports: true },
  },
  {
    code: 'workerco_pro',
    role: 'workerco',
    tier: 2,
    name: 'Pro',
    prices: { monthly: rub(6900), quarterly: rub(18900), yearly: rub(57900) },
    limits: { managedWorkers: 50, hireResponsesPerMonth: null, serviceAreas: null },
    features: { dispatchBoard: true, payoutReports: true },
  },

  /* ── workers ─────────────────────────────────────────────────────
   * Deliberately near-free. Workers are the thinnest and most price-sensitive
   * supply on the platform, and loading companies onboard them for free anyway;
   * a real fee here would reduce crew availability and degrade the loading-company
   * product we DO charge for. This tier exists only for independents who want
   * direct visibility. It is a product decision, not a revenue line.
   */
  {
    code: 'worker_basic',
    role: 'worker',
    tier: 0,
    name: 'Basic',
    limits: {},
    features: { directoryVisible: false, directHireRequests: false, verifiedBadge: false },
  },
  {
    code: 'worker_pro',
    role: 'worker',
    tier: 1,
    name: 'Pro',
    prices: { monthly: rub(490), quarterly: rub(1290), yearly: rub(3990) },
    limits: {},
    features: { directoryVisible: true, directHireRequests: true, verifiedBadge: true },
  },

  ...serviceLadder(),
];

/* ── pay-as-you-go add-ons ──────────────────────────────────────── */

export const ADDON_KINDS = [
  'extra_listing',
  'promote_category',
  'promote_home',
  'auction_lot',
  'category_banner',
  'kyc_badge',
] as const;
export type AddonKind = (typeof ADDON_KINDS)[number];

export interface AddonSpec {
  kind: AddonKind;
  /** Kopecks. */
  amountMinor: number;
  /** How long the purchase stays active; null = permanent. */
  durationDays: number | null;
  /** What the buyer must nominate when purchasing. */
  target: 'product' | 'category' | 'none';
}

/**
 * The long-tail line: available to anyone including free-tier accounts, and the
 * most reliable route into a subscription.
 */
export const ADDON_SPECS: Record<AddonKind, AddonSpec> = {
  extra_listing: { kind: 'extra_listing', amountMinor: rub(149), durationDays: 30, target: 'none' },
  promote_category: { kind: 'promote_category', amountMinor: rub(490), durationDays: 7, target: 'product' },
  promote_home: { kind: 'promote_home', amountMinor: rub(1900), durationDays: 7, target: 'product' },
  auction_lot: { kind: 'auction_lot', amountMinor: rub(990), durationDays: 30, target: 'none' },
  category_banner: { kind: 'category_banner', amountMinor: rub(4900), durationDays: 30, target: 'category' },
  kyc_badge: { kind: 'kyc_badge', amountMinor: rub(2900), durationDays: null, target: 'none' },
};

/* ── payment providers ──────────────────────────────────────────── */

export const PAYMENT_PROVIDERS = ['robokassa', 'yookassa', 'tbank'] as const;
export type PaymentProviderKey = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderKey, string> = {
  robokassa: 'Robokassa',
  yookassa: 'YooKassa',
  tbank: 'T-Bank',
};

/* ── helpers shared by clients and API ──────────────────────────── */

/**
 * Per-month equivalent of a cycle price, in minor units. The pricing page shows
 * this next to the annual figure — the 30% discount only earns its keep if
 * customers actually pick yearly, and defaults plus a visible per-month number
 * decide that far more than copy does.
 */
export function perMonthMinor(amountMinor: number, cycle: BillingCycle): number {
  // Rounded to a whole MAJOR unit, not a whole minor one: this figure only ever
  // sits beside a price as "≈ ₽4 158 / month", and rendering ₽4 158.33 there
  // reads like a real charge with kopecks rather than a monthly equivalent.
  const perMonth = amountMinor / CYCLE_MONTHS[cycle];
  return Math.round(perMonth / 100) * 100;
}

/** Whole-percent saving of a cycle against paying monthly for the same span. */
export function cycleSavingPercent(monthlyMinor: number, cycleMinor: number, cycle: BillingCycle): number {
  const full = monthlyMinor * CYCLE_MONTHS[cycle];
  if (full <= 0) return 0;
  return Math.round(((full - cycleMinor) / full) * 100);
}

/** Apply a grandfathering/admin discount. Clamped so it can never mint money. */
export function applyDiscount(amountMinor: number, discountPercent: number): number {
  const pct = Math.min(100, Math.max(0, discountPercent));
  return Math.round(amountMinor * (1 - pct / 100));
}
