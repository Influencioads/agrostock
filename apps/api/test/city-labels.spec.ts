import { describe, expect, it } from 'vitest';
import { cityLabel, withCountry } from '../src/geo/geo.module';

/**
 * The city picker asks Google for "<city>, <span translate=no><country></span>"
 * so an ordinary-word name (Reading, Orange, Bath) is read as a place instead of
 * being translated. These are the shapes Google actually answers with.
 */
describe('cityLabel', () => {
  const uk = withCountry('Reading', 'United Kingdom');

  it('wraps the country so it comes back untranslated', () => {
    expect(uk).toBe('Reading, <span translate="no">United Kingdom</span>');
  });

  it('drops the hint and the separator after it', () => {
    expect(cityLabel('Рединг, <span translate="no">United Kingdom</span>', 'Reading')).toBe('Рединг');
    expect(cityLabel('ريدينغ، <span translate="no">United Kingdom</span>', 'Reading')).toBe('ريدينغ');
  });

  it('drops the hint when the language puts the country first', () => {
    expect(cityLabel('<span translate="no">United Kingdom</span>雷丁', 'Reading')).toBe('雷丁');
  });

  it('decodes the entities html mode introduces', () => {
    expect(cityLabel('Кёр-д&#39;Ален, <span translate="no">United States</span>', "Coeur d'Alene")).toBe(
      "Кёр-д'Ален",
    );
  });

  it('falls back to English when the hint did not survive', () => {
    // Translation off: the source passes through and still carries the markup.
    expect(cityLabel(uk, 'Reading')).toBe('Reading');
    // Markup stripped by the translator (what 'text' format does) — the country
    // would be left translated in the label, so the English name is safer.
    expect(cityLabel('Рединг, Великобритания', 'Reading')).toBe('Reading');
  });
});
