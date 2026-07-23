import { describe, expect, it } from 'vitest';
import { resolveActiveRole } from '../src/auth/current-user.decorator';

const user = { role: 'buyer', roles: ['buyer', 'seller'] };

describe('resolveActiveRole (F27)', () => {
  it('honours a requested role the account actually holds', () => {
    expect(resolveActiveRole(user, 'seller')).toBe('seller');
  });

  it('falls back to the primary role when the requested role is not held', () => {
    // An attacker setting x-agro-active-role to a role they lack gains nothing.
    expect(resolveActiveRole(user, 'admin')).toBe('buyer');
    expect(resolveActiveRole(user, 'transporter')).toBe('buyer');
  });

  it('falls back to the primary role when no role is requested', () => {
    expect(resolveActiveRole(user, undefined)).toBe('buyer');
    expect(resolveActiveRole(user, '')).toBe('buyer');
  });

  it('tolerates a header sent as an array (takes the first entry)', () => {
    expect(resolveActiveRole(user, ['seller', 'buyer'])).toBe('seller');
    expect(resolveActiveRole(user, ['admin'])).toBe('buyer');
  });

  it('ignores non-string values', () => {
    expect(resolveActiveRole(user, 42 as unknown as string)).toBe('buyer');
    expect(resolveActiveRole(user, { role: 'seller' } as unknown as string)).toBe('buyer');
  });
});
