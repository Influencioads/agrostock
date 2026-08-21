import { describe, expect, it, vi } from 'vitest';
import { DirectoryService } from '../src/directory/directory.module';
import { HiresService } from '../src/hires/hires.module';

/**
 * An order-linked hire must arrive routed and the provider lists must be narrowed
 * to that route. Both used to be blank/global: the seller retyped From/To/Cargo per
 * provider and picked from the first 24 providers on the platform.
 */

// ── the directory's `serves` filter ──────────────────────────────

function directoryService() {
  const prisma = {
    user: { findMany: vi.fn(async () => []) },
    worker: { findMany: vi.fn(async () => []) },
  };
  const text = { localizeMany: vi.fn(async (v: string[]) => v) };
  return { svc: new DirectoryService(prisma as never, text as never), prisma };
}

/** Every leaf predicate inside a nested where clause, flattened. */
function leaves(node: unknown): Record<string, unknown>[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(leaves);
  const obj = node as Record<string, unknown>;
  const nested = ['OR', 'AND', 'NOT'].filter((k) => k in obj);
  if (!nested.length) return [obj];
  return nested.flatMap((k) => leaves(obj[k]));
}

describe('directory serves filter', () => {
  it('matches either leg of a route across origin, operating and supplying tags', async () => {
    const { svc, prisma } = directoryService();

    await svc.transporters({ servesCity: 'Mundra,Dubai' });

    const where = prisma.user.findMany.mock.calls[0][0].where;
    // The clause lives under AND: `serves` carries its own OR, and a bare
    // `profileWhere.OR` would collide with the threshold filters.
    const clause = (where.profile.AND as unknown[]).find((c) => 'OR' in (c as object));
    expect(clause).toBeDefined();
    const preds = leaves(clause);

    for (const city of ['Mundra', 'Dubai']) {
      expect(preds).toContainEqual({ originCity: { contains: city, mode: 'insensitive' } });
      expect(preds.some((p) => 'operatingCities' in p && String(JSON.stringify(p)).includes(city))).toBe(true);
      expect(preds.some((p) => 'supplyingCities' in p && String(JSON.stringify(p)).includes(city))).toBe(true);
    }
    // A provider who declared no areas is unrestricted, not excluded.
    expect(preds).toContainEqual({ operatingCities: { isEmpty: true } });
    expect(preds).toContainEqual({ originCity: null });
  });

  it('is absent when no route is given, so plain browsing is unchanged', async () => {
    const { svc, prisma } = directoryService();
    await svc.transporters({});
    const where = prisma.user.findMany.mock.calls[0][0].where;
    // listApproved is the only profile constraint a bare transporter list carries.
    expect(where.profile).toEqual({ listApproved: true });
  });

  // Workers are ACCOUNTS in the public directory now, not `Worker` crew rows, so
  // their areas and thresholds come off the shared `Profile` the other provider
  // types already use — including the supplying* columns a crew row never had.
  it('keeps the worker minWorkHours threshold when a route filter is also applied', async () => {
    const { svc, prisma } = directoryService();

    await svc.workers({ servesCity: 'Mundra', minWorkHours: '8' });

    const where = prisma.user.findMany.mock.calls[0][0].where;
    // The role match owns the top-level OR; everything else has to go under AND.
    // Unfiltered, the labour directory holds worker COMPANIES and individuals,
    // so the role match covers both. Loading companies have their own list.
    expect(where.OR).toEqual([
      { role: 'workerco' },
      { roles: { has: 'workerco' } },
      { role: 'worker' },
      { roles: { has: 'worker' } },
    ]);
    const preds = leaves(where.profile);
    expect(preds).toContainEqual({ minWorkHours: null });
    expect(preds).toContainEqual({ minWorkHours: { lte: 8 } });
    expect(preds).toContainEqual({ originCity: { contains: 'Mundra', mode: 'insensitive' } });
    // Employed crew stay private no matter what else is filtered on.
    expect(where.AND).toContainEqual({
      OR: [{ workerProfile: { is: null } }, { workerProfile: { is: { loadercoId: null } } }],
    });
  });
});

// ── the hire's route, derived server-side ────────────────────────

const ORDER = {
  id: 'o1',
  sellerId: 'seller1',
  qty: '50 MT',
  deliveryCity: 'Dubai',
  deliveryCountry: 'United Arab Emirates',
  product: { name: 'Basmati Rice', city: 'Mundra', country: 'India' },
  seller: { country: 'India' },
  buyer: { country: 'United Arab Emirates' },
};

function hiresService(order: Record<string, unknown> | null = ORDER) {
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    ...data,
    id: 'h1',
    requester: { name: 'Seller One' },
    targetUser: { id: 't1', name: 'SwiftHaul' },
  }));
  const prisma = {
    hireRequest: { findUnique: vi.fn(async () => null), create },
    user: { findFirst: vi.fn(async () => ({ id: 't1', role: 'transporter', roles: [] })) },
    order: { findUnique: vi.fn(async () => order) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ hireRequest: { create } })),
  };
  const noop = { notify: vi.fn(), create: vi.fn(), debit: vi.fn(), localizeRows: vi.fn(async (r: unknown) => r) };
  return { svc: new HiresService(prisma as never, noop as never, noop as never, noop as never, noop as never), create };
}

describe('order-linked hire', () => {
  it('fills the route and cargo from the order when the form sends none', async () => {
    const { svc, create } = hiresService();

    await svc.create({ id: 'seller1' } as never, {
      targetType: 'transporter',
      targetUserId: 't1',
      orderId: 'o1',
    } as never);

    expect(create.mock.calls[0][0].data).toMatchObject({
      fromCity: 'Mundra',
      toCity: 'Dubai',
      cargo: 'Basmati Rice · 50 MT',
      // Loading crew work at the pickup point.
      location: 'Mundra',
    });
  });

  it('never overrides what the seller typed', async () => {
    const { svc, create } = hiresService();

    await svc.create({ id: 'seller1' } as never, {
      targetType: 'transporter',
      targetUserId: 't1',
      orderId: 'o1',
      fromCity: 'Kandla',
      toCity: 'Jebel Ali',
    } as never);

    expect(create.mock.calls[0][0].data).toMatchObject({ fromCity: 'Kandla', toCity: 'Jebel Ali' });
  });

  it('falls back to countries when neither the listing nor the buyer named a city', async () => {
    const { svc, create } = hiresService({
      ...ORDER,
      deliveryCity: null,
      product: { name: 'Basmati Rice', city: null, country: null },
    });

    await svc.create({ id: 'seller1' } as never, {
      targetType: 'transporter',
      targetUserId: 't1',
      orderId: 'o1',
    } as never);

    expect(create.mock.calls[0][0].data).toMatchObject({
      fromCity: 'India',
      toCity: 'United Arab Emirates',
    });
  });

  it('leaves a hire with no order blank — there is nothing to derive from', async () => {
    const { svc, create } = hiresService(null);

    await svc.create({ id: 'seller1' } as never, { targetType: 'transporter', targetUserId: 't1' } as never);

    expect(create.mock.calls[0][0].data).toMatchObject({ fromCity: null, toCity: null, cargo: null, location: null });
  });
});
