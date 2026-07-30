/**
 * One-off, idempotent backfill: give existing products schema-valid sample
 * `attributes` so the new category/subcategory buyer filters have data to match.
 *
 * Only touches products whose subcategory has attribute fields AND whose
 * `attributes` is still empty — it never overwrites values a seller entered.
 * For each field it fills a safe default (first option for select/multiselect,
 * `true` for boolean) and leaves free-text/number/date blank.
 *
 * Run after `seed:attrs` (DB must be up):  pnpm --filter @agrotraders/api backfill:attrs
 */
import { PrismaClient } from '@prisma/client';
import { type AttrField } from '@agrotraders/types';

const prisma = new PrismaClient();

/**
 * Attribute fields per subcategory id, inheritance applied — the CLI twin of
 * `CategoriesService.fieldMap()`. Built once: the walk is pure in-memory and
 * this script iterates every product.
 */
async function fieldMap() {
  const rows = await prisma.subcategory.findMany({ select: { id: true, parentId: true, attrFields: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out = new Map<string, AttrField[]>();
  for (const row of rows) {
    let node: (typeof rows)[number] | undefined = row;
    for (let hops = 0; node && hops < 8; hops++) {
      const fields = node.attrFields as AttrField[] | null;
      if (fields?.length) {
        out.set(row.id, fields);
        break;
      }
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
  }
  return out;
}

function sampleValue(f: AttrField): unknown | undefined {
  if (f.type === 'select') return f.options?.[0];
  if (f.type === 'multiselect') return f.options?.length ? [f.options[0]] : undefined;
  if (f.type === 'boolean') return true;
  return undefined; // free text / number / date are left for a human to fill
}

async function main() {
  const fields_ = await fieldMap();
  const products = await prisma.product.findMany({ select: { id: true, subcategoryId: true, attributes: true } });

  let updated = 0;
  let skipped = 0;
  for (const p of products) {
    const fields = (p.subcategoryId && fields_.get(p.subcategoryId)) || [];
    if (fields.length === 0) { skipped++; continue; }

    const existing = (p.attributes as Record<string, unknown> | null) ?? {};
    if (Object.keys(existing).length > 0) { skipped++; continue; } // keep real data

    const attrs: Record<string, unknown> = {};
    for (const f of fields) {
      const v = sampleValue(f);
      if (v !== undefined) attrs[f.key] = v;
    }
    if (Object.keys(attrs).length === 0) { skipped++; continue; }

    await prisma.product.update({ where: { id: p.id }, data: { attributes: attrs as never } });
    updated++;
  }

  console.log(`Backfilled attributes on ${updated} product(s); left ${skipped} untouched.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
