import { describe, expect, it } from 'vitest';
import { PUBLIC_ROLES } from '../src/auth/dto';

// Regression test for the privilege-escalation fix: self-registration must never
// let a user assign themselves a privileged role. Workers ARE self-registerable
// (they get an unaffiliated Worker record, no elevated permissions).
describe('public self-registration roles', () => {
  it('excludes admin', () => {
    expect(PUBLIC_ROLES).not.toContain('admin');
  });

  it('allows marketplace and pending-approval service-provider signup roles', () => {
    expect([...PUBLIC_ROLES].sort()).toEqual([
      'accountant', 'buyer', 'finance_partner', 'fulfillment_partner', 'loaderco',
      'packer', 'processor', 'seller', 'transporter', 'worker',
    ]);
  });
});
