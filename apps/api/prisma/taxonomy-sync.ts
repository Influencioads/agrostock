/**
 * Reconciles the database's Category / Subcategory tables against `TAXONOMY`
 * (apps/api/prisma/taxonomy/) — the "delete the old taxonomy, install the deep
 * one" operation, done without losing a single listing.
 *
 * Safety model, in order:
 *   1. UPSERT the whole desired tree first. Categories match on their unique
 *      `name` and level-2 nodes match on (categoryId, parentId=null, name), so
 *      every row that exists in both the old and new tree KEEPS ITS ID — which
 *      means the vast majority of products never need touching at all.
 *   2. Only then look at what's left over. Products pointing at a leftover
 *      subcategory are re-homed onto the closest surviving node (same category,
 *      same name; else its level-2 ancestor; else null) BEFORE the row is
 *      deleted, so no FK ever fails and nothing is silently dropped.
 *   3. Leftover CATEGORIES that still hold products or buyer-bids are reported
 *      and skipped, never force-deleted — there is no safe automatic target for
 *      those listings, so a human decides.
 *
 * Every move is written to `.taxonomy-report.csv` next to this file.
 *
 * Run (dry-run is the default — it computes everything, writes the report, then
 * rolls the transaction back):
 *   pnpm --filter @agrotraders/api taxonomy:sync
 *   pnpm --filter @agrotraders/api taxonomy:sync -- --apply
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { buildTaxonomyPlan, subKey, type PlannedSubcategory } from './taxonomy/plan';
import { taxonomyStats } from './taxonomy';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const REPORT_PATH = join(__dirname, '.taxonomy-report.csv');

/** Thrown to roll back the transaction at the end of a dry run. */
const ROLLBACK = Symbol('taxonomy-sync:rollback');

type ReportRow = { action: string; category: string; path: string; slug: string; detail: string };
const report: ReportRow[] = [];
const record = (action: string, category: string, path: string, slug: string, detail = '') =>
  report.push({ action, category, path, slug, detail });

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function sync(tx: Prisma.TransactionClient) {
  const plan = buildTaxonomyPlan();

  /* ── 1. Categories ─────────────────────────────────────────────────── */

  const categoryIdByName = new Map<string, string>();
  for (const planned of plan.categories) {
    const existing = await tx.category.findUnique({ where: { name: planned.name }, select: { id: true } });
    const row = existing
      ? await tx.category.update({
          where: { id: existing.id },
          data: { slug: planned.slug, emoji: planned.emoji, tint: planned.tint, sort: planned.sort },
        })
      : await tx.category.create({
          data: {
            name: planned.name,
            slug: planned.slug,
            emoji: planned.emoji,
            tint: planned.tint,
            sort: planned.sort,
          },
        });
    categoryIdByName.set(planned.name, row.id);
    record(existing ? 'category:keep' : 'category:create', planned.name, '', planned.slug);
  }

  /* ── 2. Index what is already in the database ──────────────────────── */

  const existingSubs = await tx.subcategory.findMany({
    select: { id: true, name: true, slug: true, categoryId: true, parentId: true },
  });
  const subById = new Map(existingSubs.map((s) => [s.id, s]));
  const categoryNameById = new Map([...categoryIdByName].map(([name, id]) => [id, name]));
  for (const c of await tx.category.findMany({ select: { id: true, name: true } })) {
    categoryNameById.set(c.id, c.name);
  }

  /** Identity of an existing row: category name + the chain of names down to it. */
  const existingKey = (id: string): string | null => {
    const path: string[] = [];
    let cursor = subById.get(id);
    const guard = new Set<string>();
    while (cursor) {
      if (guard.has(cursor.id)) return null; // cyclic data — treat as unmatched
      guard.add(cursor.id);
      path.unshift(cursor.name);
      cursor = cursor.parentId ? subById.get(cursor.parentId) : undefined;
    }
    const first = subById.get(id);
    const categoryName = first ? categoryNameById.get(first.categoryId) : undefined;
    return categoryName ? subKey(categoryName, path) : null;
  };

  const existingIdByKey = new Map<string, string>();
  for (const sub of existingSubs) {
    const key = existingKey(sub.id);
    if (key && !existingIdByKey.has(key)) existingIdByKey.set(key, sub.id);
  }

  /* ── 3. Plan every row, then park only the slugs that actually move ── */
  // The tree is ~14k nodes, so this works in batches: ids are assigned here so a
  // `createMany` per level can reference parents without a round-trip, and rows
  // are only UPDATEd when something genuinely changed. A no-op re-run therefore
  // costs a handful of queries instead of fourteen thousand.

  const idByKey = new Map<string, string>();
  const kept = new Set<string>();
  type Row = {
    id: string;
    name: string;
    slug: string;
    emoji: string | null;
    sort: number;
    categoryId: string;
    parentId: string | null;
  };
  const toCreate: Row[][] = [];
  const toUpdate: Row[] = [];
  const slugChanging: string[] = [];

  for (const node of plan.subcategories) {
    const categoryId = categoryIdByName.get(node.categoryName)!;
    const parentId = node.parentPath ? idByKey.get(subKey(node.categoryName, node.parentPath))! : null;
    const key = subKey(node.categoryName, node.path);
    const existingId = existingIdByKey.get(key);
    const id = existingId ?? `tx${randomUUID().replace(/-/g, '')}`;

    const row: Row = {
      id,
      name: node.name,
      slug: node.slug,
      emoji: node.emoji ?? null,
      sort: node.sort,
      categoryId,
      parentId,
    };
    idByKey.set(key, id);
    kept.add(id);

    if (existingId) {
      const before = subById.get(existingId)!;
      if (before.slug !== node.slug) slugChanging.push(existingId);
      if (before.slug !== node.slug || before.name !== node.name || before.parentId !== parentId) toUpdate.push(row);
    } else {
      const bucket = node.level - 2;
      (toCreate[bucket] ??= []).push(row);
      record('subcategory:create', node.categoryName, node.path.join(' > '), node.slug, `L${node.level}`);
    }
  }

  const leftoverSubs = existingSubs.filter((s) => !kept.has(s.id));

  // `Subcategory.slug` is globally unique, so a row can want a string another row
  // currently holds. Only rows changing slug — or about to be deleted — can be
  // party to such a clash, so parking just those is enough.
  const parkIds = [...new Set([...slugChanging, ...leftoverSubs.map((s) => s.id)])];
  for (let i = 0; i < parkIds.length; i += 500) {
    const slice = parkIds.slice(i, i + 500);
    await tx.$executeRawUnsafe(
      `UPDATE "Subcategory" SET "slug" = 'tmp:' || "id" WHERE "id" IN (${slice.map((_, n) => `$${n + 1}`).join(',')})`,
      ...slice,
    );
  }

  /* ── 4. Write the desired tree, parents before children ───────────── */

  for (const level of toCreate) {
    if (!level?.length) continue;
    for (let i = 0; i < level.length; i += 2000) {
      await tx.subcategory.createMany({ data: level.slice(i, i + 2000) });
    }
  }
  for (const row of toUpdate) {
    const { id, ...data } = row;
    await tx.subcategory.update({ where: { id }, data });
  }

  // Russian labels ride on level-2 nodes only; deeper ones are machine-translated
  // later by `backfill:taxonomy`.
  for (const node of plan.subcategories) {
    if (node.level !== 2 || !node.ru) continue;
    const subcategoryId = idByKey.get(subKey(node.categoryName, node.path))!;
    await tx.subcategoryTranslation.upsert({
      where: { subcategoryId_locale: { subcategoryId, locale: 'ru' } },
      create: { subcategoryId, locale: 'ru', name: node.ru },
      update: { name: node.ru },
    });
  }

  /* ── 5. Re-home products off leftover subcategories, then delete ───── */

  /** Closest surviving node for an orphan: same name in the category, else its level-2 ancestor. */
  const rehomeTarget = (id: string): PlannedSubcategory | null => {
    const sub = subById.get(id);
    if (!sub) return null;
    const categoryName = categoryNameById.get(sub.categoryId);
    if (!categoryName) return null;
    const sameName = plan.byAnyName.get(`${categoryName} ${sub.name}`);
    if (sameName?.length === 1) return sameName[0];
    // Walk up to the level-2 ancestor and try to land there instead.
    let cursor = sub;
    const guard = new Set<string>();
    while (cursor.parentId && !guard.has(cursor.id)) {
      guard.add(cursor.id);
      const parent = subById.get(cursor.parentId);
      if (!parent) break;
      cursor = parent;
    }
    return plan.byLevel2Name.get(`${categoryName} ${cursor.name}`) ?? null;
  };

  for (const sub of leftoverSubs) {
    const affected = await tx.product.count({ where: { subcategoryId: sub.id } });
    const categoryName = categoryNameById.get(sub.categoryId) ?? '(unknown category)';
    if (affected > 0) {
      const target = rehomeTarget(sub.id);
      const targetId = target ? idByKey.get(subKey(target.categoryName, target.path)) ?? null : null;
      await tx.product.updateMany({ where: { subcategoryId: sub.id }, data: { subcategoryId: targetId } });
      record(
        targetId ? 'product:remap' : 'product:detach',
        categoryName,
        sub.name,
        sub.slug,
        targetId
          ? `${affected} product(s) → ${target!.path.join(' > ')}`
          : `${affected} product(s) left with no subcategory`,
      );
    }
  }

  // Deepest first: a parent delete would cascade its children away, and deleting
  // bottom-up keeps the reported counts honest.
  const depthOf = (id: string): number => {
    let depth = 0;
    let cursor = subById.get(id);
    const guard = new Set<string>();
    while (cursor?.parentId && !guard.has(cursor.id)) {
      guard.add(cursor.id);
      cursor = subById.get(cursor.parentId);
      depth++;
    }
    return depth;
  };
  for (const sub of [...leftoverSubs].sort((a, b) => depthOf(b.id) - depthOf(a.id))) {
    await tx.subcategory.delete({ where: { id: sub.id } }).catch(() => undefined); // already cascaded
    record('subcategory:delete', categoryNameById.get(sub.categoryId) ?? '', sub.name, sub.slug);
  }

  /* ── 6. Leftover categories — delete only when provably empty ──────── */

  const leftoverCategories = await tx.category.findMany({
    where: { name: { notIn: plan.categories.map((c) => c.name) } },
    select: { id: true, name: true, slug: true, _count: { select: { products: true, buyerBids: true } } },
  });
  for (const cat of leftoverCategories) {
    const blockers = cat._count.products + cat._count.buyerBids;
    if (blockers > 0) {
      record(
        'category:skip',
        cat.name,
        '',
        cat.slug,
        `not in TAXONOMY but still holds ${cat._count.products} product(s) and ${cat._count.buyerBids} bid(s) — reassign them, then re-run`,
      );
      continue;
    }
    await tx.category.delete({ where: { id: cat.id } });
    record('category:delete', cat.name, '', cat.slug, 'not in TAXONOMY and empty');
  }

  return {
    categories: plan.categories.length,
    subcategories: plan.subcategories.length,
    created: report.filter((r) => r.action.endsWith(':create')).length,
    deleted: report.filter((r) => r.action.endsWith(':delete')).length,
    remapped: report.filter((r) => r.action === 'product:remap').length,
    detached: report.filter((r) => r.action === 'product:detach').length,
    skipped: report.filter((r) => r.action === 'category:skip').length,
  };
}

async function main() {
  const stats = taxonomyStats();
  console.log(
    `📚 TAXONOMY: ${stats.total} nodes —`,
    stats.perLevel.map((n, i) => `L${i + 1}=${n}`).join(' '),
  );
  console.log(APPLY ? '✍️  APPLY mode — changes will be committed.' : '🔍 DRY RUN — pass --apply to commit.');

  let summary: Awaited<ReturnType<typeof sync>> | undefined;
  try {
    await prisma.$transaction(
      async (tx) => {
        summary = await sync(tx);
        if (!APPLY) throw ROLLBACK;
      },
      { maxWait: 60_000, timeout: 900_000 },
    );
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }

  writeFileSync(
    REPORT_PATH,
    ['action,category,path,slug,detail']
      .concat(report.map((r) => [r.action, r.category, r.path, r.slug, r.detail].map(csvCell).join(',')))
      .join('\n'),
    'utf8',
  );

  console.log('📄 Report:', REPORT_PATH);
  console.log(APPLY ? '✅ Applied:' : '✅ Would apply:', summary);
  if (summary?.skipped) {
    console.warn(`⚠️  ${summary.skipped} category(ies) skipped — see "category:skip" rows in the report.`);
  }
  if (summary?.detached) {
    console.warn(`⚠️  ${summary.detached} product group(s) lost their subcategory — see "product:detach" rows.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
