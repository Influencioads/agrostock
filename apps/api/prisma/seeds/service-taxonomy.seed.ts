/**
 * Seeds the service taxonomy from `service-taxonomy.json`.
 *
 * NON-DESTRUCTIVE BY CONSTRUCTION. It upserts by slug and it never deletes:
 * a node that disappears from the JSON is set `isActive = false` and keeps its
 * row, because a provider may already have priced it and an FK to a deleted
 * node is a broken listing. Re-running is a no-op beyond touching `updatedAt`.
 *
 * `slug` is the identity across runs — the kebab-cased full ancestor path
 * (`processing/roasting/roasting-types/dry-roasting`). It is stored in the JSON
 * rather than derived here so that changing the slug rule can never silently
 * re-key the whole tree into duplicates.
 *
 * Russian: only translations we are confident of are written. Everything else is
 * left English and listed in `missing-ru-translations.txt` — shipping invented
 * Russian to a Russian client is worse than shipping English.
 *
 * Prereqs: DB up, migration applied (`prisma migrate deploy`).
 * Run:  pnpm --filter @agrotraders/api seed:services
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient, type Prisma, type ServiceNodeKind, type ServiceCountryScope } from '@prisma/client';
import { SERVICE_TAXONOMY_RU } from './service-taxonomy-ru';

interface SeedNode {
  name: string;
  slug: string;
  kind: ServiceNodeKind;
  countryScope?: ServiceCountryScope;
  description?: string;
  children?: SeedNode[];
}

interface SeedDoc {
  countriesServed: string[];
  sections: SeedNode[];
}

const DOC: SeedDoc = JSON.parse(
  readFileSync(join(__dirname, 'service-taxonomy.json'), 'utf8'),
) as SeedDoc;

/** Country codes are the stable key; the label is what an admin sees. */
const COUNTRY_CODE = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/(^_|_$)/g, '');

interface Stats {
  created: number;
  updated: number;
  reactivated: number;
  deactivated: number;
  byLevel: Record<number, number>;
  missingRu: string[];
}

/**
 * Walk the JSON depth-first, upserting each node before its children so a parent
 * id always exists. Returns every slug seen, which is what decides the
 * deactivation pass.
 */
async function upsertTree(prisma: PrismaClient, stats: Stats): Promise<Set<string>> {
  const seen = new Set<string>();

  const walk = async (node: SeedNode, parentId: string | null, level: number, sortOrder: number) => {
    seen.add(node.slug);
    stats.byLevel[level] = (stats.byLevel[level] ?? 0) + 1;

    const isLeaf = node.kind === 'SERVICE';
    const data = {
      parentId,
      nameEn: node.name,
      descriptionEn: node.description ?? null,
      kind: node.kind,
      countryScope: node.countryScope ?? null,
      level,
      isLeaf,
      sortOrder,
      // A node present in the JSON is live again even if a previous run retired
      // it — re-adding a service must un-hide it, not leave a ghost.
      isActive: true,
    } satisfies Prisma.ServiceNodeUncheckedCreateInput extends infer T ? Partial<T> : never;

    const existing = await prisma.serviceNode.findUnique({
      where: { slug: node.slug },
      select: { id: true, isActive: true },
    });
    const row = await prisma.serviceNode.upsert({
      where: { slug: node.slug },
      create: { slug: node.slug, ...data },
      update: data,
      select: { id: true },
    });
    if (!existing) stats.created += 1;
    else if (!existing.isActive) stats.reactivated += 1;
    else stats.updated += 1;

    const ru = SERVICE_TAXONOMY_RU[node.slug];
    if (ru) {
      await prisma.serviceNodeTranslation.upsert({
        where: { nodeId_locale: { nodeId: row.id, locale: 'ru' } },
        create: { nodeId: row.id, locale: 'ru', name: ru },
        update: { name: ru },
      });
    } else {
      stats.missingRu.push(`${node.slug}\t${node.name}`);
    }

    let i = 0;
    for (const child of node.children ?? []) {
      await walk(child, row.id, level + 1, i);
      i += 1;
    }
  };

  let i = 0;
  for (const section of DOC.sections) {
    await walk(section, null, 1, i);
    i += 1;
  }
  return seen;
}

/**
 * Retire anything no longer in the JSON. Deactivate only — never delete, so a
 * ProviderService pointing at a retired node keeps resolving and an admin can
 * see what happened.
 */
async function deactivateMissing(prisma: PrismaClient, seen: Set<string>, stats: Stats) {
  const stale = await prisma.serviceNode.findMany({
    where: { isActive: true, slug: { notIn: [...seen] } },
    select: { id: true, slug: true },
  });
  if (!stale.length) return;
  await prisma.serviceNode.updateMany({
    where: { id: { in: stale.map((n) => n.id) } },
    data: { isActive: false },
  });
  stats.deactivated = stale.length;
  for (const n of stale) console.log(`  retired (kept, isActive=false): ${n.slug}`);
}

/** The provider "countries served" reference list — NOT taxonomy country nodes. */
async function seedCountries(prisma: PrismaClient) {
  let i = 0;
  for (const name of DOC.countriesServed) {
    await prisma.serviceCountry.upsert({
      where: { code: COUNTRY_CODE(name) },
      create: { code: COUNTRY_CODE(name), nameEn: name, sortOrder: i, isActive: true },
      update: { nameEn: name, sortOrder: i, isActive: true },
    });
    i += 1;
  }
  console.log(`Countries served: ${DOC.countriesServed.length} upserted`);
}

async function main() {
  const prisma = new PrismaClient();
  const stats: Stats = { created: 0, updated: 0, reactivated: 0, deactivated: 0, byLevel: {}, missingRu: [] };
  try {
    const seen = await upsertTree(prisma, stats);
    await deactivateMissing(prisma, seen, stats);
    await seedCountries(prisma);

    const report = join(__dirname, 'missing-ru-translations.txt');
    if (stats.missingRu.length) {
      writeFileSync(report, `${stats.missingRu.length} nodes have no Russian translation.\nslug\tnameEn\n${stats.missingRu.join('\n')}\n`, 'utf8');
    }

    console.log('\nService taxonomy seed complete');
    console.log(`  created      ${stats.created}`);
    console.log(`  updated      ${stats.updated}`);
    console.log(`  reactivated  ${stats.reactivated}`);
    console.log(`  deactivated  ${stats.deactivated}`);
    for (const level of Object.keys(stats.byLevel).map(Number).sort()) {
      console.log(`  level ${level}      ${stats.byLevel[level]}`);
    }
    console.log(`  total        ${Object.values(stats.byLevel).reduce((a, b) => a + b, 0)}`);
    console.log(
      stats.missingRu.length
        ? `  RU missing   ${stats.missingRu.length} → ${report}`
        : '  RU missing   0',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
