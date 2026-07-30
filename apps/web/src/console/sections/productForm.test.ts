import { describe, expect, it } from 'vitest';
import { blankProduct, productFormErrors, productFormReady, productToForm } from '@agrotraders/ui/ProductForm';

/** The seller sees these as red fields, so what lands in the list matters. */
describe('productFormErrors', () => {
  it('flags every missing required field on an empty form', () => {
    expect(productFormErrors(blankProduct).sort()).toEqual(['categoryId', 'images', 'name', 'price']);
  });

  it('flags a zero or non-numeric price, not just a blank one', () => {
    const base = { ...blankProduct, name: 'Basmati', categoryId: 'c1', images: ['a.webp'] };
    expect(productFormErrors({ ...base, price: '0' })).toEqual(['price']);
    expect(productFormErrors({ ...base, price: 'ask' })).toEqual(['price']);
    expect(productFormReady({ ...base, price: '840' })).toBe(true);
  });
});

describe('productToForm delivery', () => {
  // Only two answers exist now; legacy rows have to land on one of them.
  it('collapses retired and free-text delivery values onto the two options', () => {
    expect(productToForm({ delivery: 'no_delivery' }).delivery).toBe('self_pickup');
    expect(productToForm({ delivery: 'self_pickup' }).delivery).toBe('self_pickup');
    expect(productToForm({ delivery: 'Ready' }).delivery).toBe('delivery');
    expect(productToForm({}).delivery).toBe('delivery');
  });
});

/**
 * `GET /products/mine` is localized so the seller's list reads in their own
 * language, and ships the canonical English under `source`. If the form ever
 * prefers the display copy, the next Save overwrites the source row with the
 * translation and poisons that listing's translations for good — so this is the
 * one behaviour that must not regress silently.
 */
/**
 * The starting bid is typed in the seller's own currency; `startBidCents` is the
 * USD baseline the API derives from it. Editing must show the seller their own
 * number back, or a ₽80,000 opener reopens the form as "1019".
 */
describe('productToForm starting bid', () => {
  it('prefers the seller-currency amount over the USD baseline', () => {
    expect(productToForm({ startBidSrcCents: 8_000_000, startBidCents: 101_911 }).startBid).toBe('80000');
  });

  it('falls back to the baseline for rows saved before the split', () => {
    expect(productToForm({ startBidCents: 90_000 }).startBid).toBe('900');
    expect(productToForm({}).startBid).toBe('');
  });
});

describe('productToForm canonical source', () => {
  const localized = {
    name: 'Миндаль Нонпарель',
    qty: '25000 кг',
    moq: '1000 кг',
    origin: 'Соединенные Штаты',
    delivery: 'self_pickup',
    attributes: { grade: 'Высший' },
    source: {
      name: 'Almond Nonpareil',
      qty: '25000 KG',
      moq: '1000 KG',
      origin: 'United States',
      delivery: 'delivery',
      attributes: { grade: 'Premium' },
    },
  };

  it('edits the English original, never the translated display copy', () => {
    const form = productToForm(localized);
    expect(form.name).toBe('Almond Nonpareil');
    expect(form.origin).toBe('United States');
    expect(form.attributes).toEqual({ grade: 'Premium' });
    // qty/moq are stripped to bare numbers, so the unit can't prove the source
    // won — delivery can: the two differ, and English must be the one kept.
    expect(form.delivery).toBe('delivery');
  });

  it('falls back to the row itself when there is no source (admin rows, EN)', () => {
    expect(productToForm({ name: 'Almond Nonpareil', origin: 'United States' }).name).toBe('Almond Nonpareil');
    expect(productToForm({ name: 'x', source: null }).name).toBe('x');
  });
});
