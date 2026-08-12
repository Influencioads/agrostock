import { describe, expect, it, vi } from 'vitest';
import { DirectoryService } from '../src/directory/directory.module';
import { Prisma } from '@prisma/client';

function serviceForDirectory() {
  const prisma = {
    user: { findMany: vi.fn(async () => []) },
    worker: { findMany: vi.fn(async () => []) },
  };
  // Translation is off in these specs — they assert the `where` clause, not the
  // rendered rows.
  const text = { enabled: false, localizeMany: vi.fn() };
  return { svc: new DirectoryService(prisma as never, text as never), prisma };
}

const whereOf = (fn: { mock: { calls: unknown[][] } }) =>
  (fn.mock.calls[0][0] as { where: Prisma.UserWhereInput }).where;

describe('DirectoryService multi-select facets', () => {
  it('ORs several countries under AND, leaving the role match intact', async () => {
    const { svc, prisma } = serviceForDirectory();

    await svc.transporters({ country: 'India,Turkey' });

    const where = whereOf(prisma.user.findMany);
    // The role match owns the top-level OR. A second one there would have
    // replaced it and returned every user on the platform.
    expect(where.OR).toEqual([{ role: 'transporter' }, { roles: { has: 'transporter' } }]);
    expect(where.AND).toEqual([
      {
        OR: [
          { country: { contains: 'India', mode: 'insensitive' } },
          { country: { contains: 'Turkey', mode: 'insensitive' } },
        ],
      },
    ]);
  });

  it('keeps the plain contains for a single country', async () => {
    const { svc, prisma } = serviceForDirectory();

    await svc.sellers({ country: 'India' });

    const where = whereOf(prisma.user.findMany);
    expect(where.country).toEqual({ contains: 'India', mode: 'insensitive' });
    expect(where.AND).toBeUndefined();
  });

  it('widens the operating/supplying tag match to hasSome across several picks', async () => {
    const { svc, prisma } = serviceForDirectory();

    await svc.transporters({ operatingCountry: 'India,Oman', supplyingCountry: 'UAE' });

    const profile = whereOf(prisma.user.findMany).profile as Prisma.ProfileWhereInput;
    expect(profile.operatingCountries).toEqual({ hasSome: ['India', 'Oman'] });
    // One value is still a plain `has` — the same query it always was.
    expect(profile.supplyingCountries).toEqual({ has: 'UAE' });
  });

  it('selects several market slugs at once', async () => {
    const { svc, prisma } = serviceForDirectory();

    await svc.sellers({ market: 'kandla,mundra' });

    const profile = whereOf(prisma.user.findMany).profile as Prisma.ProfileWhereInput;
    expect(profile.market).toEqual({ slug: { in: ['kandla', 'mundra'] } });
  });

  it('ORs worker availability across the ticked states and ignores unknown ones', async () => {
    const { svc, prisma } = serviceForDirectory();

    await svc.workers({ status: 'available,on_site,bogus' });

    const where = (prisma.worker.findMany.mock.calls[0][0] as { where: Prisma.WorkerWhereInput }).where;
    expect(where.status).toEqual({ in: ['available', 'on_site'] });
  });

  it('matches a worker against any of several countries', async () => {
    const { svc, prisma } = serviceForDirectory();

    await svc.workers({ country: 'India,Nepal' });

    const where = (prisma.worker.findMany.mock.calls[0][0] as { where: Prisma.WorkerWhereInput }).where;
    expect(where.user).toEqual({
      OR: [
        { country: { contains: 'India', mode: 'insensitive' } },
        { country: { contains: 'Nepal', mode: 'insensitive' } },
      ],
    });
  });
});
