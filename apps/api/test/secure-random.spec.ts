import { describe, expect, it } from 'vitest';
import { secureOtp, secureReference } from '../src/common/secure-random';

describe('secure random primitives (F36 / F11 hardening)', () => {
  it('produces six-digit zero-padded OTPs', () => {
    for (let i = 0; i < 200; i++) {
      expect(secureOtp()).toMatch(/^\d{6}$/);
    }
  });

  it('covers the full six-digit space including low values', () => {
    // Statistical smoke check: with 5 000 draws the first digit should vary.
    const firstDigits = new Set(Array.from({ length: 5000 }, () => secureOtp()[0]));
    expect(firstDigits.size).toBeGreaterThan(5);
  });

  it('produces prefixed references without ambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(secureReference('AG')).toMatch(/^AG-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/);
    }
  });

  it('does not collide across a large sample', () => {
    const sample = new Set(Array.from({ length: 10000 }, () => secureReference('AG')));
    expect(sample.size).toBe(10000);
  });
});
