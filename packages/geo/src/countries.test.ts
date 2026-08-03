import { describe, expect, it } from 'vitest';
import { countryFlag, findCountry } from './countries';

describe('findCountry', () => {
  it('resolves a plain stored name, whatever the case', () => {
    expect(findCountry('India')?.iso2).toBe('IN');
    expect(findCountry('  india ')?.iso2).toBe('IN');
  });

  it('resolves the legacy flag-prefixed form most user rows carry', () => {
    expect(findCountry('🇮🇳 India')?.iso2).toBe('IN');
    expect(countryFlag('🇮🇳 India')).toBe('🇮🇳');
  });

  it('still matches a name whose own punctuation must survive', () => {
    expect(findCountry('Bonaire, Sint Eustatius and Saba')?.iso2).toBe('BQ');
  });

  it('returns undefined for something that is not a country', () => {
    expect(findCountry('🌍')).toBeUndefined();
    expect(findCountry('')).toBeUndefined();
  });
});
