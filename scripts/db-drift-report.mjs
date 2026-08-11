/**
 * DB ↔ schema.prisma drift report.
 *
 * Read-only. Connects to DATABASE_URL, reads `information_schema` and the enum
 * catalogue, and compares them against what schema.prisma declares. Prints every
 * table, column and enum value that exists on ONE side only — and pairs them up
 * where a rename is the obvious explanation (camelCase ↔ snake_case, etc.), so
 * you get the exact `@map` / `@@map` lines to add rather than a 2,000-line diff.
 *
 * Nothing is written to the database and nothing is written to schema.prisma.
 * Run it, read it, then decide.
 *
 *   node scripts/db-drift-report.mjs
 *   node scripts/db-drift-report.mjs --json > drift.json
 *
 * Why not `prisma migrate diff`? Because that assumes migration history is the
 * truth. Here the DATABASE is the truth — it was renamed out of band — and the
 * schema is what has to catch up.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_PATH = join(ROOT, 'apps/api/prisma/schema.prisma');
const AS_JSON = process.argv.includes('--json');

/* ── 1. what schema.prisma declares ─────────────────────────────────────── */

/** Prisma scalar types — anything else is either an enum or a relation. */
const SCALARS = new Set([
  'String', 'Boolean', 'Int', 'BigInt', 'Float', 'Decimal', 'DateTime', 'Json', 'Bytes',
]);

/**
 * Parse the schema without a Prisma dependency: block-scan for `model X { … }`
 * and `enum X { … }`. Deliberately simple — it only needs names, not semantics.
 */
function parseSchema(src) {
  const models = new Map(); // model name → { table, fields: Map(fieldName → column) }
  const enums = new Map();  // enum name  → { dbName, values: Map(memberName → dbValue) }

  // Strip comments so `//` and `///` text can't be mistaken for declarations.
  const lines = src.split('\n').map((l) => l.replace(/\/\/.*$/, ''));

  const modelNames = new Set();
  const enumNames = new Set();
  for (const line of lines) {
    const m = line.match(/^\s*(model|enum)\s+(\w+)\s*\{/);
    if (m) (m[1] === 'model' ? modelNames : enumNames).add(m[2]);
  }

  /** `@map("x")` / `@@map("x")` → x */
  const mapped = (line, double = false) => {
    const re = double ? /@@map\("([^"]+)"\)/ : /(?<!@)@map\("([^"]+)"\)/;
    return line.match(re)?.[1];
  };

  let block = null; // { kind, name, body: [] }
  for (const line of lines) {
    const open = line.match(/^\s*(model|enum)\s+(\w+)\s*\{/);
    if (open) { block = { kind: open[1], name: open[2], body: [] }; continue; }
    if (!block) continue;
    if (/^\s*\}\s*$/.test(line)) {
      if (block.kind === 'model') models.set(block.name, readModel(block));
      else enums.set(block.name, readEnum(block));
      block = null;
      continue;
    }
    block.body.push(line);
  }

  function readModel(b) {
    const table = b.body.map((l) => mapped(l, true)).find(Boolean) ?? b.name;
    const fields = new Map();
    for (const line of b.body) {
      if (/^\s*@@/.test(line)) continue;                    // @@index, @@unique, @@map
      const f = line.match(/^\s*(\w+)\s+(\w+)(\[\])?(\?)?/);
      if (!f) continue;
      const [, name, type] = f;
      // Relation fields occupy no column of their own; their FK scalar does.
      if (modelNames.has(type)) continue;
      if (!SCALARS.has(type) && !enumNames.has(type)) continue;
      fields.set(name, mapped(line) ?? name);
    }
    return { table, fields };
  }

  function readEnum(b) {
    const dbName = b.body.map((l) => mapped(l, true)).find(Boolean) ?? b.name;
    const values = new Map();
    for (const line of b.body) {
      if (/^\s*@@/.test(line)) continue;
      const v = line.match(/^\s*(\w+)/);
      if (v) values.set(v[1], mapped(line) ?? v[1]);
    }
    return { dbName, values };
  }

  return { models, enums };
}

/* ── 2. what the database actually has ──────────────────────────────────── */

const Q_COLUMNS = `
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = current_schema()
  ORDER BY table_name, ordinal_position`;

const Q_TABLES = `
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'`;

const Q_ENUMS = `
  SELECT t.typname AS enum_name, e.enumlabel AS value
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = current_schema()
  ORDER BY t.typname, e.enumsortorder`;

/**
 * Query through whichever client this repo already has — no new dependency.
 * `$queryRawUnsafe` bypasses the model layer, so it works even though the
 * generated client is built from the stale schema. That is the whole point.
 */
async function readDatabase() {
  let query;
  let close = async () => {};
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    query = (sql) => prisma.$queryRawUnsafe(sql);
    close = () => prisma.$disconnect();
  } catch {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    query = async (sql) => (await client.query(sql)).rows;
    close = () => client.end();
  }

  try {
    const tables = new Set((await query(Q_TABLES)).map((r) => r.table_name));
    const columns = new Map();
    for (const r of await query(Q_COLUMNS)) {
      if (!columns.has(r.table_name)) columns.set(r.table_name, new Set());
      columns.get(r.table_name).add(r.column_name);
    }
    const enums = new Map();
    for (const r of await query(Q_ENUMS)) {
      if (!enums.has(r.enum_name)) enums.set(r.enum_name, new Set());
      enums.get(r.enum_name).add(r.value);
    }
    return { tables, columns, enums };
  } finally {
    await close();
  }
}

/* ── 3. pair the leftovers up ───────────────────────────────────────────── */

/** Fold a name to letters+digits only, so `stockQty` ≈ `stock_qty` ≈ `STOCKQTY`. */
const fold = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Crude depluraliser, applied to BOTH sides of a comparison. Prisma models are
 * singular by convention and DB tables are very often plural, so `Product` →
 * `products` is the single most common rename there is. Over-stripping is
 * harmless here ("address" → "addres" on both sides still compares equal); it
 * only ever has to be *symmetric*, never linguistically correct.
 */
const singular = (s) =>
  s.replace(/ies$/, 'y').replace(/(ss|sh|ch|x|z)es$/, '$1').replace(/s$/, '');

/**
 * Match names missing on one side against names unexpected on the other.
 *
 * Two passes, most confident first, so a plural near-match can never steal a
 * partner from an exact match. Anything still unpaired is reported as unmatched
 * rather than guessed at — a wrong guess here writes a wrong `@map`, which is
 * worse than no `@map` because it fails silently at query time.
 */
function pair(missing, extra) {
  const renames = [];
  const leftExtra = new Set(extra);
  let leftMissing = [...missing];

  for (const [confidence, key] of [['exact', fold], ['plural', (s) => singular(fold(s))]]) {
    const stillMissing = [];
    for (const m of leftMissing) {
      const hit = [...leftExtra].find((e) => key(e) === key(m));
      if (hit) { renames.push({ from: m, to: hit, confidence }); leftExtra.delete(hit); }
      else stillMissing.push(m);
    }
    leftMissing = stillMissing;
  }
  return { renames, missing: leftMissing, extra: [...leftExtra] };
}

/* ── 4. report ──────────────────────────────────────────────────────────── */

const report = { tables: null, columns: [], enums: [], summary: {} };

const db = await readDatabase();
const { models, enums } = parseSchema(readFileSync(SCHEMA_PATH, 'utf8'));

// Tables. Only tables Prisma manages are compared; anything else in the DB
// (extensions, _prisma_migrations) is ignored rather than reported as junk.
const expectedTables = [...models.values()].map((m) => m.table);
const missingTables = expectedTables.filter((t) => !db.tables.has(t));
const unknownTables = [...db.tables].filter(
  (t) => !expectedTables.includes(t) && t !== '_prisma_migrations',
);
report.tables = pair(missingTables, unknownTables);

// Columns, per model whose table we could locate.
for (const [modelName, model] of models) {
  const actualTable =
    db.tables.has(model.table)
      ? model.table
      : report.tables.renames.find((r) => r.from === model.table)?.to;
  if (!actualTable) continue; // table itself is missing — reported above

  const cols = db.columns.get(actualTable) ?? new Set();
  const expected = [...model.fields.values()];
  const missing = [...model.fields].filter(([, col]) => !cols.has(col));
  const extra = [...cols].filter((c) => !expected.includes(c));
  if (!missing.length && !extra.length) continue;

  const paired = pair(missing.map(([, col]) => col), extra);
  const fieldOf = (col) => missing.find(([, c]) => c === col)?.[0] ?? col;
  report.columns.push({
    model: modelName,
    table: actualTable,
    renames: paired.renames.map((r) => ({ field: fieldOf(r.from), ...r })),
    missing: paired.missing.map((c) => ({ field: fieldOf(c), column: c })),
    extra: paired.extra,
  });
}

// Enum values.
for (const [enumName, e] of enums) {
  const actual = db.enums.get(e.dbName);
  if (!actual) { report.enums.push({ enum: enumName, absentInDb: true }); continue; }
  const expected = [...e.values.values()];
  const paired = pair(expected.filter((v) => !actual.has(v)), [...actual].filter((v) => !expected.includes(v)));
  if (!paired.renames.length && !paired.missing.length && !paired.extra.length) continue;
  const memberOf = (val) => [...e.values].find(([, v]) => v === val)?.[0] ?? val;
  report.enums.push({
    enum: enumName,
    type: e.dbName,
    renames: paired.renames.map((r) => ({ member: memberOf(r.from), ...r })),
    missing: paired.missing,
    extra: paired.extra,
  });
}

report.summary = {
  tablesRenamed: report.tables.renames.length,
  tablesMissing: report.tables.missing.length,
  columnsRenamed: report.columns.reduce((n, c) => n + c.renames.length, 0),
  columnsMissing: report.columns.reduce((n, c) => n + c.missing.length, 0),
  enumValuesRenamed: report.enums.reduce((n, e) => n + (e.renames?.length ?? 0), 0),
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const clean =
    !report.summary.tablesRenamed && !report.summary.tablesMissing &&
    !report.summary.columnsRenamed && !report.summary.columnsMissing &&
    !report.summary.enumValuesRenamed && !report.tables.extra.length;

  console.log('\n  DB ↔ schema.prisma drift report');
  console.log('  ' + '─'.repeat(60));
  if (clean) {
    console.log('  No drift. Every table, column and enum value lines up.\n');
  }

  if (report.tables.renames.length) {
    console.log('\n  TABLES RENAMED — add @@map to the model\n');
    for (const r of report.tables.renames) {
      const model = [...models].find(([, m]) => m.table === r.from)?.[0] ?? r.from;
      const note = r.confidence === 'plural' ? '   // singular/plural match — confirm' : '';
      console.log(`    model ${model}  →  @@map("${r.to}")${note}`);
    }
  }
  if (report.tables.missing.length) {
    console.log('\n  TABLES IN SCHEMA BUT NOT IN DB — no obvious match\n');
    for (const t of report.tables.missing) console.log(`    ${t}`);
  }
  if (report.tables.extra.length) {
    console.log('\n  TABLES IN DB BUT NOT IN SCHEMA — no obvious match\n');
    for (const t of report.tables.extra) console.log(`    ${t}`);
  }

  for (const c of report.columns) {
    console.log(`\n  ${c.model}  (table "${c.table}")`);
    for (const r of c.renames) console.log(`    ${r.field.padEnd(24)} → @map("${r.to}")`);
    for (const m of c.missing) console.log(`    ${m.field.padEnd(24)} ✗ column "${m.column}" not in DB`);
    for (const e of c.extra) console.log(`    ${''.padEnd(24)} ? DB column "${e}" not in schema`);
  }

  for (const e of report.enums) {
    if (e.absentInDb) { console.log(`\n  enum ${e.enum} — type not found in DB`); continue; }
    console.log(`\n  enum ${e.enum}  (type "${e.type}")`);
    for (const r of e.renames) console.log(`    ${r.member.padEnd(24)} → @map("${r.to}")`);
    for (const m of e.missing) console.log(`    ${String(m).padEnd(24)} ✗ value not in DB`);
    for (const x of e.extra) console.log(`    ${''.padEnd(24)} ? DB value "${x}" not in schema`);
  }

  console.log('\n  ' + '─'.repeat(60));
  console.log(`  tables renamed ${report.summary.tablesRenamed} · columns renamed ${report.summary.columnsRenamed} · enum values renamed ${report.summary.enumValuesRenamed}`);
  console.log(`  unmatched: ${report.summary.tablesMissing} tables · ${report.summary.columnsMissing} columns\n`);
}
