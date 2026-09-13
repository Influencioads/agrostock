import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';
import { noQuotas } from './helpers/entitlements-stub';
import { noTranslate } from './helpers/text-translation-stub';

/**
 * Creating a listing holds it at `approved:false`/`status:'pending'`, but an
 * edit used to write neither — so an approved listing could be rewritten into
 * anything and stay live. That walks straight through the pre-publication human
 * review, which is the only real control we have on regulated goods
 * (agrochemicals), and it is the control we describe to App Review.
 *
 * Price, stock and auction timing are deliberately NOT moderated: re-queueing a
 * listing every time a seller corrects a price would make the queue useless.
 */

const EXISTING = {
  id: 'p1',
  sellerId: 'seller-1',
  categoryId: 'cat-1',
  subcategoryId: null,
  isAuction: false,
  safeDeal: true,
  stockQty: 10,
  qty: '10',
  unit: 'kg',
  price: '100',
  priceCurrency: 'USD',
};

function serviceFor() {
  const prisma = {
    product: {
      findUnique: vi.fn(async () => EXISTING),
      update: vi.fn(async () => ({ ...EXISTING })),
    },
    subcategory: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) },
  };
  const svc = new ProductsService(
    prisma as never,
    { emit: vi.fn() } as never,
    { toUsdCents: async (v: string) => Number(v) * 100 } as never,
    { fieldMap: async () => new Map() } as never,
    noQuotas(),
    noTranslate(),
  );
  return { svc, prisma };
}

/** The `data` the update actually ran with. */
const dataOf = (prisma: { product: { update: { mock: { calls: unknown[][] } } } }) =>
  (prisma.product.update.mock.calls[0][0] as { data: Record<string, unknown> }).data;

describe('editing a moderated field returns a listing to the review queue', () => {
  for (const field of ['name', 'description', 'images', 'subcategoryId', 'attributes'] as const) {
    it(`re-queues when ${field} changes`, async () => {
      const { svc, prisma } = serviceFor();
      const patch: Record<string, unknown> = {
        name: 'Paraquat 24%',
        description: 'rewritten after approval',
        images: ['a.webp'],
        subcategoryId: null,
        attributes: { grade: 'A' },
      };
      await svc.update('p1', 'seller-1', { [field]: patch[field] } as never);
      expect(dataOf(prisma)).toMatchObject({ approved: false, status: 'pending' });
    });
  }

  it('leaves a published listing live when only the price changes', async () => {
    const { svc, prisma } = serviceFor();
    await svc.update('p1', 'seller-1', { price: '120' } as never);
    const data = dataOf(prisma);
    expect(data.approved).toBeUndefined();
    expect(data.status).toBeUndefined();
  });

  it('leaves a published listing live when only stock changes', async () => {
    const { svc, prisma } = serviceFor();
    await svc.update('p1', 'seller-1', { stockQty: 5 } as never);
    const data = dataOf(prisma);
    expect(data.approved).toBeUndefined();
    expect(data.status).toBeUndefined();
  });
});
