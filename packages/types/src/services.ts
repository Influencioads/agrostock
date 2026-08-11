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

/** How a provider's price is measured. */
export const SERVICE_PRICING_BASES = ['per_kg', 'per_ton', 'per_lot', 'per_hour', 'per_month'] as const;
export type ServicePricingBasis = (typeof SERVICE_PRICING_BASES)[number];
