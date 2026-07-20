import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { AdminService } from '../src/admin/admin.module';

function serviceForUsers() {
  const prisma = {
    user: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data, select }) => ({
        id: 'u1',
        name: data.name,
        email: data.email,
        role: data.role,
        roles: data.roles?.set ?? [],
        active: data.active,
        country: data.country,
        kycStatus: data.kycStatus,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        ...(select?.passwordHash ? { passwordHash: data.passwordHash } : {}),
      })),
      update: vi.fn(async ({ data, select }) => ({
        id: 'u1',
        name: 'Fresh User',
        email: 'fresh@example.com',
        role: 'buyer',
        roles: [],
        active: true,
        country: 'India',
        kycStatus: 'pending',
        ...(select?.passwordHash ? { passwordHash: data.passwordHash } : {}),
      })),
    },
  };
  const audit = { log: vi.fn(async () => undefined) };
  return { svc: new AdminService(prisma as never, audit as never, {} as never, {} as never), prisma, audit };
}

describe('AdminService user CRUD', () => {
  it('creates a user with a hashed password and no leaked passwordHash', async () => {
    const { svc, prisma, audit } = serviceForUsers();

    const out = await svc.createUser(
      {
        name: 'Fresh User',
        email: 'fresh@example.com',
        password: 'password123',
        role: 'seller',
        country: 'India',
        active: true,
      },
      'admin1',
    );

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe('password123');
    await expect(bcrypt.compare('password123', data.passwordHash)).resolves.toBe(true);
    expect(out).not.toHaveProperty('passwordHash');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin1', action: 'user.create', entityType: 'User', entityId: 'u1' }),
    );
  });

  it('rejects duplicate emails when creating a user', async () => {
    const { svc, prisma } = serviceForUsers();
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

    await expect(
      svc.createUser(
        { name: 'Fresh User', email: 'fresh@example.com', password: 'password123', role: 'buyer' },
        'admin1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not include admin accounts in the normal users list', async () => {
    const { svc, prisma } = serviceForUsers();

    await svc.users();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { not: 'admin' },
        }),
      }),
    );
  });

  it('changes the signed-in admin profile password with a new hash', async () => {
    const { svc, prisma, audit } = serviceForUsers();
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'admin1', role: 'admin', roles: [] });

    const out = await svc.updateOwnPassword('admin1', { password: 'newpass123' });

    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe('newpass123');
    await expect(bcrypt.compare('newpass123', data.passwordHash)).resolves.toBe(true);
    expect(out).not.toHaveProperty('passwordHash');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin1', action: 'admin.profile.password_update', entityType: 'User', entityId: 'admin1' }),
    );
  });
});
