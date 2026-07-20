#!/usr/bin/env node
/**
 * Fills the non-English catalogs from `locales/en`.
 *
 *   node scripts/translate.mjs --stub              # offline: copy English, mark every key for review
 *   node scripts/translate.mjs --locale ru --dry   # show what would change
 *   node scripts/translate.mjs --locale ar         # machine-translate the missing keys
 *   node scripts/translate.mjs --provider google   # force one provider for ALL locales
 *
 * Provider selection: each locale has a default provider (below). Override every
 * locale with `--provider <name>` or the `TRANSLATE_PROVIDER` env var — used when
 * only one provider key is available (e.g. a single Google Translate key for all 10).
 *
 * Rules that make this safe to re-run:
 *   • Only keys that are MISSING or listed in `<locale>/.meta.json.stale` are touched.
 *     A human-reviewed string is never overwritten.
 *   • Interpolation (`{{count}}`) and Trans tags (`<0>…</0>`) are swapped for sentinels
 *     before translation and restored after. A translation whose placeholder set does
 *     not match the source is REJECTED, not silently written.
 *   • Plural keys are expanded to the target's CLDR categories (ru: 4, ar: 6) and always
 *     marked stale — machine translation cannot infer grammatical plural agreement.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'locales');
const SOURCE = 'en';

/** Locales and the provider that actually supports them. DeepL has no Hindi. */
const PROVIDERS = {
  ru: 'deepl', 'zh-Hans': 'deepl', es: 'deepl', pt: 'deepl', fr: 'deepl', de: 'deepl', ja: 'deepl',
  ar: 'google', hi: 'google',
};

/** CLDR plural categories per locale — i18next appends these as `key_one`, `key_few`, … */
const PLURAL_CATEGORIES = {
  en: ['one', 'other'],
  ru: ['one', 'few', 'many', 'other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  hi: ['one', 'other'], es: ['one', 'many', 'other'], pt: ['one', 'many', 'other'],
  fr: ['one', 'many', 'other'], de: ['one', 'other'],
  'zh-Hans': ['other'], ja: ['other'],
};

/* ── placeholder protection ─────────────────────────────────────── */

/**
 * Terms that must survive translation verbatim: acronyms, currency/unit codes and
 * the brand. Left to itself the engine "helpfully" expands or misreads them —
 * CMS became "Chief Ministers" in Hindi, IP became "Intellectual Property" in
 * Arabic (it is an IP *address*), KYC became a six-character sentence in Chinese.
 * Masking them as placeholders means the engine never sees them at all.
 *
 * Matched case-sensitively on word boundaries, longest-first so `USD` inside a
 * longer term can never win over the term itself. Only add genuinely
 * language-neutral tokens here — a real word listed here would go untranslated.
 */
const DNT_TERMS = [
  'AgroTraders', 'ICUMSA', 'APEDA', 'RFQ', 'KYC', 'MOQ', 'CMS', 'OTP', 'PDF', 'CSV',
  'SKU', 'VAT', 'ETA', 'ISO', 'FCL', 'USD', 'EUR', 'GBP', 'AED', 'INR', 'CNY',
  'TRY', 'RUB', 'BRL', 'PKR', 'BDT', 'VND', 'MT', 'IP', 'ID',
].sort((a, b) => b.length - a.length);

const DNT_SOURCE = `\\b(?:${DNT_TERMS.join('|')})\\b`;

const PLACEHOLDER = new RegExp(`\\{\\{[^}]+\\}\\}|</?\\d+>|${DNT_SOURCE}`, 'g');

// A bare digit sentinel would collide with real numbers in the copy ("24/7",
// "118 countries"), so sentinels use characters no translator will emit.
const SENTINEL = /⟦(\d+)⟧/g;

function protect(text) {
  const found = text.match(PLACEHOLDER) ?? [];
  let i = 0;
  const masked = text.replace(PLACEHOLDER, () => '⟦' + i++ + '⟧');
  return { masked, found };
}

function restore(masked, found) {
  return masked.replace(SENTINEL, (_, i) => found[Number(i)] ?? '');
}

/** Same multiset of placeholders in, same multiset out — or we drop the translation. */
function placeholdersMatch(source, translated) {
  const a = (source.match(PLACEHOLDER) ?? []).slice().sort();
  const b = (translated.match(PLACEHOLDER) ?? []).slice().sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/* ── providers ──────────────────────────────────────────────────── */

async function deepl(texts, target) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error('DEEPL_API_KEY is not set');
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const res = await fetch(`https://${host}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texts, target_lang: target.split('-')[0].toUpperCase(), source_lang: 'EN' }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  return (await res.json()).translations.map((t) => t.text);
}

// Google Translate v2 caps a single request at 128 text segments, so batch.
const GOOGLE_MAX_Q = 100;

async function google(texts, target) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error('GOOGLE_TRANSLATE_API_KEY is not set');
  const out = [];
  for (let i = 0; i < texts.length; i += GOOGLE_MAX_Q) {
    const chunk = texts.slice(i, i + GOOGLE_MAX_Q);
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: chunk, source: 'en', target: target.split('-')[0], format: 'text' }),
    });
    if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
    out.push(...(await res.json()).data.translations.map((t) => t.translatedText));
  }
  return out;
}

/** `--stub` keeps the English text so the app renders while translators catch up. */
const stub = async (texts) => texts;

const IMPLEMENTATIONS = { deepl, google, stub };

/* ── flat key helpers ───────────────────────────────────────────── */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function flatten(node, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(node)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) flatten(v, key, out);
    else out[key] = v; // strings and string[] (returnObjects) are leaves
  }
  return out;
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    if (!isPlainObject(node[part])) node[part] = {};
    node = node[part];
  }
  node[parts.at(-1)] = value;
}

function getDeep(source, dottedKey) {
  return dottedKey.split('.').reduce((n, k) => (isPlainObject(n) || Array.isArray(n) ? n[k] : undefined), source);
}

/* ── plural expansion ───────────────────────────────────────────── */

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/**
 * English authors `key_one` / `key_other`. Every target category gets a copy of the
 * `_other` form, always marked stale so a human fixes the agreement.
 */
function expandPlurals(flatEn, locale) {
  const categories = PLURAL_CATEGORIES[locale] ?? ['one', 'other'];
  const expanded = {};
  const generated = new Set();

  for (const [key, value] of Object.entries(flatEn)) {
    const match = key.match(PLURAL_SUFFIX);
    if (!match) {
      expanded[key] = value;
      continue;
    }
    const base = key.slice(0, -match[0].length);
    for (const category of categories) {
      const target = `${base}_${category}`;
      if (target in expanded) continue;
      expanded[target] = flatEn[`${base}_other`] ?? value;
      generated.add(target);
    }
  }
  return { expanded, generated };
}

/* ── main ───────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

const dryRun = flag('dry');
const stubMode = flag('stub');
const only = value('locale');
const providerOverride = value('provider') ?? process.env.TRANSLATE_PROVIDER;

const namespaces = readdirSync(join(LOCALES_DIR, SOURCE))
  .filter((f) => f.endsWith('.json') && f !== 'db-labels.json')
  .map((f) => f.replace(/\.json$/, ''));

const targets = (only ? [only] : Object.keys(PROVIDERS)).filter((l) => l !== SOURCE);

let rejected = 0;
let translated = 0;

for (const locale of targets) {
  const dir = join(LOCALES_DIR, locale);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const metaPath = join(dir, '.meta.json');
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : { stale: [] };
  const stale = new Set(meta.stale ?? []);
  const nextStale = new Set();

  const provider = stubMode ? 'stub' : (providerOverride ?? PROVIDERS[locale] ?? 'deepl');
  const translate = IMPLEMENTATIONS[provider];
  if (!translate) throw new Error(`Unknown provider "${provider}" (expected deepl | google | stub)`);

  for (const ns of namespaces) {
    const en = JSON.parse(readFileSync(join(LOCALES_DIR, SOURCE, `${ns}.json`), 'utf8'));
    const outPath = join(dir, `${ns}.json`);
    const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};

    const { expanded, generated } = expandPlurals(flatten(en), locale);

    // Only missing keys and keys a previous run flagged for review.
    const todo = Object.keys(expanded).filter(
      (key) => getDeep(existing, key) === undefined || stale.has(`${ns}.${key}`),
    );

    const result = structuredClone(existing);

    // Arrays (nav.primary, web.ribbon) translate element-wise.
    const strings = [];
    const slots = [];
    for (const key of todo) {
      const source = expanded[key];
      if (Array.isArray(source)) {
        source.forEach((s, i) => { strings.push(s); slots.push({ key, index: i }); });
      } else {
        strings.push(source);
        slots.push({ key, index: null });
      }
    }

    if (strings.length) {
      const masked = strings.map(protect);
      const out = await translate(masked.map((m) => m.masked), locale);

      for (let i = 0; i < slots.length; i++) {
        const source = strings[i];
        const candidate = restore(out[i], masked[i].found);

        if (!placeholdersMatch(source, candidate)) {
          console.warn(`  ✗ ${locale}/${ns} ${slots[i].key}: placeholder mismatch, keeping source`);
          rejected++;
          continue;
        }

        const { key, index } = slots[i];
        if (index === null) setDeep(result, key, candidate);
        else {
          const arr = getDeep(result, key) ?? [];
          arr[index] = candidate;
          setDeep(result, key, arr);
        }
        translated++;

        // Stubs and generated plural forms always need a human pass.
        if (stubMode || generated.has(key)) nextStale.add(`${ns}.${key}`);
      }
    }

    if (!dryRun) writeFileSync(outPath, JSON.stringify(sortDeep(result), null, 2) + '\n', 'utf8');
    if (strings.length) console.log(`  ${locale}/${ns}: ${strings.length} string(s) via ${provider}`);
  }

  meta.stale = [...nextStale].sort();
  meta.updatedAt = new Date().toISOString();
  meta.provider = provider;
  if (!dryRun) writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  console.log(`${locale}: ${nextStale.size} key(s) need human review`);
}

console.log(`\n${translated} translated, ${rejected} rejected (placeholder mismatch)`);
if (rejected) process.exitCode = 1;

/** Stable key order keeps diffs readable. */
function sortDeep(node) {
  if (Array.isArray(node)) return node;
  if (!isPlainObject(node)) return node;
  return Object.fromEntries(Object.keys(node).sort().map((k) => [k, sortDeep(node[k])]));
}
