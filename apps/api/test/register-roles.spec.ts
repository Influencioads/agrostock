import { describe, expect, it } from 'vitest';
import { SERVICE_ROLES } from '@agrotraders/types';
import { PUBLIC_ROLES } from '../src/auth/dto';

// Regression test for the privilege-escalation fix: self-registration must never
// let a user assign themselves a privileged role. Workers ARE self-registerable
// (they get an unaffiliated Worker record, no elevated permissions), and so are
// the five service-provider roles — like transporters, they self-register and an
// admin verifies them afterwards through the existing KYC gate.
describe('public self-registration roles', () => {
  it('excludes admin', () => {
    // The property that actually matters: no self-assignable privileged role.
    expect(PUBLIC_ROLES).not.toContain('admin');
  });

  it('allows exactly the intended self-serve roles', () => {
    // Pinned as a full set on purpose. A role added here is a role anyone on the
    // internet can grant themselves, so widening this list should require
    // deliberately editing this line.
    expect([...PUBLIC_ROLES].sort()).toEqual([
      'accountant',
      'buyer',
      'finance_partner',
      'fulfillment_partner',
      'loaderco',
      'packer',
      'processor',
      'seller',
      'transporter',
      'worker',
      'workerco',
    ]);
  });

  it('includes every service-provider role', () => {
    // Guards the other direction: a service role missing here cannot sign up at
    // all, which fails silently as "that option isn't on the form".
    for (const role of SERVICE_ROLES) expect(PUBLIC_ROLES).toContain(role);
  });
});
