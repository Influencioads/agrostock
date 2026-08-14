/**
 * Service providers — the five roles, the eleven categories, and the rules that
 * tie them together.
 *
 * IDs are the *stored* values. Labels are translated as `enums:serviceRole.<ID>`
 * and `enums:serviceCategory.<ID>` — never hardcode them in a view, same rule the
 * unit, delivery and vehicle enums follow.
 */

/** Roles that self-register as a service provider and receive enquiries. */
export const SERVICE_ROLES = [
  'accountant',
  'packer',
  'processor',
  'fulfillment_partner',
  'finance_partner',
] as const;
export type ServiceRole = (typeof SERVICE_ROLES)[number];

export function isServiceRole(value: unknown): value is ServiceRole {
  return typeof value === 'string' && (SERVICE_ROLES as readonly string[]).includes(value);
}

/** Everything a provider can offer. */
export const SERVICE_CATEGORIES = [
  'accounting',
  'customs_clearance',
  'financial_services',
  'fulfillment',
  'packing',
  'roasting',
  'roasting_salting',
  'chopping',
  'blanching',
  'pitting',
  'sorting_grading',
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return typeof value === 'string' && (SERVICE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Presentation grouping only. A provider may legitimately hold categories across
 * groups (a fulfilment partner that also packs), so this never constrains data —
 * it only decides which heading a category sits under in a picker or filter.
 */
export const SERVICE_GROUPS = {
  financial: ['accounting', 'customs_clearance', 'financial_services'],
  logistics: ['fulfillment', 'packing'],
  processing: ['roasting', 'roasting_salting', 'chopping', 'blanching', 'pitting', 'sorting_grading'],
} as const satisfies Record<string, readonly ServiceCategory[]>;
export type ServiceGroup = keyof typeof SERVICE_GROUPS;

/**
 * Which categories each role may offer.
 *
 * This is a real constraint, not a hint: an accountant listing `blanching` would
 * appear in a processing search they cannot serve, and the buyer only discovers
 * that after sending an enquiry. Enforced server-side on write.
 *
 * `processor` covers the six processing trades because they are the same kind of
 * business with different equipment — a roasting house that also sorts and grades
 * is the norm, and forcing six roles on it would mean six accounts.
 */
export const ROLE_CATEGORIES = {
  accountant: ['accounting', 'customs_clearance'],
  finance_partner: ['financial_services'],
  fulfillment_partner: ['fulfillment'],
  packer: ['packing', 'fulfillment'],
  processor: [...SERVICE_GROUPS.processing],
} as const satisfies Record<ServiceRole, readonly ServiceCategory[]>;

/** The categories this role may offer — empty for any non-service role. */
export function categoriesForRole(role: string): readonly ServiceCategory[] {
  return isServiceRole(role) ? ROLE_CATEGORIES[role] : [];
}

/**
 * Drop anything the role may not offer. Returns the kept categories, de-duped and
 * in canonical order so two providers with the same services store them the same
 * way (and a filter matches both).
 */
export function allowedCategories(role: string, requested: readonly string[]): ServiceCategory[] {
  const allowed = new Set<string>(categoriesForRole(role));
  return SERVICE_CATEGORIES.filter((c) => allowed.has(c) && requested.includes(c));
}

/**
 * How a provider's price is measured.
 *
 * The first five are the original set and are already stored on
 * `ServiceProvider.pricingBasis`; the rest were added for per-service pricing,
 * where a customs filing is quoted per shipment and an audit as a percentage.
 * Order is the display order, so the common ones stay at the top of a picker.
 */
export const SERVICE_PRICING_BASES = [
  'per_kg', 'per_ton', 'per_lot', 'per_hour', 'per_month',
  'per_unit', 'per_piece', 'per_order', 'per_shipment', 'per_container',
  'per_pallet', 'per_day', 'per_sqft', 'percentage', 'on_request',
] as const;
export type ServicePricingBasis = (typeof SERVICE_PRICING_BASES)[number];

/** The one basis that may carry no price at all. */
export const ON_REQUEST_BASIS = 'on_request';

/**
 * Which taxonomy branches each service role may price, as slug prefixes.
 *
 * This is the taxonomy-era twin of `ROLE_CATEGORIES`, derived from it rather
 * than invented: every role keeps exactly the reach it already had, expressed
 * against the new tree. Nothing is broadened.
 *
 * The one judgement call is `accountant`, which holds `customs_clearance` today.
 * That name exists twice in the new taxonomy — as an (empty) Financial group and
 * as the 37-leaf `customs-and-border-logistics` under Logistics. Only the
 * Financial one is granted here: handing an accountant the Logistics branch
 * would let them list port handling and border clearance, which is a broader
 * permission than they have today and a decision for the client, not a mapping.
 */
export const ROLE_SERVICE_BRANCHES = {
  accountant: [
    'financial-and-compliance/accounting',
    'financial-and-compliance/taxation',
    'financial-and-compliance/customs-clearance',
    'financial-and-compliance/audit-and-certification',
  ],
  finance_partner: [
    'financial-and-compliance/financial-services',
    'financial-and-compliance/insurance',
  ],
  fulfillment_partner: [
    'logistics-and-handling/fulfilment',
    'logistics-and-handling/warehousing',
    'logistics-and-handling/transportation',
    'logistics-and-handling/freight-forwarding',
    'logistics-and-handling/cold-chain',
    'logistics-and-handling/loading-and-unloading',
    'logistics-and-handling/container-handling',
    'logistics-and-handling/last-mile-delivery',
    'logistics-and-handling/inspection',
  ],
  packer: [
    'logistics-and-handling/packing',
    'logistics-and-handling/fulfilment',
    'processing/packaging',
  ],
  // `processor` covers every processing trade for the same reason it covers all
  // six legacy processing categories: one business, different equipment.
  processor: ['processing'],
} as const satisfies Record<ServiceRole, readonly string[]>;

/** The branch prefixes this role may price — empty for any non-service role. */
export function branchesForRole(role: string): readonly string[] {
  return isServiceRole(role) ? ROLE_SERVICE_BRANCHES[role] : [];
}

/**
 * May this role price this leaf? Slug is the materialized path, so reach is a
 * prefix test — no tree walk, and it holds however deep the leaf sits.
 */
export function canRolePriceService(role: string, slug: string): boolean {
  return branchesForRole(role).some((prefix) => slug === prefix || slug.startsWith(`${prefix}/`));
}
