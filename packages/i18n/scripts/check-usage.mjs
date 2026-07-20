#!/usr/bin/env node
/**
 * Verifies that every translation key actually referenced by the app code
 * resolves in every locale — the real test of "does the UI change language".
 *
 *   node scripts/check-usage.mjs [web|admin|mobile]
 *
 * For each app it extracts literal `t('ns:key')` / `t('key')` references from
 * the source, resolves them against the locale catalogs (respecting the app's
 * default namespace and fallback), and reports:
 *   • MISSING  — key absent in EN → renders the raw key or a hardcoded default.
 *   • UNTRANSLATED — present in a non-EN locale but byte-identical to EN for a
 *     string that contains translatable words → will NOT change on switch.
 *
 * Dynamic keys built from template literals (t(`x.${v}`)) can't be resolved
 * statically; their static prefix is checked for existence of at least one
 * child instead, and they're listed under DYNAMIC for manual note.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(HERE, '..', 'locales');
const ROOT = join(HERE, '..', '..', '..');
const LOCALES = readdirSync(LOCALES_DIR).filter((d) => statSync(join(LOCALES_DIR, d)).isDirectory());

const APPS = {
  web: { src: 'apps/web/src', def: 'web', ns: ['web', 'common', 'nav', 'enums', 'errors', 'attrs'] },
  admin: { src: 'apps/admin/src', def: 'admin', ns: ['admin', 'common', 'nav', 'enums', 'errors'] },
  mobile: { src: 'apps/mobile/src', def: 'mobile', ns: ['mobile', 'common', 'nav', 'enums', 'errors', 'attrs'] },
};

function loadCatalog(locale, ns) {
  const p = join(LOCALES_DIR, locale, `${ns}.json`);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}
function lookup(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}
const PLURAL_SUFFIXES = ['_other', '_one', '_zero', '_two', '_few', '_many'];
/** Resolve a key, accepting i18next CLDR plural variants (`key_one`, `key_other`, …). */
function lookupPlural(obj, dotted) {
  const direct = lookup(obj, dotted);
  if (direct !== undefined) return direct;
  for (const suf of PLURAL_SUFFIXES) {
    const v = lookup(obj, dotted + suf);
    if (v !== undefined) return v;
  }
  return undefined;
}
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.expo', 'mock'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$|\.d\.ts$/.test(name)) yield p;
  }
}

const TRANSLATABLE = /[A-Za-z]{2}/;
function analyze(appName) {
  const app = APPS[appName];
  const dir = join(ROOT, app.src);
  const staticKeys = new Set();
  const dynamicPrefixes = new Set();
  const reKey = /\bt\(\s*'([^'\\]+)'/g;
  const reDyn = /\bt\(\s*`([^`$]*)\$\{/g;
  for (const file of walk(dir)) {
    const src = readFileSync(file, 'utf8');
    // A literal ending in '.' is the prefix of a concatenated dynamic key
    // (`t('ns.x.' + id)`), not a resolvable key — treat it as a dynamic prefix.
    for (const m of src.matchAll(reKey)) {
      if (m[1].endsWith('.')) dynamicPrefixes.add(m[1].replace(/\.$/, ''));
      else staticKeys.add(m[1]);
    }
    for (const m of src.matchAll(reDyn)) if (m[1]) dynamicPrefixes.add(m[1].replace(/\.$/, ''));
  }

  // Resolve a raw key to {ns, path}
  const resolve = (raw) => {
    if (raw.includes(':')) {
      const [ns, ...rest] = raw.split(':');
      return { ns, path: rest.join(':') };
    }
    return { ns: app.def, path: raw };
  };

  const enCat = Object.fromEntries(app.ns.map((ns) => [ns, loadCatalog('en', ns)]));
  const missing = [];
  const perLocaleUntranslated = Object.fromEntries(LOCALES.filter((l) => l !== 'en').map((l) => [l, []]));

  for (const raw of [...staticKeys].sort()) {
    const { ns, path } = resolve(raw);
    if (!app.ns.includes(ns)) continue; // key targets a namespace this app doesn't load; skip
    const enVal = lookupPlural(enCat[ns], path);
    if (typeof enVal !== 'string') {
      // could be a parent object (interpolation container) — only flag true leaves
      if (enVal === undefined) missing.push(raw);
      continue;
    }
    for (const loc of Object.keys(perLocaleUntranslated)) {
      const v = lookupPlural(loadCatalogCached(loc, ns), path);
      if (v === undefined) perLocaleUntranslated[loc].push(raw + ' (missing)');
      else if (v === enVal && TRANSLATABLE.test(enVal) && enVal.length > 2) {
        perLocaleUntranslated[loc].push(raw);
      }
    }
  }

  // dynamic prefixes: ensure the prefix resolves to an object in EN
  const dynDangling = [];
  for (const pre of [...dynamicPrefixes].sort()) {
    const { ns, path } = resolve(pre);
    if (!app.ns.includes(ns)) continue;
    const v = path ? lookup(enCat[ns], path) : enCat[ns];
    if (!v || typeof v !== 'object') dynDangling.push(pre);
  }

  return { appName, staticCount: staticKeys.size, dynCount: dynamicPrefixes.size, missing, perLocaleUntranslated, dynDangling };
}

const catCache = new Map();
function loadCatalogCached(locale, ns) {
  const k = locale + '/' + ns;
  if (!catCache.has(k)) catCache.set(k, loadCatalog(locale, ns));
  return catCache.get(k);
}

const only = process.argv[2];
const apps = only ? [only] : Object.keys(APPS);
let hardFail = 0;
for (const a of apps) {
  const r = analyze(a);
  console.log(`\n===== ${a} : ${r.staticCount} static keys, ${r.dynCount} dynamic prefixes =====`);
  if (r.missing.length) {
    hardFail += r.missing.length;
    console.log(`  MISSING in EN (${r.missing.length}) — these render raw/hardcoded:`);
    for (const k of r.missing) console.log(`    ✗ ${k}`);
  } else console.log('  ✓ all static keys exist in EN');
  if (r.dynDangling.length) {
    console.log(`  DYNAMIC prefixes with no EN parent (${r.dynDangling.length}):`);
    for (const k of r.dynDangling) console.log(`    ? ${k}`);
  }
  const totUn = Object.values(r.perLocaleUntranslated).reduce((s, a) => s + a.length, 0);
  console.log(`  Untranslated-vs-EN across ${Object.keys(r.perLocaleUntranslated).length} locales: ${totUn} (sample per locale):`);
  for (const [loc, list] of Object.entries(r.perLocaleUntranslated)) {
    if (list.length) console.log(`    ${loc}: ${list.length}  e.g. ${list.slice(0, 4).join(', ')}`);
  }
}
console.log(`\n${hardFail ? 'FAIL: ' + hardFail + ' keys missing in EN' : 'OK: every used key resolves in EN'}`);
process.exit(hardFail ? 1 : 0);
