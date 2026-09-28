import { describe, expect, it } from 'vitest';
import { productQueryFromParams } from './marketQuery';

const q = (qs: string, rate?: number) => productQueryFromParams(new URLSearchParams(qs), rate);

describe('productQueryFromParams', () => {
  it('keeps an attribute option with a comma inside its parentheses as ONE value', () => {
    expect(q('subcategoryId=s1&attr_type=Mature (brown, husked),Green').attrs).toEqual({
      type: ['Mature (brown, husked)', 'Green'],
    });
  });

  it('reads prices in the display currency and sends USD cents', () => {
    // 9 000 ₽ at 90 ₽/$ is $100.
    expect(q('minPrice=9000&maxPrice=18 000', 90)).toMatchObject({ minPrice: 10000, maxPrice: 20000 });
    // A Russian keyboard types the decimal as a comma.
    expect(q('minPrice=1,5').minPrice).toBe(150);
  });

  it('reads an English thousands comma as grouping, not a decimal point', () => {
    expect(q('minPrice=1,000').minPrice).toBe(100000);
    expect(q('minPrice=25,000').minPrice).toBe(2500000);
    expect(q('minPrice=1,500.50').minPrice).toBe(150050);
  });

  it('drops a junk price instead of sending NaN', () => {
    const query = q('minPrice=abc&maxPrice=-5');
    expect(query.minPrice).toBeUndefined();
    expect(query.maxPrice).toBeUndefined();
  });

  it('sends a taxonomy name only when the link carries no id', () => {
    expect(q('categoryId=c1&category=Орехи')).toMatchObject({ categoryId: ['c1'], category: undefined });
    expect(q('category=Nuts')).toMatchObject({ categoryId: undefined, category: ['Nuts'] });
    expect(q('subcategoryId=s1&subcategory=Миндаль').subcategory).toBeUndefined();
  });

  it('turns the two-sided groups into tri-state booleans', () => {
    expect(q('deal=safe').safe).toBe(true);
    expect(q('deal=direct').safe).toBe(false);
    expect(q('deal=safe,direct').safe).toBeUndefined();
    expect(q('listing=offer,auction')).toMatchObject({ offer: true, auction: true });
  });

  it('treats relevance as the default sort', () => {
    expect(q('sort=relevance').sort).toBeUndefined();
    expect(q('sort=price_asc').sort).toBe('price_asc');
  });
});
