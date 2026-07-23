import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AdminService } from '../src/admin/admin.module';

function service() {
  const prisma = {
    user: {
      findUnique: vi.fn(async () => ({ id: 'u1', name: 'Target User', role: 'buyer', roles: [] })),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async () => ({ id: 'u1' })),
      create: vi.fn(async () => ({ id: 'u2' })),
    },
    roleRequest: {
      findUnique: vi.fn(async () => ({ id: 'rr1', userId: 'u1', role: Role.admin, status: 'pending' })),
      update: vi.fn(async () => ({ id: 'rr1', status: 'approved' })),
    },
    worker: { upsert: vi.fn(async () => ({ id: 'w1' })), findUnique: vi.fn(async () => null), create: vi.fn() },
  };
  const audit = { log: vi.fn(async () => undefined) };
  const notifications = { create: vi.fn(async () => undefined) };
  return {
    svc: new AdminService(prisma as never, audit as never, {} as never, notifications as never),
    prisma,
  };
}

describe('admin privilege escalation containment (F18)', () => {
  it('users_manage cannot grant the admin role', async () => {
    const { svc, prisma } = service();
    await expect(svc.grantUserRole('u1', Role.admin, 'staff1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('users_manage cannot revoke the admin role', async () => {
    const { svc, prisma } = service();
    await expect(svc.revokeUserRole('u1', Role.admin, 'staff1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('users_manage cannot create a user with the admin role', async () => {
    const { svc, prisma } = service();
    await expect(
      svc.createUser({ email: 'evil@example.test', name: 'Evil', password: 'password-123', role: Role.admin }, 'staff1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('never approves an admin role request, even if one exists', async () => {
    const { svc, prisma } = service();
    await expect(svc.decideRoleRequest('rr1', 'approved', 'staff1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.roleRequest.update).not.toHaveBeenCalled();
  });

  it('still grants non-admin roles normally', async () => {
    const { svc, prisma } = service();
    await svc.grantUserRole('u1', Role.seller, 'staff1');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { roles: { push: Role.seller } } });
  });
});
