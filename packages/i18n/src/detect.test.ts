/**
 * Self-check for locale auto-detection. Run: `npx tsx src/detect.test.ts`.
 * No framework on purpose — the logic is one function and a lookup table.
 */
import assert from 'node:assert/strict';
import { detectLang, langForCountry } from './index';

// Language preference wins, wherever the device is.
assert.equal(detectLang(['ru-RU'], 'RU'), 'ru');
assert.equal(detectLang(['ru'], 'DE'), 'ru', 'a Russian speaker in Germany still gets Russian');
assert.equal(detectLang(['pt-BR', 'en-US'], 'BR'), 'pt');

// Chinese has no bare `zh` locale; the region resolves it.
assert.equal(detectLang(['zh-Hans-CN'], 'CN'), 'zh-Hans');
assert.equal(detectLang(['zh-TW'], 'TW'), 'zh-Hans');

// Unsupported language → fall back to where they are, not straight to English.
assert.equal(detectLang(['uz-UZ'], 'UZ'), 'ru');
assert.equal(detectLang(['ur-PK'], 'PK'), 'en', 'we publish nothing for Pakistan');
assert.equal(detectLang(['en-US'], 'RU'), 'en', 'an explicit English device stays English');

// Region-only signals (the time zone path on web, regionCode on mobile).
assert.equal(detectLang(['sw'], 'SA'), 'ar');
assert.equal(detectLang([], 'JP'), 'ja');
assert.equal(detectLang([]), 'en');

// The table itself.
assert.equal(langForCountry('ir'), 'fa', 'case-insensitive');
assert.equal(langForCountry('ZZ'), 'en');
assert.equal(langForCountry(null), 'en');
assert.equal(langForCountry(''), 'en');

console.log('locale detection: ok');
