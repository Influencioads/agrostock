import { describe, expect, it, vi } from 'vitest';
import { CommunityService } from '../src/community/community.service';

/** My Chats must list real conversations only — no empty seeded groups. */
describe('community my chats', () => {
  it('returns joined groups that have messages plus DM threads, newest first', async () => {
    const prisma = {
      communityGroupMember: {
        findMany: vi.fn(async () => [
          {
            groupId: 'g1',
            role: 'member',
            lastReadAt: null,
            group: {
              id: 'g1',
              name: 'General Agriculture',
              description: null,
              emoji: '🌱',
              _count: { members: 4 },
              translations: [],
              messages: [{ createdAt: new Date('2026-01-01T00:00:00Z') }],
            },
          },
        ]),
      },
      communityDirectThread: {
        findMany: vi.fn(async () => [
          {
            id: 't1',
            aId: 'u1',
            bId: 'u2',
            lastMessageAt: new Date('2026-02-01T00:00:00Z'),
            aLastReadAt: null,
            bLastReadAt: null,
            a: { id: 'u1', name: 'Me' },
            b: { id: 'u2', name: 'Seller Bob' },
          },
        ]),
      },
      communityUserBlock: { findMany: vi.fn(async () => []) },
      communityMessage: {
        groupBy: vi
          .fn()
          .mockResolvedValueOnce([{ groupId: 'g1', _count: { _all: 2 } }])
          .mockResolvedValueOnce([{ threadId: 't1', _count: { _all: 1 } }]),
      },
    };
    const svc = new CommunityService(
      prisma as never,
      { log: vi.fn() } as never,
      {} as never,
      { enabled: false } as never,
    );

    const chats = (await svc.myChats('u1')) as Record<string, unknown>[];

    expect(chats.map((c) => [c.chatKind, c.name, c.unread])).toEqual([
      ['dm', 'Seller Bob', 1],
      ['group', 'General Agriculture', 2],
    ]);
    // Empty groups are filtered in the query, not after it.
    expect(prisma.communityGroupMember.findMany.mock.calls[0][0].where.group.messages).toEqual({
      some: { deletedAt: null },
    });
  });
});
