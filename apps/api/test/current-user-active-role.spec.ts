import { describe, expect, it } from 'vitest';
import { resolveActiveRole } from '../src/auth/current-user.decorator';

describe('resolveActiveRole', () => {
  it('uses a requested role when the user actually has that role', () => {
    expect(resolveActiveRole({ role: 'buyer', roles: ['buyer', 'seller'] }, 'seller')).toBe('seller');
  });

  it('falls back to the primary role when the requested role is not held', () => {
    expect(resolveActiveRole({ role: 'buyer', roles: ['buyer'] }, 'worker')).toBe('buyer');
  });
});
