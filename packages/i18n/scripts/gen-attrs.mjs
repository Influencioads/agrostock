#!/usr/bin/env node
/**
 * Extracts every human-readable string out of the product ATTRIBUTE_SCHEMA
 * (@agrotraders/types) into `locales/en/attrs.json`, so field labels and
 * select/multiselect option values can be translated like any other UI copy.
 *
 *   node scripts/gen-attrs.mjs
 *
 * The stored data keeps its canonical English values (filters match on them);
 * only the *display* goes through `t()`. Keys are slugs of the English text, so
 * the same label reused across subcategories translates once.
 *
 * Re-run this whenever the attribute schema is regenerated, then run
 * `translate.mjs` to fill the non-English catalogs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = join(ROOT, '..', 'types', 'src', 'attributes.ts');
const OUT = join(ROOT, 'locales', 'en', 'attrs.json');

/** Stable, readable key for an English string. Mirrors `attrKey()` in @agrotraders/types. */
export function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'x';
}

const src = readFileSync(SCHEMA, 'utf8');

// The schema file is generated JSON-in-TS, so a scan is enough (and avoids
// needing a TS loader here).
const labels = new Set();
for (const m of src.matchAll(/"label":\s*"((?:[^"\\]|\\.)*)"/g)) labels.add(JSON.parse(`"${m[1]}"`));

const options = new Set();
for (const m of src.matchAll(/"options":\s*\[([\s\S]*?)\]/g)) {
  for (const o of m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) options.add(JSON.parse(`"${o[1]}"`));
}

/**
 * Build a slug→text map.
 *
 * Different spellings of the same concept slug together on purpose
 * ("Powder (ground)" / "Powder/ground" → `powder_ground`): they mean the same
 * thing, so they share one translation and both render identically. The first
 * variant in sorted order wins, which keeps the output deterministic — and
 * lets the renderer resolve either spelling with a plain `slug(text)` lookup.
 */
function build(set, kind) {
  const out = {};
  let merged = 0;
  let skipped = 0;
  for (const text of [...set].sort()) {
    // Pure numbers/codes ("0", "9mm", "24/7") carry no language — the renderer
    // falls back to the source text, so there is nothing to translate.
    if (!/\p{L}{2,}/u.test(text)) {
      skipped++;
      continue;
    }
    const key = slug(text);
    if (key in out) {
      merged++;
      continue;
    }
    out[key] = text;
  }
  if (merged) console.log(`  ${kind}: ${merged} spelling variant(s) merged onto an existing key`);
  if (skipped) console.log(`  ${kind}: ${skipped} non-linguistic value(s) skipped (numbers/codes)`);
  return out;
}

const attrs = { label: build(labels, 'label'), option: build(options, 'option') };

writeFileSync(OUT, JSON.stringify(attrs, null, 2) + '\n', 'utf8');
console.log(
  `attrs.json: ${Object.keys(attrs.label).length} label(s), ${Object.keys(attrs.option).length} option(s)`,
);
