#!/usr/bin/env node
/**
 * Guards against hardcoded user-facing English creeping back into the UI.
 *
 *   node scripts/check-hardcoded.mjs            # scan, print findings, exit 1 if any
 *   node scripts/check-hardcoded.mjs --update   # rewrite the allowlist with current findings
 *
 * Heuristic scan of JSX text, user-facing attributes (placeholder/title/…),
 * label-ish object literals, rendered ternary strings and Alert/toast calls.
 * Anything that looks like display copy must go through i18next `t()` instead.
 *
 * Known-acceptable literals (vehicle-plate examples, person names, font specs)
 * live in `check-hardcoded.allow.json`; entries are `file|text`. When a finding
 * is a false positive, add it there (or run with --update after reviewing).
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const ALLOW_FILE = join(HERE, 'check-hardcoded.allow.json');

const TARGETS = ['apps/web/src', 'apps/mobile/src', 'apps/admin/src', 'packages/ui/src'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.expo', 'mock']);
const SKIP_FILES = /\.(test|spec)\.tsx?$|\.d\.ts$/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(name) && !SKIP_FILES.test(name)) yield p;
  }
}

const TECH = new Set([
  'OK', 'ID', 'URL', 'API', 'GST', 'PIN', 'KYC', 'UPI', 'INR', 'USD', 'CSV', 'PDF', 'OTP',
  'AgroTraders', 'Agrotraders', 'WhatsApp', 'Google',
]);

function isWordy(s) {
  const txt = s.trim();
  if (!txt) return false;
  if (/^[\d\s\W]*$/.test(txt)) return false;
  if (TECH.has(txt)) return false;
  if (/^[a-z0-9_.:/\\-]+$/.test(txt)) return false; // identifier / url / key
  if (/^[A-Z0-9_]+$/.test(txt)) return false; // CONSTANT
  if (!/[A-Za-z]{2}/.test(txt)) return false;
  if (/^[a-z]+$/.test(txt) && !txt.includes(' ')) return false; // enum-ish value
  return true;
}

const JSX_TEXT = />[ \t]*([^<>{}\r\n][^<>{}\r\n]*?)[ \t]*</g;
const CODEISH = /(;|=>|\breturn\b|\bconst\b|\buseState\b|\?\?|\bas\b [A-Z]|===|Promise|React\.)/;
const ATTRS = /(?:placeholder|title|label|alt|aria-label|accessibilityLabel|headerTitle|tabBarLabel|buttonText|emptyText|confirmText|cancelText|helperText)\s*=\s*"([^"]+)"/g;
const OBJ_KEYS = /\b(?:label|title|text|desc|description|subtitle|placeholder|hint|empty|message|caption|cta|blurb|tagline)\s*:\s*'((?:[^'\\]|\\.)+)'/g;
const ALERT = /Alert\.alert\(\s*'((?:[^'\\]|\\.)+)'(?:\s*,\s*'((?:[^'\\]|\\.)+)')?/g;
const TERNARY = /(?:\?|:|\?\?|\|\|)\s*'((?:[^'\\]|\\.)+)'/g;
const CALLS = /\b(?:toast|showToast|setError|setMsg|setMessage|setBanner)\s*\(\s*'((?:[^'\\]|\\.)+)'/g;
const CLASSISH = /(?:^|\s)(?:bg|text|border|hover|focus|rounded|flex|grid|items|justify|font|shadow|opacity|pointer-events|px|py|mt|mb|ml|mr|gap|w|h)[-:]/;
// SVG path data / colors / css sizes
const SVGISH = /^(?:M[\d.\s]|#[0-9a-fA-F]{3}|\d+px )/;

function scanFile(src) {
  const found = [];
  const push = (idx, text) => {
    const t = text.trim();
    if (isWordy(t) && !CODEISH.test(t) && !CLASSISH.test(t) && !SVGISH.test(t)) {
      found.push({ line: src.slice(0, idx).split('\n').length, text: t });
    }
  };
  for (const m of src.matchAll(JSX_TEXT)) push(m.index, m[1]);
  for (const m of src.matchAll(ATTRS)) push(m.index, m[1]);
  for (const m of src.matchAll(OBJ_KEYS)) push(m.index, m[1]);
  for (const m of src.matchAll(ALERT)) {
    push(m.index, m[1]);
    if (m[2]) push(m.index, m[2]);
  }
  for (const m of src.matchAll(CALLS)) push(m.index, m[1]);
  for (const m of src.matchAll(TERNARY)) {
    const t = m[1];
    if (/\s/.test(t) || /^[A-Z]/.test(t)) push(m.index, t);
  }
  return found;
}

const update = process.argv.includes('--update');
const allow = existsSync(ALLOW_FILE) ? new Set(JSON.parse(readFileSync(ALLOW_FILE, 'utf8'))) : new Set();

const findings = [];
for (const target of TARGETS) {
  const dir = join(ROOT, target);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const rel = relative(ROOT, file).replaceAll('\\', '/');
    for (const f of scanFile(readFileSync(file, 'utf8'))) {
      const id = `${rel}|${f.text}`;
      if (!allow.has(id)) findings.push({ ...f, rel, id });
    }
  }
}

if (update) {
  const next = [...allow, ...findings.map((f) => f.id)].sort();
  writeFileSync(ALLOW_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(`Allowlist updated: ${next.length} entries (${findings.length} added).`);
  process.exit(0);
}

if (findings.length) {
  console.error(`Found ${findings.length} hardcoded user-facing string(s) not going through t():\n`);
  for (const f of findings) console.error(`  ${f.rel}:${f.line}  ${JSON.stringify(f.text)}`);
  console.error(
    '\nWrap them in t() with a key in packages/i18n/locales/en/, or — for genuine',
    'non-copy literals (codes, person names) — add the "file|text" entry to',
    'packages/i18n/scripts/check-hardcoded.allow.json.',
  );
  process.exit(1);
}
console.log('No hardcoded user-facing strings found.');
