import { describe, expect, it, vi } from 'vitest';
import { CommunityService } from '../src/community/community.service';

function serviceForCommunityI18n() {
  const group = {
    id: 'g1',
    slug: 'wheat',
    name: 'Wheat desk',
    description: 'Market updates',
    visibility: 'public',
    _count: { members: 3, messages: 0 },
  };
  const prisma = {
    communityGroup: {
      findMany: vi.fn(async () => [group]),
      findFirst: vi.fn(async () => group),
    },
    communityGroupTranslation: {
      upsert: vi.fn(async ({ create }) => create),
    },
  };
  const translation = {
    enabled: true,
    translateFields: vi.fn(async (row: typeof group, _fields: readonly string[], locale: string) => ({
      name: `${row.name}:${locale}`,
      description: `${row.description}:${locale}`,
    })),
  };
  return {
    svc: new CommunityService(
      prisma as never,
      { log: vi.fn() } as never,
      {} as never,
      translation as never,
    ),
    prisma,
    translation,
  };
}

describe('CommunityService i18n', () => {
  it('localizes public group names and descriptions for the requested locale', async () => {
    const { svc, prisma, translation } = serviceForCommunityI18n();

    const out = await svc.listGroups({}, 'ru');

    expect(translation.translateFields).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'g1', name: 'Wheat desk' }),
      ['name', 'description'],
      'ru',
    );
    expect(prisma.communityGroupTranslation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId_locale: { groupId: 'g1', locale: 'ru' } },
        create: expect.objectContaining({ groupId: 'g1', locale: 'ru', name: 'Wheat desk:ru' }),
      }),
    );
    expect(out[0]).toMatchObject({ name: 'Wheat desk:ru', description: 'Market updates:ru' });
  });

  it('localizes a single group read for an open chat room header', async () => {
    const { svc } = serviceForCommunityI18n();

    const out = await svc.getGroup(undefined, 'g1', 'hi');

    expect(out).toMatchObject({ name: 'Wheat desk:hi', description: 'Market updates:hi' });
  });
});
