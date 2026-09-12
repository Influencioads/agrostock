import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';
import { noQuotas } from './helpers/entitlements-stub';
import { noTranslate } from './helpers/text-translation-stub';

/**
 * App Store Guideline 1.2 requires a way to block abusive users, and blocking
 * only means something if their content actually disappears. The community feed
 * already filtered blocked authors; the catalog did not, so a blocked seller's
 * listings kept showing up in browse. These specs pin the fix.
 */

function serviceFor(blocks: { blockerId: string; blockedId: string }[] = []) {
  const prisma = {
    product: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
    subcategory: { findMany: vi.fn(async () => []), findUnique: vi.fn(async () => null) },
    communityUserBlock: { findMany: vi.fn(async () => blocks) },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return {
    svc: new ProductsService(prisma as never, {} as never, {} as never, { fieldMap: async () => new Map() } as never, noQuotas(), noTranslate()),
    prisma,
  };
}

/** The `where` the catalog query actually ran with. */
const whereOf = (prisma: { product: { findMany: { mock: { calls: unknown[][] } } } }) =>
  (prisma.product.findMany.mock.calls[0][0] as { where: Record<string, unknown> }).where;

describe('blocked sellers disappear from the catalog (Guideline 1.2)', () => {
  it('excludes a seller the viewer blocked', async () => {
    const { svc, prisma } = serviceFor([{ blockerId: 'me', blockedId: 'rude-seller' }]);
    await svc.findAll({}, 'en', 'me');
    expect(whereOf(prisma).sellerId).toEqual({ notIn: ['rude-seller'] });
  });

  it('excludes a seller who blocked the viewer — blocking cuts both ways', async () => {
    const { svc, prisma } = serviceFor([{ blockerId: 'rude-seller', blockedId: 'me' }]);
    await svc.findAll({}, 'en', 'me');
    expect(whereOf(prisma).sellerId).toEqual({ notIn: ['rude-seller'] });
  });

  it('collapses duplicates when a block exists in both directions', async () => {
    const { svc, prisma } = serviceFor([
      { blockerId: 'me', blockedId: 'x' },
      { blockerId: 'x', blockedId: 'me' },
    ]);
    await svc.findAll({}, 'en', 'me');
    expect(whereOf(prisma).sellerId).toEqual({ notIn: ['x'] });
  });

  it('leaves the query untouched for a guest — there is nobody to have blocks', async () => {
    const { svc, prisma } = serviceFor([{ blockerId: 'me', blockedId: 'x' }]);
    await svc.findAll({}, 'en');
    expect(whereOf(prisma).sellerId).toBeUndefined();
    expect(prisma.communityUserBlock.findMany).not.toHaveBeenCalled();
  });

  it('adds no clause when a signed-in viewer has blocked nobody', async () => {
    const { svc, prisma } = serviceFor([]);
    await svc.findAll({}, 'en', 'me');
    expect(whereOf(prisma).sellerId).toBeUndefined();
  });
});
