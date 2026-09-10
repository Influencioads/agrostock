import { describe, expect, it } from 'vitest';
import type { ApiProduct } from '@agrotraders/api-client';
import { cardBadges } from './cardBadges';

const base = { isAuction: false, verified: false, stockQty: null, unit: 'MT' } as unknown as ApiProduct;

describe('cardBadges', () => {
  it('discloses a paid placement first and caps the strip at two', () => {
    const keys = cardBadges({ ...base, isAuction: true, verified: true }, true).map((b) => b.key);
    expect(keys).toEqual(['sponsored', 'auction']);
  });

  it('shows sold-out state ahead of trust marks', () => {
    expect(cardBadges({ ...base, stockQty: 0, verified: true }).map((b) => b.key)).toEqual(['outOfStock', 'verified']);
  });

  it('shows nothing for a plain listing', () => {
    expect(cardBadges(base)).toEqual([]);
  });
});
