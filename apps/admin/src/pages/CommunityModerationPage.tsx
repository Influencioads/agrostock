import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import type { AdminCommunityGroup, AdminCommunityPost, AdminCommunityReport } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';

type Tab = 'feed' | 'groups' | 'reports' | 'analytics';

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <div className="text-2xl font-extrabold text-ink">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </Card>
  );
}

export function CommunityModerationPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('reports');
  const [newGroup, setNewGroup] = useState({ name: '', emoji: '', description: '' });

  const analytics = useQuery({ queryKey: ['community-analytics'], queryFn: () => api.community.admin.analytics() });
  const reports = useQuery({ queryKey: ['community-reports'], queryFn: () => api.community.admin.reports('open'), enabled: tab === 'reports' });
  const groups = useQuery({ queryKey: ['community-groups'], queryFn: () => api.community.admin.groups(), enabled: tab === 'groups' });
  const feed = useQuery({ queryKey: ['community-feed'], queryFn: () => api.community.admin.feed(), enabled: tab === 'feed' });
  const a = analytics.data;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['community-analytics'] });
    qc.invalidateQueries({ queryKey: ['community-reports'] });
    qc.invalidateQueries({ queryKey: ['community-groups'] });
    qc.invalidateQueries({ queryKey: ['community-feed'] });
  };

  const resolve = async (id: string, action: 'actioned' | 'dismissed') => {
    await api.community.admin.resolveReport(id, { action });
    invalidateAll();
  };
  const createGroup = useMutation({
    mutationFn: () => api.community.admin.createGroup(newGroup),
    onSuccess: () => {
      setNewGroup({ name: '', emoji: '', description: '' });
      invalidateAll();
    },
  });
  const deleteGroup = useMutation({ mutationFn: (id: string) => api.community.admin.deleteGroup(id), onSuccess: invalidateAll });
  const deletePost = useMutation({ mutationFn: (id: string) => api.community.admin.deletePost(id), onSuccess: invalidateAll });
  const pinPost = useMutation({ mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => api.community.admin.pinPost(id, pinned), onSuccess: invalidateAll });
  const banUser = useMutation({ mutationFn: (id: string) => api.community.admin.banUser(id), onSuccess: invalidateAll });

  const reportRows = (reports.data ?? []) as AdminCommunityReport[];
  const groupRows = (groups.data ?? []) as AdminCommunityGroup[];
  const feedRows = (feed.data ?? []) as AdminCommunityPost[];

  return (
    <div>
      <PageHeader title={t('page.community.title')} subtitle={t('page.community.subtitle')} action={<Badge tone="green">{t('apiBadge.live')}</Badge>} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric label={t('communityMod.metric.groups')} value={a?.groups ?? '—'} />
        <Metric label={t('communityMod.metric.posts')} value={a?.posts ?? '—'} />
        <Metric label={t('communityMod.metric.requirements')} value={a?.requirements ?? '—'} />
        <Metric label={t('communityMod.metric.messages')} value={a?.messages ?? '—'} />
        <Metric label={t('communityMod.metric.openReports')} value={a?.openReports ?? '—'} />
      </div>

      <div className="mb-4 flex gap-2">
        {(['reports', 'feed', 'groups', 'analytics'] as const).map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ' + (tab === tk ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')}
          >
            {t(`communityMod.tab.${tk}`)}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <Card padded={false}>
          <div className="border-b border-surface-border p-4 font-display font-bold text-ink">{t('communityMod.reported')}</div>
          <div className="divide-y divide-surface-border">
            {reportRows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="error">{r.targetType}</Badge>
                    <span className="text-sm font-semibold text-ink">{r.reason}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-soft">
                    {t('communityMod.reportedBy', { name: r.reporter?.name, id: r.targetId })}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.targetType === 'message' && (
                    <Button size="sm" variant="danger" leftIcon={<Icon name="x" size={14} />} onClick={() => api.community.admin.deleteMessage(r.targetId).then(() => resolve(r.id, 'actioned'))}>
                      {t('communityMod.delete')}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => resolve(r.id, 'actioned')}>
                    {t('communityMod.action')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolve(r.id, 'dismissed')}>
                    {t('communityMod.dismiss')}
                  </Button>
                </div>
              </div>
            ))}
            {reportRows.length === 0 && <p className="p-8 text-center text-sm text-ink-soft">{t('communityMod.noReports')}</p>}
          </div>
        </Card>
      )}

      {tab === 'feed' && (
        <Card padded={false}>
          <div className="border-b border-surface-border p-4 font-display font-bold text-ink">{t('communityMod.recentPosts')}</div>
          <div className="divide-y divide-surface-border">
            {feedRows.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {p.pinned && <Badge tone="gold">{t('communityMod.pinned')}</Badge>}
                    <span className="text-sm font-semibold text-ink">{p.author?.name}</span>
                    <span className="text-xs text-ink-soft">{t('communityMod.inGroup', { name: p.group?.name })}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => pinPost.mutate({ id: p.id, pinned: !p.pinned })}>
                    {p.pinned ? t('communityMod.unpin') : t('communityMod.pin')}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deletePost.mutate(p.id)}>
                    {t('communityMod.delete')}
                  </Button>
                  {p.author && (
                    <Button size="sm" variant="ghost" onClick={() => banUser.mutate(p.author!.id)}>
                      {t('communityMod.banAuthor')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {feedRows.length === 0 && <p className="p-8 text-center text-sm text-ink-soft">{t('communityMod.noPosts')}</p>}
          </div>
        </Card>
      )}

      {tab === 'groups' && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-2 font-display font-bold text-ink">{t('communityMod.createChannel')}</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input label={t('communityMod.fName')} value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} />
              <Input label={t('communityMod.fEmoji')} value={newGroup.emoji} onChange={(e) => setNewGroup({ ...newGroup, emoji: e.target.value })} />
              <Input label={t('communityMod.fDescription')} value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} />
            </div>
            <Button className="mt-3" disabled={!newGroup.name || createGroup.isPending} onClick={() => createGroup.mutate()}>
              {createGroup.isPending ? t('communityMod.creating') : t('communityMod.createBtn')}
            </Button>
          </Card>
          <Card padded={false}>
            <div className="border-b border-surface-border p-4 font-display font-bold text-ink">{t('communityMod.groupsCount', { count: groupRows.length })}</div>
            <div className="divide-y divide-surface-border">
              {groupRows.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      {g.emoji} {g.name} {g.isDefault && <Badge tone="info">{t('communityMod.default')}</Badge>}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {t('communityMod.groupStats', { members: g._count?.members ?? 0, posts: g._count?.posts ?? 0, messages: g._count?.messages ?? 0 })}
                    </div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => deleteGroup.mutate(g.id)}>
                    {t('communityMod.delete')}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'analytics' && (
        <Card>
          <h3 className="mb-3 font-display font-bold text-ink">{t('communityMod.glance')}</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-ink-soft">{t('communityMod.metric.groups')}</dt><dd className="font-display text-xl font-bold text-ink">{a?.groups ?? '—'}</dd></div>
            <div><dt className="text-ink-soft">{t('communityMod.metric.posts')}</dt><dd className="font-display text-xl font-bold text-ink">{a?.posts ?? '—'}</dd></div>
            <div><dt className="text-ink-soft">{t('communityMod.metric.messages')}</dt><dd className="font-display text-xl font-bold text-ink">{a?.messages ?? '—'}</dd></div>
            <div><dt className="text-ink-soft">{t('communityMod.metric.requirements')}</dt><dd className="font-display text-xl font-bold text-ink">{a?.requirements ?? '—'}</dd></div>
            <div><dt className="text-ink-soft">{t('communityMod.metric.openReports')}</dt><dd className="font-display text-xl font-bold text-ink">{a?.openReports ?? '—'}</dd></div>
          </dl>
        </Card>
      )}
    </div>
  );
}
