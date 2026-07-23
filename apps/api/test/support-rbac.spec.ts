import { describe, expect, it } from 'vitest';
import { isSupportStaff } from '../src/support/support.service';
import type { AuthUser } from '../src/auth/current-user.decorator';

function user(over: Partial<AuthUser>): AuthUser {
  return { id: 'u', email: 'e', role: 'buyer', roles: ['buyer'], adminPermissions: [], ...over } as AuthUser;
}

describe('support staff scoping (F17)', () => {
  it('a non-admin is never support staff', () => {
    expect(isSupportStaff(user({ role: 'buyer', roles: ['buyer', 'seller'] }))).toBe(false);
  });

  it('an admin WITHOUT support_agent is not support staff', () => {
    // This is the bypass the finding describes: coarse admin role was enough.
    expect(isSupportStaff(user({ role: 'admin', roles: ['admin'], adminPermissions: ['kyc'] }))).toBe(false);
  });

  it('an admin WITH support_agent is support staff', () => {
    expect(isSupportStaff(user({ role: 'admin', roles: ['admin'], adminPermissions: ['support_agent'] }))).toBe(true);
  });

  it('a super-admin (staff_manage) bypasses the per-module check', () => {
    expect(isSupportStaff(user({ role: 'admin', roles: ['admin'], adminPermissions: ['staff_manage'] }))).toBe(true);
  });

  it('an admin with no permissions at all is not support staff', () => {
    expect(isSupportStaff(user({ role: 'admin', roles: ['admin'], adminPermissions: [] }))).toBe(false);
  });
});
