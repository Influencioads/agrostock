import { describe, expect, it } from 'vitest';
import { validateSignupPassword } from '@agrotraders/api-client';

describe('signup password validation', () => {
  it('rejects short passwords before comparing confirmation', () => {
    expect(validateSignupPassword('short', 'different')).toBe('too_short');
  });

  it('rejects passwords when confirmation does not match', () => {
    expect(validateSignupPassword('password123', 'password124')).toBe('mismatch');
  });

  it('accepts matching passwords with at least 8 characters', () => {
    expect(validateSignupPassword('password123', 'password123')).toBe('ok');
  });
});
