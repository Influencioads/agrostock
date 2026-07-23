import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminService } from '../src/admin/admin.module';

function serviceFor(role: string) {
  const prisma = {
    roleRequest: {
      findUnique: vi.fn(async () => ({
        id: 'rr1',
        userId: 'u1',
        role,
        status: 'pending',
      })),
      update: vi.fn(async () => ({ id: 'rr1', status: 'approved' })),
    },
    user: {
      findUnique: vi.fn(async () => ({ id: 'u1', name: 'Ada Worker', role: 'buyer', roles: [] })),
      update: vi.fn(async () => ({ id: 'u1' })),
    },
    worker: {
      upsert: vi.fn(async () => ({ id: 'w1' })),
    },
  };
  const audit = { log: vi.fn(async () => undefined) };
  const notifications = { create: vi.fn(async () => undefined) };
  return {
    svc: new AdminService(prisma as never, audit as never, {} as never, notifications as never),
    prisma,
  };
}

describe('AdminService role approval provisioning', () => {
  it('creates a worker profile when approving the worker role', async () => {
    const { svc, prisma } = serviceFor('worker');

    await svc.decideRoleRequest('rr1', 'approved', 'admin1');

    expect(prisma.worker.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: {},
      create: { userId: 'u1', name: 'Ada Worker', status: 'available' },
    });
  });

  it('does not provision domain records for rejected requests', async () => {
    const { svc, prisma } = serviceFor('worker');

    await svc.decideRoleRequest('rr1', 'rejected', 'admin1');

    expect(prisma.worker.upsert).not.toHaveBeenCalled();
  });

  it('rejects already-decided requests', async () => {
    const { svc, prisma } = serviceFor('worker');
    prisma.roleRequest.findUnique.mockResolvedValueOnce({ id: 'rr1', status: 'approved' });

    await expect(svc.decideRoleRequest('rr1', 'approved', 'admin1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
