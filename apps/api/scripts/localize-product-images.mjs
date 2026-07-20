// One-off: point every product whose imageUrl is an external URL at a locally
// hosted copy under /uploads/products/seed-<slug>.jpg (downloaded beforehand).
// Self-hosting the images makes them load over the app's own HTTP origin —
// reliable on mobile, where external HTTPS (unsplash) can fail TLS validation.
import { PrismaClient } from '@prisma/client';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();
const uploadsRoot = join(process.cwd(), 'uploads', 'products');

const products = await prisma.product.findMany({ select: { id: true, slug: true, imageUrl: true } });
let updated = 0, skipped = 0, missing = 0;
for (const p of products) {
  const localRel = `/uploads/products/seed-${p.slug}.jpg`;
  const localAbs = join(uploadsRoot, `seed-${p.slug}.jpg`);
  if (!existsSync(localAbs)) { console.log(`  ⚠ no local file for ${p.slug}`); missing++; continue; }
  if (p.imageUrl === localRel) { skipped++; continue; }
  await prisma.product.update({ where: { id: p.id }, data: { imageUrl: localRel } });
  console.log(`  ✅ ${p.slug} -> ${localRel}`);
  updated++;
}
console.log(`\nupdated ${updated}, already-local ${skipped}, missing-file ${missing}, total ${products.length}`);
await prisma.$disconnect();
