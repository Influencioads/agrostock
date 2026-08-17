import { PrismaClient } from '@prisma/client';
import { WORKER_TYPES, WORKER_TYPE_GROUPS } from './worker-types';

const prisma = new PrismaClient();

/**
 * Upsert the labour taxonomy.
 *
 * Idempotent and non-destructive, like the service-taxonomy seed: a type that
 * has left the list is DEACTIVATED rather than deleted, because providers price
 * against these rows and a hard delete would cascade their rates away. Sort
 * order is derived from position in the file, so reordering the array reorders
 * the pickers without touching the database by hand.
 */
async function main() {
  let created = 0;
  let updated = 0;

  for (const [index, type] of WORKER_TYPES.entries()) {
    const existing = await prisma.workerType.findUnique({ where: { slug: type.slug }, select: { id: true } });
    const row = await prisma.workerType.upsert({
      where: { slug: type.slug },
      create: {
        slug: type.slug,
        nameEn: type.nameEn,
        group: type.group,
        sortOrder: index,
        isActive: true,
      },
      update: {
        nameEn: type.nameEn,
        group: type.group,
        sortOrder: index,
        // Re-running the seed revives a type an admin deactivated by hand only
        // if it is still in the list — which is the intent of it being here.
        isActive: true,
      },
      select: { id: true },
    });
    if (existing) updated++;
    else created++;

    await prisma.workerTypeTranslation.upsert({
      where: { workerTypeId_locale: { workerTypeId: row.id, locale: 'ru' } },
      create: { workerTypeId: row.id, locale: 'ru', name: type.nameRu },
      update: { name: type.nameRu },
    });
  }

  const slugs = WORKER_TYPES.map((t) => t.slug);
  const { count: deactivated } = await prisma.workerType.updateMany({
    where: { slug: { notIn: slugs }, isActive: true },
    data: { isActive: false },
  });

  console.log('Worker taxonomy seed complete');
  console.log(`  created      ${created}`);
  console.log(`  updated      ${updated}`);
  console.log(`  deactivated  ${deactivated}`);
  console.log(`  groups       ${WORKER_TYPE_GROUPS.length}`);
  console.log(`  total        ${WORKER_TYPES.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
