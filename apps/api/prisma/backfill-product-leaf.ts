/**
 * Moves existing listings down onto the taxonomy leaf their own attributes
 * already describe.
 *
 * Until the seller form got a full drill-down it only offered LEVEL 2, so every
 * listing sits on e.g. "Nuts › Almond" while carrying form="In-shell",
 * variety="Nonpareil", count_per_oz="32/34" — the very things levels 3-5 spell
 * out as nodes ("In-shell almond › Nonpareil in-shell › Size 32/34 mm"). A buyer
 * who drills that far therefore gets an empty grid even though the listing is a
 * literal match.
 *
 * Walks each product down from wherever it sits, taking a child only when that
 * child's NAME states one of the product's own attribute values (the same
 * predicate that hides a duplicated field, run in reverse). Anything ambiguous —
 * two children matching, or none — stops the descent, so a listing is never
 * guessed into the wrong branch. Its attributes are left untouched: they stay
 * true, they just stop being asked twice.
 *
 * Dry-run by default; nothing is written until `--apply`.
 *   pnpm --filter @agrotraders/api backfill:product-leaf
 *   pnpm --filter @agrotraders/api backfill:product-leaf -- --apply
 */
import { PrismaClient } from '@prisma/client';
import { labelWords, nameStatesValue } from '@agrotraders/types';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

type Node = { id: string; name: string; parentId: string | null };

async function main() {
  const subs = await prisma.subcategory.findMany({ select: { id: true, name: true, parentId: true } });
  const childrenOf = new Map<string, Node[]>();
  for (const sub of subs) {
    if (!sub.parentId) continue;
    childrenOf.set(sub.parentId, [...(childrenOf.get(sub.parentId) ?? []), sub]);
  }
  const byId = new Map(subs.map((s) => [s.id, s]));

  const products = await prisma.product.findMany({
    where: { subcategoryId: { not: null } },
    select: { id: true, name: true, subcategoryId: true, attributes: true },
  });

  let moved = 0;
  let ambiguous = 0;

  for (const product of products) {
    const attrs = (product.attributes ?? {}) as Record<string, unknown>;
    // Only discrete values name a node; a moisture percentage never will.
    const values = Object.values(attrs).flatMap((v) =>
      typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [],
    );
    if (!values.length) continue;

    const start = product.subcategoryId!;
    let cursor = start;
    const trail: string[] = [];

    // Everything this listing has already said: where it sits, plus its own
    // attribute values. A candidate child may only RESTATE these — the moment it
    // introduces a word of its own it is describing different goods, and the
    // descent stops. Without this, a maize listing graded "Feed" walks straight
    // into "Fodder grain › Feed wheat" on the strength of that one word.
    const known = new Set([
      ...labelWords(byId.get(start)?.name ?? ''),
      ...values.flatMap(labelWords),
    ]);

    // Bounded by the depth cap; a cycle in the data can never spin this.
    for (let hop = 0; hop < 6; hop++) {
      const hits = (childrenOf.get(cursor) ?? []).filter(
        (child) =>
          values.some((value) => nameStatesValue(child.name, value)) &&
          labelWords(child.name).every((w) => known.has(w)),
      );
      if (hits.length !== 1) {
        if (hits.length > 1) ambiguous++;
        break;
      }
      cursor = hits[0].id;
      trail.push(hits[0].name);
      for (const w of labelWords(hits[0].name)) known.add(w);
    }

    if (cursor === start) continue;
    moved++;
    console.log(`  ${product.name}\n    ${byId.get(start)?.name} → ${trail.join(' > ')}`);
    if (APPLY) {
      await prisma.product.update({ where: { id: product.id }, data: { subcategoryId: cursor } });
    }
  }

  console.log(
    `\n${APPLY ? 'Moved' : 'Would move'} ${moved} of ${products.length} listing(s)` +
      (ambiguous ? `; ${ambiguous} stopped early on an ambiguous level (left where they are).` : '.'),
  );
  if (!APPLY && moved) console.log('Dry run — pass --apply to commit.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
