import { describe, expect, it } from 'vitest';
import { buyerBidTitle, buyerBidsLoadState } from './BuyerBids';

// `levelOptions` and its tests went with the "more specific" drill-down levels:
// a requirement stops at the subcategory, whose spec fields ask for the rest.

/** Buyers no longer type a title — a half-filled form must still read sanely. */
describe('buyerBidTitle', () => {
  it('joins the taxonomy path, the city and who it is for', () => {
    expect(buyerBidTitle(['Nuts', 'Almond', 'Carmel in-shell'], 'Dubai', 'for Rajesh K.')).toBe(
      'Nuts › Almond › Carmel in-shell · Dubai · for Rajesh K.',
    );
  });

  it('drops the parts that are missing or blank instead of leaving separators', () => {
    expect(buyerBidTitle(['Nuts'], '  ', 'for Rajesh K.')).toBe('Nuts · for Rajesh K.');
    expect(buyerBidTitle([], 'Dubai')).toBe('Dubai');
    expect(buyerBidTitle([])).toBe('');
  });
});

describe('buyerBidsLoadState', () => {
  it('shows an error instead of staying on the loading view when the owner list fails', () => {
    expect(buyerBidsLoadState({ isPending: true, isError: false })).toBe('loading');
    expect(buyerBidsLoadState({ isPending: false, isError: true })).toBe('error');
    expect(buyerBidsLoadState({ isPending: false, isError: false })).toBe('ready');
  });
});
