import { describe, expect, it } from 'vitest';
import { SIGNUP_ROLES } from './signupRoles';

describe('mobile signup roles', () => {
  it('shows every public self-registration role without horizontal hiding', () => {
    expect(SIGNUP_ROLES.map((r) => r.id)).toEqual([
      'buyer',
      'seller',
      'transporter',
      'loaderco',
      'worker',
    ]);
  });
});
