import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { AdminService } from '../src/admin/admin.module';

function serviceForUsers() {
  const deleteMany = () => ({ deleteMany: vi.fn(async () => ({ count: 0 })) });
  const prisma = {
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    roleRequest: deleteMany(),
    communityMessageReaction: deleteMany(),
    communitySavedPost: deleteMany(),
    communityGroupMember: deleteMany(),
    notification: deleteMany(),
    deviceToken: deleteMany(),
    refreshSession: { deleteMany: vi.fn(async () => ({ count: 0 })), updateMany: vi.fn(async () => ({ count: 0 })) },
    profile: deleteMany(),
    wallet: deleteMany(),
    user: {
      delete: vi.fn(async () => ({ id: 'u1' })),
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

  it('matches secondary roles when filtering the users list by role', async () => {
    const { svc, prisma } = serviceForUsers();

    await svc.users('seller');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { not: 'admin' },
          AND: [{ OR: [{ role: 'seller' }, { roles: { has: 'seller' } }] }],
        }),
      }),
    );
  });

  const cleanFootprint = { _count: { products: 0, buyerOrders: 0, sellerOrders: 0 }, wallet: null };

  it('hard-deletes a user with no business records and audits it', async () => {
    const { svc, prisma, audit } = serviceForUsers();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', role: 'buyer', roles: [] }) // requireUser
      .mockResolvedValueOnce(cleanFootprint); // footprint check

    await expect(svc.deleteUser('u1', 'admin1')).resolves.toEqual({ ok: true });

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(prisma.profile.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin1', action: 'user.delete', entityId: 'u1' }),
    );
  });

  it('refuses to delete (409) a user that has trade records — never orphaning them', async () => {
    const { svc, prisma } = serviceForUsers();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', role: 'seller', roles: [] })
      .mockResolvedValueOnce({ _count: { products: 3, buyerOrders: 0 }, wallet: null });

    await expect(svc.deleteUser('u1', 'admin1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses to delete (409) a user whose wallet holds a balance or ledger history', async () => {
    const { svc, prisma } = serviceForUsers();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', role: 'buyer', roles: [] })
      .mockResolvedValueOnce({ _count: { products: 0 }, wallet: { balanceCents: 500, _count: { txns: 0 } } });

    await expect(svc.deleteUser('u1', 'admin1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('returns 409 as a backstop when an unforeseen FK constraint blocks the delete', async () => {
    const { svc, prisma } = serviceForUsers();
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', role: 'seller', roles: [] })
      .mockResolvedValueOnce(cleanFootprint);
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('FK'), { code: 'P2003' }));

    await expect(svc.deleteUser('u1', 'admin1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to delete yourself or staff accounts', async () => {
    const { svc, prisma } = serviceForUsers();

    await expect(svc.deleteUser('admin1', 'admin1')).rejects.toBeInstanceOf(BadRequestException);

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u2', role: 'admin', roles: [] });
    await expect(svc.deleteUser('u2', 'admin1')).rejects.toBeInstanceOf(BadRequestException);

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u3', role: 'buyer', roles: ['admin'] });
    await expect(svc.deleteUser('u3', 'admin1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('changes the signed-in admin profile password with a new hash after verifying the current one', async () => {
    const { svc, prisma, audit } = serviceForUsers();
    const currentHash = await bcrypt.hash('oldpass123', 10);
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'admin1', role: 'admin', roles: [], passwordHash: currentHash });

    const out = await svc.updateOwnPassword('admin1', { currentPassword: 'oldpass123', password: 'newpass123' });

    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe('newpass123');
    await expect(bcrypt.compare('newpass123', data.passwordHash)).resolves.toBe(true);
    expect(out).not.toHaveProperty('passwordHash');
    // API-16: sessions revoked on change.
    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'admin1', revokedAt: null }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin1', action: 'admin.profile.password_update', entityType: 'User', entityId: 'admin1' }),
    );
  });

  it('rejects an admin password change when the current password is wrong (API-16)', async () => {
    const { svc, prisma } = serviceForUsers();
    const currentHash = await bcrypt.hash('oldpass123', 10);
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'admin1', role: 'admin', roles: [], passwordHash: currentHash });

    await expect(
      svc.updateOwnPassword('admin1', { currentPassword: 'wrong', password: 'newpass123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
