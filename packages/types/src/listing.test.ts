import { describe, expect, it } from 'vitest';
import { DELIVERY_OPTIONS, isDeliveryOption, isPercentField, PERCENT_OPTIONS, suggestProductName } from './listing';

describe('PERCENT_OPTIONS', () => {
  it('runs 0.1–0.9 in tenths, then 1–100 whole', () => {
    expect(PERCENT_OPTIONS.slice(0, 9)).toEqual(['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9']);
    expect(PERCENT_OPTIONS[9]).toBe('1');
    expect(PERCENT_OPTIONS.at(-1)).toBe('100');
    expect(PERCENT_OPTIONS).toHaveLength(109);
  });
});

describe('isPercentField', () => {
  it('picks number fields measured in %, and nothing else', () => {
    expect(isPercentField({ key: 'moisture_pct', label: 'Moisture', type: 'number', unit: '%' })).toBe(true);
    expect(isPercentField({ key: 'caliber_mm', label: 'Caliber', type: 'number', unit: 'mm' })).toBe(false);
    expect(isPercentField({ key: 'form', label: 'Form', type: 'select', options: ['Raw'] })).toBe(false);
  });
});

describe('isDeliveryOption', () => {
  it('accepts the canonical ids and rejects legacy free text', () => {
    for (const o of DELIVERY_OPTIONS) expect(isDeliveryOption(o)).toBe(true);
    expect(isDeliveryOption('Ready')).toBe(false);
    expect(isDeliveryOption(null)).toBe(false);
  });
});

describe('suggestProductName', () => {
  it('composes leaf + variety + processing + size, in that order', () => {
    expect(
      suggestProductName('Almond', {
        variety: 'Nonpareil',
        processing: 'Roasted',
        count_per_oz: '20/22',
        // Not in the title whitelist — the specs table already shows it.
        moisture_pct: '5',
      }),
    ).toBe('Almond Nonpareil Roasted 20/22');
  });

  it('drops booleans, empties and words that repeat the leaf', () => {
    expect(suggestProductName('Almond', { variety: 'Almond', form: '', organic: true, grade: 'US Fancy' })).toBe(
      'Almond US Fancy',
    );
  });

  it('survives a missing subcategory or attributes', () => {
    expect(suggestProductName(null, null)).toBe('');
    expect(suggestProductName('Cashew', undefined)).toBe('Cashew');
  });
});
