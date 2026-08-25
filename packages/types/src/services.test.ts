import { describe, expect, it } from 'vitest';
import {
  allowedCategories, capacityLabel, categoriesForRole, hireTargetForRoles, isServiceRole,
  ROLE_CATEGORIES, SERVICE_CATEGORIES, SERVICE_GROUPS, SERVICE_ROLES,
} from './services';

describe('service roles and categories', () => {
  it('recognises exactly the service roles', () => {
    expect([...SERVICE_ROLES].sort()).toEqual([
      'accountant', 'finance_partner', 'fulfillment_partner', 'legal_advisor', 'packer', 'processor',
    ]);
    expect(isServiceRole('packer')).toBe(true);
    expect(isServiceRole('legal_advisor')).toBe(true);
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

  it('keeps a law firm out of the accounting categories', () => {
    expect(allowedCategories('legal_advisor', ['legal_services', 'accounting'])).toEqual(['legal_services']);
  });
});

describe('capacityLabel', () => {
  // `t` here is the i18next contract the apps pass in: the catalog holds the
  // unit NAME and `count` picks its plural form.
  const t = (key: string, o?: Record<string, unknown>) =>
    `${key.split('.').pop()}${(o!.count as number) === 1 ? '' : 's'}`;

  it('names the unit instead of printing a bare number', () => {
    expect(capacityLabel(30, 'ton', t)).toBe('30 tons');
    expect(capacityLabel(30, 'filing', t)).toBe('30 filings');
  });

  it('still renders rows written before the unit column existed', () => {
    expect(capacityLabel(30, null, t)).toBe('30');
    // A stale client sending something outside the list must not become a key.
    expect(capacityLabel(30, 'lightyears', t)).toBe('30');
  });

  it('has nothing to say when no capacity is set', () => {
    expect(capacityLabel(null, 'ton', t)).toBeNull();
  });
});

describe('hireTargetForRoles', () => {
  it('maps each provider role to its own hire flow', () => {
    expect(hireTargetForRoles(['transporter'])).toBe('transporter');
    expect(hireTargetForRoles(['loaderco'])).toBe('loaderco');
    expect(hireTargetForRoles(['workerco'])).toBe('workerco');
    expect(hireTargetForRoles(['worker'])).toBe('worker');
  });

  it('folds every service role into one flow', () => {
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
