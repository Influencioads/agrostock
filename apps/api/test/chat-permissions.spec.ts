import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportService } from '../src/support/support.service';
import { CommunityService } from '../src/community/community.service';
import type { AuthUser } from '../src/auth/current-user.decorator';

/**
 * DB-free unit coverage for the security-critical access rules of BOTH chat
 * systems (a mocked Prisma stands in for the database). The full realtime
 * round-trip lives in chat.integration.spec.ts (needs a live Postgres).
 */

const audit = { log: vi.fn() };
const translation = { enabled: false };
const user = (id: string, roles: string[] = ['buyer'], adminPermissions: string[] = []): AuthUser =>
  ({ id, email: `${id}@x.dev`, name: id, role: roles[0], roles, adminPermissions } as unknown as AuthUser);

describe('Live Support — ticket access (IDOR guard)', () => {
  function svc(ticket: unknown) {
    const prisma = { supportTicket: { findUnique: vi.fn(async () => ticket) } };
    return new SupportService(prisma as never, audit as never);
  }

  it('404s when the ticket does not exist', async () => {
    await expect(svc(null).assertCanView(user('u1'), 't1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids a different, non-staff user from reading the ticket', async () => {
    const s = svc({ id: 't1', userId: 'owner' });
    await expect(s.assertCanView(user('intruder'), 't1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the ticket owner', async () => {
    const s = svc({ id: 't1', userId: 'owner' });
    await expect(s.assertCanView(user('owner'), 't1')).resolves.toMatchObject({ id: 't1' });
  });

  it('allows a support agent (admin + support_agent) on any ticket', async () => {
    const s = svc({ id: 't1', userId: 'owner' });
    await expect(s.assertCanView(user('agent', ['admin'], ['support_agent']), 't1')).resolves.toMatchObject({ id: 't1' });
  });

  it('allows a super-admin (staff_manage) on any ticket', async () => {
    const s = svc({ id: 't1', userId: 'owner' });
    await expect(s.assertCanView(user('boss', ['admin'], ['staff_manage']), 't1')).resolves.toMatchObject({ id: 't1' });
  });

  it('F17: forbids an admin WITHOUT support_agent from reading a stranger\'s ticket', async () => {
    const s = svc({ id: 't1', userId: 'owner' });
    await expect(s.assertCanView(user('kycadmin', ['admin'], ['kyc']), 't1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Community — private group message access', () => {
  function svc(opts: { group: unknown; member?: unknown; messages?: unknown[] }) {
    const prisma = {
      communityGroup: { findFirst: vi.fn(async () => opts.group) },
      communityGroupMember: { findUnique: vi.fn(async () => opts.member ?? null) },
      communityMessage: { findMany: vi.fn(async () => opts.messages ?? []) },
      communityUserBlock: { findMany: vi.fn(async () => []) },
    };
    return new CommunityService(prisma as never, audit as never, {} as never, translation as never);
  }

  it('404s for an unknown group', async () => {
    const s = svc({ group: null });
    await expect(s.getGroupMessages(user('u1'), 'g1', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids a guest from reading a private group', async () => {
    const s = svc({ group: { id: 'g1', visibility: 'private' } });
    await expect(s.getGroupMessages(undefined, 'g1', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids a non-member from reading a private group', async () => {
    const s = svc({ group: { id: 'g1', visibility: 'private' }, member: null });
    await expect(s.getGroupMessages(user('outsider'), 'g1', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets anyone read a public group', async () => {
    const s = svc({ group: { id: 'g1', visibility: 'public' }, messages: [] });
    await expect(s.getGroupMessages(undefined, 'g1', {})).resolves.toEqual([]);
  });
});
