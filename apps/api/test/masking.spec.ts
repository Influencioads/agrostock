import { describe, expect, it } from 'vitest';
import { FLAGS, flagFor, maskName, stableHash } from '../src/common/masking';

describe('maskName', () => {
  it('keeps first and last initials', () => {
    expect(maskName('Rahul Kapoor')).toBe('R••• K.');
  });

  it('masks a single-word name to just its initial', () => {
    expect(maskName('Rahul')).toBe('R•••');
  });

  it('falls back to "Bidder" for empty or whitespace names', () => {
    expect(maskName('')).toBe('Bidder');
    expect(maskName('   ')).toBe('Bidder');
    expect(maskName(null)).toBe('Bidder');
    expect(maskName(undefined)).toBe('Bidder');
  });

  it('uses only the first and last of three-plus words', () => {
    expect(maskName('Ana Maria Santos')).toBe('A••• S.');
  });
});

describe('flagFor', () => {
  it('is deterministic for a given id', () => {
    expect(flagFor('seller-123')).toBe(flagFor('seller-123'));
  });

  it('always returns a flag from the pool', () => {
    for (const id of ['a', 'seller-1', 'clxyz', 'another-id']) {
      expect(FLAGS).toContain(flagFor(id));
    }
  });
});

describe('stableHash', () => {
  it('is a non-negative 32-bit integer', () => {
    const h = stableHash('anything');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});
