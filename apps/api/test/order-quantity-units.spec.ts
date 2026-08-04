import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../src/orders/orders.module';

/**
 * The buyer picks the metric they count in on the listing page; the price stays
 * quoted per the SELLER's unit. Every number the order stores has to be in that
 * seller unit, or a 500 KG order against a $1000/MT listing bills $500,000.
 */

/** A live listing priced per MT at $10.00, with `stockQty` units on hand. */
const listing = (stockQty: number | null) => ({
  id: 'p1', slug: 'x', status: 'live', approved: true, sellerId: 's1',
  isAuction: false, priceCents: 1000, unit: 'MT', stockQty, moq: null as string | null,
});

function serviceFor(product: ReturnType<typeof listing>) {
  // Shaped like ORDER_INCLUDE — the post-create notification reads the relations.
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...data, id: 'o1', sellerId: 's1', buyer: { name: 'Buyer' }, product: { name: 'Rice' },
  }));
  const executeRaw = vi.fn(async () => 1);
  const prisma = {
    order: { findUnique: vi.fn(async () => null), create },
    product: { findUnique: vi.fn(async () => product) },
    orderEvent: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ order: { create }, orderEvent: { create: vi.fn(async () => ({})) }, $executeRaw: executeRaw }),
    ),
  };
  const notifications = { create: vi.fn(async () => ({})) };
  const svc = new OrdersService(prisma as never, notifications as never, {} as never, {} as never);
  return { svc, create, executeRaw };
}

describe('order quantity units', () => {
  it('converts the buyer metric into the listing unit before pricing', async () => {
    const { svc, create } = serviceFor(listing(null));

    await svc.place('b1', { productSlug: 'x', qty: 500, unit: 'KG' });

    const { data } = create.mock.calls[0][0] as { data: Record<string, unknown> };
    // 500 KG = 0.5 MT × $10.00/MT = $5.00 — not 500 × $10.00.
    expect(data.qtyValue).toBe(0.5);
    expect(data.qtyUnit).toBe('MT');
    expect(data.amountCents).toBe(500);
    expect(data.qty).toBe('0.5 MT');
  });

  it('leaves a quantity in the listing unit alone', async () => {
    const { svc, create } = serviceFor(listing(null));

    await svc.place('b1', { productSlug: 'x', qty: 3 });

    const { data } = create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data.qtyValue).toBe(3);
    expect(data.amountCents).toBe(3000);
  });

  it('reserves whole units, rounding a fraction UP so stock can never oversell', async () => {
    const { svc, executeRaw } = serviceFor(listing(10));

    await svc.place('b1', { productSlug: 'x', qty: 400, unit: 'KG' }); // 0.4 MT

    // Tagged-template call: the interpolated values are the 2nd argument onward.
    expect(executeRaw.mock.calls[0].slice(1)).toContain(1);
  });

  it('refuses a metric that cannot be converted to the listing unit', async () => {
    const { svc } = serviceFor({ ...listing(null), unit: 'BAG' });

    await expect(svc.place('b1', { productSlug: 'x', qty: 5, unit: 'KG' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses fractional quantities for count-based listing units', async () => {
    const { svc } = serviceFor({ ...listing(null), unit: 'BAG' });

    await expect(svc.place('b1', { productSlug: 'x', qty: 0.5, unit: 'BAG' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a quantity below the listing minimum, in whatever metric it is typed', async () => {
    const { svc } = serviceFor({ ...listing(null), moq: '25 MT' });

    await expect(svc.place('b1', { productSlug: 'x', qty: 10 })).rejects.toBeInstanceOf(BadRequestException);
    // 10,000 KG = 10 MT — under the minimum once restated in the listing's unit.
    await expect(svc.place('b1', { productSlug: 'x', qty: 10_000, unit: 'KG' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a quantity exactly at the minimum', async () => {
    const { svc, create } = serviceFor({ ...listing(null), moq: '25 MT' });

    await svc.place('b1', { productSlug: 'x', qty: 25 });

    expect((create.mock.calls[0][0] as { data: { qtyValue: number } }).data.qtyValue).toBe(25);
  });

  it('reads the minimum in the listing unit when the stored string carries none', async () => {
    // A per-KG listing with a bare "500" means 500 KG, not 500 MT.
    const { svc } = serviceFor({ ...listing(null), unit: 'KG', moq: '500' });

    await expect(svc.place('b1', { productSlug: 'x', qty: 100 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.place('b1', { productSlug: 'x', qty: 1, unit: 'MT' })).resolves.toBeTruthy();
  });
});
