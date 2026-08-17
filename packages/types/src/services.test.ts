import { describe, expect, it } from 'vitest';
import {
  allowedCategories, categoriesForRole, hireTargetForRoles, isServiceRole,
  ROLE_CATEGORIES, SERVICE_CATEGORIES, SERVICE_GROUPS, SERVICE_ROLES,
} from './services';

describe('service roles and categories', () => {
  it('recognises exactly the five service roles', () => {
    expect(SERVICE_ROLES).toHaveLength(5);
    expect(isServiceRole('packer')).toBe(true);
    // Existing roles must NOT be treated as service providers.
    expect(isServiceRole('transporter')).toBe(false);
    expect(isServiceRole('admin')).toBe(false);
  });

  it('covers every category in exactly one presentation group', () => {
    const grouped = Object.values(SERVICE_GROUPS).flat();
    expect([...grouped].sort()).toEqual([...SERVICE_CATEGORIES].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it('gives every role at least one category it can offer', () => {
    for (const role of SERVICE_ROLES) expect(categoriesForRole(role).length).toBeGreaterThan(0);
    expect(categoriesForRole('buyer')).toEqual([]);
  });

  it('only ever maps roles to real categories', () => {
    for (const cats of Object.values(ROLE_CATEGORIES)) {
      for (const c of cats) expect(SERVICE_CATEGORIES).toContain(c);
    }
  });
});

describe('allowedCategories', () => {
  it('drops categories the role may not offer', () => {
    // An accountant listing a processing service would surface in searches they
    // cannot serve — the buyer only finds out after sending an enquiry.
    expect(allowedCategories('accountant', ['accounting', 'blanching'])).toEqual(['accounting']);
    expect(allowedCategories('processor', ['roasting', 'accounting'])).toEqual(['roasting']);
  });

  it('returns canonical order regardless of input order, and de-dupes', () => {
    expect(allowedCategories('processor', ['pitting', 'roasting', 'pitting']))
      .toEqual(['roasting', 'pitting']);
  });

  it('returns nothing for a non-service role', () => {
    expect(allowedCategories('transporter', ['packing'])).toEqual([]);
  });

  it('allows a packer to also offer fulfilment', () => {
    expect(allowedCategories('packer', ['packing', 'fulfillment'])).toEqual(['fulfillment', 'packing']);
  });
});

describe('hireTargetForRoles', () => {
  it('maps each provider role to its own hire flow', () => {
    expect(hireTargetForRoles(['transporter'])).toBe('transporter');
    expect(hireTargetForRoles(['loaderco'])).toBe('loaderco');
    expect(hireTargetForRoles(['workerco'])).toBe('workerco');
    expect(hireTargetForRoles(['worker'])).toBe('worker');
  });

  it('folds all five service roles into one flow', () => {
    for (const role of SERVICE_ROLES) expect(hireTargetForRoles([role])).toBe('service_provider');
  });

  it('reads a worker company as a company, not an individual', () => {
    // The regression this guards: hired as `worker`, a company's job is minted
    // with no loaderco attached, so its own dashboard never sees the work.
    expect(hireTargetForRoles(['worker', 'workerco'])).toBe('workerco');
  });

  it('has nothing to hire for a buyer or seller', () => {
    expect(hireTargetForRoles(['buyer', 'seller'])).toBeNull();
    expect(hireTargetForRoles([null, undefined])).toBeNull();
  });
});
