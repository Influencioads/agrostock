import { beforeEach, describe, expect, it } from 'vitest';
import { decryptJson, decryptSecret, encryptJson, encryptSecret, isMasked, maskSecret, safeEqual } from '../src/common/crypto';

describe('payment credential crypto', () => {
  beforeEach(() => {
    process.env.PAYMENTS_SECRET_KEY = 'test-payments-key-that-is-long-and-unique-0001';
  });

  it('round-trips a secret', () => {
    const secret = 'live_secret_key_ABCDEF1234567890';
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it('produces a different blob every time (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('round-trips a credential map', () => {
    const creds = { shopId: '123456', secretKey: 'test_abcdef' };
    expect(decryptJson(encryptJson(creds))).toEqual(creds);
    expect(decryptJson(null)).toEqual({});
  });

  it('rejects a tampered blob rather than returning garbage', () => {
    const blob = encryptSecret('do-not-tamper');
    const [v, iv, tag, ct] = blob.split(':');
    const flipped = Buffer.from(ct, 'base64');
    flipped[0] ^= 0xff;
    expect(() => decryptSecret([v, iv, tag, flipped.toString('base64')].join(':'))).toThrow();
    expect(() => decryptSecret('not-a-blob')).toThrow();
  });

  it('cannot be decrypted with a different key', () => {
    const blob = encryptSecret('secret');
    process.env.PAYMENTS_SECRET_KEY = 'a-completely-different-key-000000000000000';
    expect(() => decryptSecret(blob)).toThrow();
  });

  it('masks to something recognisable but unusable', () => {
    expect(maskSecret('live_secret_key_ABCDEF1234')).toBe('••••1234');
    expect(maskSecret('short')).toBe('••••••••');
    expect(maskSecret(null)).toBeNull();
    expect(isMasked(maskSecret('live_secret_key_ABCDEF1234')!)).toBe(true);
    expect(isMasked('real-value')).toBe(false);
  });

  it('compares signatures case-insensitively and without length leaks', () => {
    expect(safeEqual('AB12cd', 'ab12CD')).toBe(true);
    expect(safeEqual('ab12cd', 'ab12ce')).toBe(false);
    expect(safeEqual('ab', 'abc')).toBe(false);
  });
});
