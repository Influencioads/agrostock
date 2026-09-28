import { describe, expect, it, vi } from 'vitest';
import { AdminService } from '../src/admin/admin.module';

describe('AdminService markets', () => {
  it('stores name, city and country trimmed so the place filter matches its facet', async () => {
    const prisma = {
      market: {
        create: vi.fn(async () => ({ id: 'm1' })),
        findUnique: vi.fn(async () => ({ id: 'm1' })),
        update: vi.fn(async () => ({ id: 'm1' })),
      },
    };
    const svc = new AdminService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never);

    await svc.createMarket({ name: ' Azadpur ', city: 'Delhi ', country: ' India', address: ' Gate 3 ' });
    expect(prisma.market.create.mock.calls[0][0]).toMatchObject({
      data: { name: 'Azadpur', city: 'Delhi', country: 'India', address: ' Gate 3 ' },
    });

    await svc.updateMarket('m1', { city: 'Mumbai ' });
    expect(prisma.market.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { city: 'Mumbai' } });
  });
});
