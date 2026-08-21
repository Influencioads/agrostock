import { describe, expect, it, vi } from 'vitest';
import { Prisma, WorkerTypeGroup } from '@prisma/client';
import { DirectoryService } from '../src/directory/directory.module';
import { canRoleSupplyGroup, WorkforceService } from '../src/workforce/workforce.module';
import { noQuotas } from './helpers/entitlements-stub';

function directory() {
  const prisma = { user: { findMany: vi.fn(async () => []) } };
  const text = { enabled: false, localizeMany: vi.fn() };
  return { svc: new DirectoryService(prisma as never, text as never), prisma };
}

const whereOf = (fn: { mock: { calls: unknown[][] } }) =>
  (fn.mock.calls[0][0] as { where: Prisma.UserWhereInput }).where;

/**
 * The privacy inversion this module exists for.
 *
 * The public worker directory used to list `Worker` crew rows, which published
 * the individual staff of every loading company — their names, ratings and
 * availability. A company's crew is its own people: what buyers browse now is
 * the KINDS of worker it supplies, and the roster stays private.
 *
 * These assert the predicate rather than rendered rows, because the leak was in
 * the query: a missing clause here republishes every crew member at once.
 */
describe('public worker directory excludes employed crew', () => {
  it('requires the worker to have no loading company', async () => {
    const { svc, prisma } = directory();

    await svc.workers({});

    const and = whereOf(prisma.user.findMany).AND as Prisma.UserWhereInput[];
    // A worker with no Worker row at all is still independent, so the null case
    // has to pass too — otherwise a self-registered worker vanishes.
    expect(and).toContainEqual({
      OR: [{ workerProfile: { is: null } }, { workerProfile: { is: { loadercoId: null } } }],
    });
  });

  it('lists accounts, never crew rows', async () => {
    const { svc, prisma } = directory();

    await svc.workers({});

    // The old implementation queried `prisma.worker`. If that ever comes back,
    // every loading company's staff is public again.
    expect(prisma.user.findMany).toHaveBeenCalled();
    expect(prisma).not.toHaveProperty('worker.findMany');
  });

  it('narrows to a worker type when one is picked', async () => {
    const { svc, prisma } = directory();

    await svc.workers({ workerType: 'forklift-operator' });

    const and = whereOf(prisma.user.findMany).AND as Prisma.UserWhereInput[];
    expect(and).toContainEqual({
      workerOfferings: { some: { isActive: true, workerType: { slug: 'forklift-operator' } } },
    });
  });
});

/**
 * Rate coherence — a money path, so it is checked rather than assumed.
 *
 * The rule is a relationship between fields, not a per-field one, which is why
 * it cannot live in the DTO: "a rate is required unless the basis is on_request"
 * needs both values at once.
 */
describe('WorkerOffering rate rules', () => {
  const svc = new WorkforceService({} as never, {} as never, noQuotas());
  // The guard is deliberately private — it is an invariant of this service, not
  // an API. Reaching in beats making it public purely to be testable.
  const check = (dto: Record<string, unknown>) =>
    (svc as unknown as { assertRateCoherent: (d: unknown) => void }).assertRateCoherent(dto);

  it('demands a rate when the basis is not on_request', () => {
    expect(() => check({ rateBasis: 'per_hour' })).toThrow(/Set a rate/);
  });

  it('allows on_request to carry no rate at all', () => {
    expect(() => check({ rateBasis: 'on_request' })).not.toThrow();
  });

  it('rejects a range that runs backwards', () => {
    expect(() => check({ rateBasis: 'per_day', rateMinCents: 9000, rateMaxCents: 4000 })).toThrow(/cannot be below/);
  });

  it('accepts a single figure and a well-ordered range', () => {
    expect(() => check({ rateBasis: 'per_hour', rateMinCents: 600 })).not.toThrow();
    expect(() => check({ rateBasis: 'per_day', rateMinCents: 4000, rateMaxCents: 9000 })).not.toThrow();
  });

  it('treats a zero rate as a real rate, not a missing one', () => {
    // `0` is falsy; a `!dto.rateMinCents` check here would demand a price for a
    // provider genuinely offering something free.
    expect(() => check({ rateBasis: 'per_hour', rateMinCents: 0 })).not.toThrow();
  });
});

/**
 * A loading company is the LOADING specialist.
 *
 * `loaderco` and `workerco` are not interchangeable: a loading company supplies
 * loading and material-handling crew and nothing else, while a worker company is
 * the general supplier. Without this gate a loading company could publish
 * harvest gangs and roasting operators — types it cannot staff — which a buyer
 * only discovers after enquiring.
 */
describe('labour role reach', () => {
  it('confines a loading company to loading and handling', () => {
    expect(canRoleSupplyGroup('loaderco', 'loading_handling')).toBe(true);
    for (const group of ['packing', 'sorting_grading', 'processing_line', 'warehouse', 'transport', 'field_to_gate'] as const) {
      expect(canRoleSupplyGroup('loaderco', group), `loaderco must not reach ${group}`).toBe(false);
    }
  });

  it('lets a worker company and an individual reach every group, loading included', () => {
    const groups = Object.values(WorkerTypeGroup);
    for (const group of groups) {
      expect(canRoleSupplyGroup('workerco', group), `workerco should reach ${group}`).toBe(true);
      expect(canRoleSupplyGroup('worker', group), `worker should reach ${group}`).toBe(true);
    }
    // Guards the overlap that makes a loading company the specialist case.
    expect(canRoleSupplyGroup('workerco', 'loading_handling')).toBe(true);
  });

  it('grants no reach at all to a role that does not supply labour', () => {
    for (const role of ['buyer', 'seller', 'transporter', 'admin']) {
      expect(canRoleSupplyGroup(role, 'loading_handling'), `${role} must not supply labour`).toBe(false);
    }
  });
});
