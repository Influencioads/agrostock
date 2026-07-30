import { describe, expect, it } from 'vitest';
import type { SubcategoryNode } from '@agrotraders/api-client';
import { buyerBidTitle, buyerBidsLoadState, levelOptions } from './BuyerBids';

const node = (id: string, children: SubcategoryNode[] = []): SubcategoryNode =>
  ({ id, name: id, slug: id, children }) as SubcategoryNode;

/** The requirement form renders one <select> per returned level. */
describe('levelOptions', () => {
  const tree = [node('rice', [node('basmati', [node('1121')])]), node('wheat')];

  it('offers only the roots until something is picked', () => {
    expect(levelOptions(tree, []).map((l) => l.map((n) => n.id))).toEqual([['rice', 'wheat']]);
  });

  it('opens the next level for each pick, and stops at a leaf', () => {
    expect(levelOptions(tree, ['rice']).map((l) => l.map((n) => n.id))).toEqual([['rice', 'wheat'], ['basmati']]);
    expect(levelOptions(tree, ['rice', 'basmati', '1121']).length).toBe(3);
  });

  it('ignores a path that no longer matches the tree', () => {
    expect(levelOptions(tree, ['gone']).length).toBe(1);
    expect(levelOptions([], ['rice'])).toEqual([]);
  });
});

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
