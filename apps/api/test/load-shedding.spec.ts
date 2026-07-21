import { describe, expect, it, vi } from 'vitest';
import { ContentTranslationWorker } from '../src/translation/content-translation.worker';
import { CommunityService } from '../src/community/community.service';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('production load shedding', () => {
  it('serializes translate-on-write jobs so bursts do not run concurrently', async () => {
    let active = 0;
    let maxActive = 0;
    const prisma = {
      product: {
        findUnique: vi.fn(async ({ where }) => ({
          id: where.id,
          name: `Product ${where.id}`,
          grade: null,
          origin: null,
          qty: null,
          moq: null,
          delivery: null,
          attributes: null,
          sourceHashes: null,
          category: { name: 'Fruit' },
          subcategory: { name: 'Mango' },
        })),
        update: vi.fn(async () => ({})),
      },
      productTranslation: { upsert: vi.fn(async () => ({})) },
    };
    const translation = {
      enabled: true,
      targets: ['hi'],
      unchanged: vi.fn(() => false),
      fieldHashes: vi.fn(() => ({ name: 'hash' })),
      translateAttributes: vi.fn(async () => null),
      translateFields: vi.fn(async (row: { name: string }) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await wait(20);
        active -= 1;
        return { name: `${row.name}:hi` };
      }),
    };
    const worker = new ContentTranslationWorker(prisma as never, translation as never);

    await Promise.all([worker.onProduct({ id: 'p1' }), worker.onProduct({ id: 'p2' })]);

    expect(maxActive).toBe(1);
    expect(prisma.productTranslation.upsert).toHaveBeenCalledTimes(2);
  });

  it('calculates community unread summary with grouped queries instead of per-room counts', async () => {
    const prisma = {
      communityGroupMember: {
        findMany: vi.fn(async () => [
          { groupId: 'g1', lastReadAt: new Date('2026-01-01T00:00:00Z') },
          { groupId: 'g2', lastReadAt: null },
        ]),
      },
      communityDirectThread: {
        findMany: vi.fn(async () => [
          { id: 't1', aId: 'u1', aLastReadAt: new Date('2026-01-02T00:00:00Z'), bLastReadAt: null },
          { id: 't2', aId: 'u2', aLastReadAt: null, bLastReadAt: null },
        ]),
      },
      communityMessage: {
        count: vi.fn(),
        groupBy: vi
          .fn()
          .mockResolvedValueOnce([{ groupId: 'g1', _count: { _all: 2 } }, { groupId: 'g2', _count: { _all: 3 } }])
          .mockResolvedValueOnce([{ threadId: 't1', _count: { _all: 4 } }]),
      },
    };
    const svc = new CommunityService(
      prisma as never,
      { log: vi.fn() } as never,
      {} as never,
      { enabled: false } as never,
    );

    await expect(svc.unreadSummary('u1')).resolves.toEqual({ groups: 5, dms: 4, total: 9 });
    expect(prisma.communityMessage.groupBy).toHaveBeenCalledTimes(2);
    expect(prisma.communityMessage.count).not.toHaveBeenCalled();
  });
});
