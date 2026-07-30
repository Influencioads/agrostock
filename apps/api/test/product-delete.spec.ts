import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.module';

const fkViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
    code: 'P2003',
    clientVersion: 'test',
  });

const ARCHIVE = { where: { id: 'p1' }, data: { status: 'archived', approved: false } };

function serviceFor(opts: {
  counts?: { orders: number; reviews: number; buyerBids: number };
  onDelete?: () => Promise<unknown>;
}) {
  const product = { id: 'p1', sellerId: 'seller1' };
  const counts = opts.counts ?? { orders: 0, reviews: 0, buyerBids: 0 };
  const prisma = {
    product: {
      // `owned()` reads the row; `remove()` then re-reads it for the relation counts.
      findUnique: vi
        .fn()
        .mockResolvedValueOnce(product)
        .mockResolvedValue({ _count: counts }),
      delete: vi.fn(opts.onDelete ?? (async () => product)),
      update: vi.fn(async () => product),
    },
  };
  return { svc: new ProductsService(prisma as never, {} as never, {} as never, {} as never), prisma };
}

describe('ProductsService.remove', () => {
  it('hard-deletes a pristine listing', async () => {
    const { svc, prisma } = serviceFor({});

    await expect(svc.remove('p1', 'seller1')).resolves.toEqual({ ok: true });

    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('archives a listing with orders instead of orphaning them', async () => {
    // Order.productId is SET NULL, so a hard delete here would "succeed" while
    // severing the buyer's order from the product it refers to.
    const { svc, prisma } = serviceFor({ counts: { orders: 2, reviews: 0, buyerBids: 0 } });

    await expect(svc.remove('p1', 'seller1')).resolves.toEqual({ ok: true });

    expect(prisma.product.delete).not.toHaveBeenCalled();
    expect(prisma.product.update).toHaveBeenCalledWith(ARCHIVE);
  });

  it('archives rather than failing when a RESTRICT relation blocks the delete', async () => {
    // AuctionBid / AuctionAutoBid / AdCampaign are RESTRICT. This is the reported
    // bug: the FK error used to reach the seller as a 500.
    const { svc, prisma } = serviceFor({
      onDelete: async () => {
        throw fkViolation();
      },
    });

    await expect(svc.remove('p1', 'seller1')).resolves.toEqual({ ok: true });

    expect(prisma.product.update).toHaveBeenCalledWith(ARCHIVE);
  });

  it("refuses to touch another seller's listing", async () => {
    const { svc, prisma } = serviceFor({});

    await expect(svc.remove('p1', 'someone-else')).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.product.delete).not.toHaveBeenCalled();
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('still surfaces failures that are not FK violations', async () => {
    const { svc, prisma } = serviceFor({
      onDelete: async () => {
        throw new Error('connection lost');
      },
    });

    await expect(svc.remove('p1', 'seller1')).rejects.toThrow('connection lost');

    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});
