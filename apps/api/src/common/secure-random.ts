import { randomBytes, randomInt } from 'node:crypto';

/**
 * Phase 2 containment (F36): dispatch/delivery OTPs come from a CSPRNG with a
 * six-digit space instead of `Math.random`'s guessable four digits. Hashing at
 * rest, expiry, and attempt metering follow with the session-schema migration.
 */
export function secureOtp(digits = 6): string {
  return String(randomInt(0, 10 ** digits)).padStart(digits, '0');
}

/** Unambiguous base-31 alphabet (no 0/O/1/I/L look-alikes). */
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Collision-resistant human-readable reference (F11 hardening), e.g.
 * `AG-7F3K9Q2M4T`. Ten base-31 characters ≈ 2^49 values, versus the 9 000
 * possible values of the previous four-digit scheme.
 */
export function secureReference(prefix: string): string {
  const bytes = randomBytes(10);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  return `${prefix}-${out}`;
}
