/**
 * Seeds `Subcategory.attrFields` from the legacy generated attribute schema —
 * the one-time move that makes product attribute fields admin-editable.
 *
 * Idempotent: it writes the same array every run, so it is safe to re-run after
 * a taxonomy sync that recreated a subcategory row.
 *
 * The legacy schema is keyed by (Category.name, LEVEL-2 Subcategory.name), which
 * is why the lookup pins `parentId: null` — the same level-2 identity rule
 * `taxonomy-sync.ts` uses. Anything that does not match is reported, never
 * guessed at: a silent miss would drop a subcategory's whole field set.
 *
 * Prereqs: DB up, columns pushed (`prisma db push` / `migrate deploy`).
 * Run:  pnpm --filter @agrotraders/api seed:attrs
 */
import { deepStrictEqual } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { type AttrField } from '@agrotraders/types';
import { LOCALES } from '@agrotraders/i18n';

/** One category's level-2 entries, as stored in `attribute-seed.json`. */
interface SeedCategory {
  name: string;
  subcategories: { name: string; fields: AttrField[] }[];
}

/**
 * The legacy generated schema, kept as data rather than code: it is read once by
 * this script and must never reach a client bundle again.
 */
const ATTRIBUTE_SCHEMA: SeedCategory[] = JSON.parse(
  readFileSync(join(__dirname, 'attribute-seed.json'), 'utf8'),
) as SeedCategory[];

/**
 * The retired `attrs` i18n catalogs, kept here as migration INPUT only — they
 * are no longer a shipped namespace. Safe to delete once every environment has
 * run this script; until then they are the only record of those translations.
 */
const ATTRS_DIR = join(__dirname, 'attrs');

/**
 * The catalogs' key function, inlined from the deleted `@agrotraders/i18n`
 * `attrKey`. It exists only to read them, so it retires with them.
 */
function attrKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'x';
}

const prisma = new PrismaClient();

/**
 * Punctuation- and case-insensitive key for matching a schema name to a taxonomy
 * name. The two drifted apart at least once — the schema says "Tea coffee &
 * cocoa" where the taxonomy says "Tea, coffee & cocoa", which under the old
 * exact-name lookup meant that subcategory's fields never rendered at all. Names
 * are distinct within a category, so loosening the comparison this far is safe.
 */
const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** All level-2 rows of one category, indexed by both exact and loose name. */
async function level2Index(categoryId: string) {
  const rows = await prisma.subcategory.findMany({
    where: { categoryId, parentId: null },
    select: { id: true, name: true },
  });
  return {
    exact: new Map(rows.map((r) => [r.name, r.id])),
    loose: new Map(rows.map((r) => [loose(r.name), r.id])),
  };
}

/** (category name, level-2 subcategory name) → the fields that belong to it. */
async function seedFields() {
  const missing: string[] = [];
  const fuzzy: string[] = [];
  let written = 0;
  let empty = 0;

  for (const cat of ATTRIBUTE_SCHEMA) {
    const category = await prisma.category.findUnique({ where: { name: cat.name }, select: { id: true } });
    if (!category) {
      missing.push(`category "${cat.name}"`);
      continue;
    }
    const index = await level2Index(category.id);
    for (const sub of cat.subcategories) {
      if (!sub.fields.length) {
        empty++;
        continue;
      }
      let id = index.exact.get(sub.name);
      if (!id) {
        id = index.loose.get(loose(sub.name));
        if (id) fuzzy.push(`${cat.name} › ${sub.name}`);
      }
      if (!id) {
        missing.push(`${cat.name} › ${sub.name}`);
        continue;
      }
      const row = { id };
      await prisma.subcategory.update({
        where: { id: row.id },
        data: { attrFields: sub.fields as unknown as Prisma.InputJsonValue },
      });
      written++;
    }
  }
  return { written, empty, missing, fuzzy };
}

/**
 * Re-reads every seeded node and asserts the stored array is byte-identical to
 * the source. This is the whole safety net for the migration — if the level-2
 * lookup silently matched the wrong row, or Prisma mangled the JSON, this is
 * where it surfaces rather than three weeks later as an empty product form.
 */
async function verifyFields() {
  let checked = 0;
  for (const cat of ATTRIBUTE_SCHEMA) {
    const category = await prisma.category.findUnique({ where: { name: cat.name }, select: { id: true } });
    if (!category) continue;
    const index = await level2Index(category.id);
    for (const sub of cat.subcategories) {
      if (!sub.fields.length) continue;
      const id = index.exact.get(sub.name) ?? index.loose.get(loose(sub.name));
      if (!id) continue;
      const row: { attrFields: unknown } | null = await prisma.subcategory.findUnique({
        where: { id },
        select: { attrFields: true },
      });
      if (!row) continue;
      deepStrictEqual(
        row.attrFields as AttrField[],
        JSON.parse(JSON.stringify(sub.fields)) as AttrField[],
        `attrFields mismatch for ${cat.name} › ${sub.name}`,
      );
      checked++;
    }
  }
  return checked;
}

/* ── Phase B: translations ──────────────────────────────────────────── */

interface AttrCatalog {
  label?: Record<string, string>;
  option?: Record<string, string>;
}

/** The shipped `attrs` catalog for a locale, or null if it is not present. */
function attrCatalog(locale: string): AttrCatalog | null {
  const path = join(ATTRS_DIR, `${locale}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as AttrCatalog;
}

/**
 * Move the eleven shipped `attrs.json` catalogs into
 * `SubcategoryTranslation.attrFields`.
 *
 * These are DeepL-reviewed strings — 846 labels and 3,520 options per locale —
 * so they are copied across rather than re-machine-translated. The catalogs are
 * keyed by `attrKey(text)`; the DB dict is keyed by the English text itself,
 * because the key function is about to be deleted along with the catalogs.
 *
 * Only UPDATEs an existing translation row. Creating one here with the English
 * name would make the subcategory invisible to the hourly sweep's
 * `translations: { none: { locale } }` selector and freeze its label in English
 * forever — so a missing row is reported instead, for `backfill:translations`.
 */
async function seedTranslations() {
  const rows = await prisma.subcategory.findMany({
    where: { NOT: { attrFields: { equals: Prisma.DbNull } } },
    select: { id: true, name: true, attrFields: true, translations: { select: { id: true, locale: true } } },
  });
  const locales = LOCALES.filter((l) => l !== 'en');
  const noRow: string[] = [];
  let written = 0;

  for (const locale of locales) {
    const catalog = attrCatalog(locale);
    if (!catalog) {
      console.warn(`  no attrs catalog for ${locale} — skipped`);
      continue;
    }
    for (const row of rows) {
      const tr = row.translations.find((t) => t.locale === locale);
      if (!tr) {
        noRow.push(`${row.name} (${locale})`);
        continue;
      }
      const fields = row.attrFields as unknown as AttrField[];
      const label: Record<string, string> = {};
      const option: Record<string, string> = {};
      for (const f of fields) {
        // Skip translations identical to the source: they are the catalog's
        // own fallback, and storing them just bloats every row.
        const l = catalog.label?.[attrKey(f.label)];
        if (l && l !== f.label) label[f.label] = l;
        for (const o of f.options ?? []) {
          const t = catalog.option?.[attrKey(o)];
          if (t && t !== o) option[o] = t;
        }
      }
      if (!Object.keys(label).length && !Object.keys(option).length) continue;
      await prisma.subcategoryTranslation.update({
        where: { id: tr.id },
        data: { attrFields: { label, option } as Prisma.InputJsonValue },
      });
      written++;
    }
  }
  return { written, noRow, locales: locales.length };
}

async function main() {
  const { written, empty, missing, fuzzy } = await seedFields();
  console.log(`Fields: wrote ${written} subcategory(ies); ${empty} had no fields to write.`);
  if (fuzzy.length) {
    console.warn(`\n⚠ ${fuzzy.length} entr(ies) only matched after ignoring punctuation — these were BROKEN before:`);
    for (const f of fuzzy) console.warn(`   · ${f}`);
  }
  if (missing.length) {
    console.warn(`\n⚠ ${missing.length} schema entr(ies) had no matching taxonomy row — their fields were NOT seeded:`);
    for (const m of missing) console.warn(`   · ${m}`);
    console.warn('  Run `taxonomy:sync --apply` and re-run this script.\n');
  }

  const checked = await verifyFields();
  console.log(`Verified ${checked} subcategory field array(s) round-trip cleanly.`);

  const tr = await seedTranslations();
  console.log(`Translations: wrote ${tr.written} row(s) across ${tr.locales} locale(s).`);
  if (tr.noRow.length) {
    console.warn(
      `\n⚠ ${tr.noRow.length} (subcategory, locale) pair(s) had no translation row to attach to — e.g. ${tr.noRow
        .slice(0, 3)
        .join(', ')}`,
    );
    console.warn('  Run `backfill:translations` first, then re-run this script.\n');
  }

  if (missing.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
