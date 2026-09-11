/**
 * Self-check for locale auto-detection.
 *
 * The assertions below are the original framework-free ones, unchanged — but the
 * file was only ever runnable by hand (`npx tsx src/detect.test.ts`), and nothing
 * ran it, so none of them had executed since they were written. The package had no
 * `test` script either. Wrapping them in one `it()` costs nothing and puts them in
 * `pnpm test` and CI, which is the only place a self-check earns its keep.
 */
import assert from 'node:assert/strict';
import { it } from 'vitest';
import { detectLang, langForCountry } from './index';

it('resolves a locale from language preference, then region', () => {

  // Language preference wins, wherever the device is.
  assert.equal(detectLang(['ru-RU'], 'RU'), 'ru');
  assert.equal(detectLang(['ru'], 'DE'), 'ru', 'a Russian speaker in Germany still gets Russian');

  // Unsupported language → fall back to where they are, not straight to English.
  assert.equal(detectLang(['uz-UZ'], 'UZ'), 'ru');
  assert.equal(detectLang(['ur-PK'], 'PK'), 'en', 'we publish nothing for Pakistan');
  assert.equal(detectLang(['en-US'], 'RU'), 'en', 'an explicit English device stays English');

  // Locales we no longer publish resolve to English, not to themselves.
  assert.equal(detectLang(['pt-BR', 'en-US'], 'BR'), 'en');
  assert.equal(detectLang(['zh-Hans-CN'], 'CN'), 'en');
  assert.equal(detectLang(['ja'], 'JP'), 'en');

  // Region-only signals (the time zone path on web, regionCode on mobile).
  assert.equal(detectLang([], 'KZ'), 'ru');
  assert.equal(detectLang([], 'JP'), 'en');
  assert.equal(detectLang([]), 'en');

  // The table itself.
  assert.equal(langForCountry('by'), 'ru', 'case-insensitive');
  assert.equal(langForCountry('IR'), 'en', 'Persian is no longer published');
  assert.equal(langForCountry('ZZ'), 'en');
  assert.equal(langForCountry(null), 'en');
  assert.equal(langForCountry(''), 'en');

});
