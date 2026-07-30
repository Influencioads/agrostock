/**
 * Self-check for locale auto-detection. Run: `npx tsx src/detect.test.ts`.
 * No framework on purpose — the logic is one function and a lookup table.
 */
import assert from 'node:assert/strict';
import { detectLang, langForCountry } from './index';

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

console.log('locale detection: ok');
