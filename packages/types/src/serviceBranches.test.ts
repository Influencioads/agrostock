import { describe, expect, it } from 'vitest';
import {
  branchesForRole, canRolePriceService, categoriesForRole,
  ON_REQUEST_BASIS, ROLE_SERVICE_BRANCHES, SERVICE_PRICING_BASES, SERVICE_ROLES,
} from './services';

/**
 * Role gating against the taxonomy. The rule that matters is NOT BROADENED: a
 * role's reach over the new tree must be the same reach it already had over the
 * eleven legacy categories, so nobody silently gains a trade they cannot serve.
 */
describe('role → taxonomy branches', () => {
  it('covers every service role and nothing else', () => {
    for (const role of SERVICE_ROLES) expect(branchesForRole(role).length).toBeGreaterThan(0);
    expect(branchesForRole('buyer')).toEqual([]);
    expect(branchesForRole('admin')).toEqual([]);
  });

  it('matches a leaf by path prefix, however deep it sits', () => {
    // Level 4.
    expect(canRolePriceService('processor', 'processing/roasting/roasting-types/dry-roasting')).toBe(true);
    // Level 3, directly off a group.
    expect(canRolePriceService('processor', 'processing/cleaning/steam-cleaning')).toBe(true);
    // The branch node itself.
    expect(canRolePriceService('processor', 'processing')).toBe(true);
  });

  it('does not let a prefix leak across sibling branches', () => {
    // "packing" must not match "packaging-types" by accident — a bare
    // startsWith without the separator would.
    expect(canRolePriceService('packer', 'logistics-and-handling/packing/packaging-types/pouch-packing')).toBe(true);
    expect(canRolePriceService('packer', 'logistics-and-handling/packing-something-else/x')).toBe(false);
  });

  it('keeps each role out of the trades it could not offer before', () => {
    // An accountant has never been able to list processing or transport work.
    expect(canRolePriceService('accountant', 'processing/roasting/roasting-types/dry-roasting')).toBe(false);
    expect(canRolePriceService('accountant', 'logistics-and-handling/transportation/road-transport/local-transport')).toBe(false);
    // A processor has never done accounting.
    expect(canRolePriceService('processor', 'financial-and-compliance/accounting/india/bookkeeping')).toBe(false);
    // A finance partner has never packed.
    expect(canRolePriceService('finance_partner', 'logistics-and-handling/packing/primary-packing/food-packing')).toBe(false);
  });

  it('grants an accountant the FINANCIAL customs branch only', () => {
    // `customs_clearance` exists twice in the new tree. Granting the 37-leaf
    // Logistics branch would hand accountants port and border clearance — a
    // broader permission than they hold today, and the client's call.
    expect(canRolePriceService('accountant', 'financial-and-compliance/customs-clearance')).toBe(true);
    expect(canRolePriceService('accountant', 'logistics-and-handling/customs-and-border-logistics')).toBe(false);
    expect(canRolePriceService('accountant', 'logistics-and-handling/customs-and-border-logistics/india/indian-customs')).toBe(false);
  });

  it('keeps the packer/fulfilment overlap the legacy mapping already had', () => {
    // ROLE_CATEGORIES gives `packer` both `packing` and `fulfillment`; the
    // branch mapping has to preserve that, not tidy it away.
    expect(categoriesForRole('packer')).toContain('fulfillment');
    expect(canRolePriceService('packer', 'logistics-and-handling/fulfilment/pick-and-pack')).toBe(true);
  });

  it('gives processor the whole processing section, as its legacy mapping did', () => {
    // `processor` held all six legacy processing categories; one prefix is the
    // faithful translation of that.
    expect(ROLE_SERVICE_BRANCHES.processor).toEqual(['processing']);
    expect(categoriesForRole('processor').length).toBe(6);
  });

  it('never grants two roles the same branch by accident', () => {
    // Overlaps are allowed but must be deliberate: packer/fulfilment_partner
    // share Fulfilment, and nothing else overlaps.
    const pairs: string[] = [];
    for (const [role, branches] of Object.entries(ROLE_SERVICE_BRANCHES)) {
      for (const b of branches) pairs.push(`${b}|${role}`);
    }
    const byBranch = new Map<string, string[]>();
    for (const p of pairs) {
      const [branch, role] = p.split('|');
      byBranch.set(branch, [...(byBranch.get(branch) ?? []), role]);
    }
    const shared = [...byBranch.entries()].filter(([, roles]) => roles.length > 1);
    expect(shared.map(([b]) => b)).toEqual(['logistics-and-handling/fulfilment']);
  });
});

describe('pricing bases', () => {
  it('keeps the original five first and unchanged', () => {
    // They are already stored on ServiceProvider.pricingBasis — reordering or
    // renaming any of them would silently reinterpret existing rows.
    expect(SERVICE_PRICING_BASES.slice(0, 5)).toEqual(['per_kg', 'per_ton', 'per_lot', 'per_hour', 'per_month']);
  });

  it('adds the bases per-service pricing needs, including on_request', () => {
    for (const basis of ['per_shipment', 'per_container', 'per_pallet', 'percentage', 'on_request']) {
      expect(SERVICE_PRICING_BASES).toContain(basis);
    }
    expect(SERVICE_PRICING_BASES).toContain(ON_REQUEST_BASIS);
  });
});
