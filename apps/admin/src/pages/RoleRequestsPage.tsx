import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Input, type BadgeTone } from '@agrotraders/ui';
import type { ApiRoleRequest } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warn',
  approved: 'green',
  rejected: 'error',
};

const FILTERS = ['pending', 'approved', 'rejected', 'all'] as const;

/** Approve or reject users' requests for additional dashboards/roles. */
export function RoleRequestsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('pending');
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);

  const { data: requests = [], isLoading } = useQuery<ApiRoleRequest[]>({
    queryKey: ['admin-role-requests', filter],
    queryFn: () => api.admin.roleRequests(filter),
    retry: 1,
  });

  const decide = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'approved' | 'rejected'; note?: string }) =>
      api.admin.decideRoleRequest(id, status, note),
    onSuccess: () => {
      setRejecting(null);
      void qc.invalidateQueries({ queryKey: ['admin-role-requests'] });
      void qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div>
      <PageHeader
        title={t('nav.roleRequests')}
        subtitle={t('roleReq.sub')}
        action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>}
      />

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' +
              (filter === f ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')
            }
          >
            {t(`roleReq.filter.${f}`)}
          </button>
        ))}
      </div>

      <Card padded={false}>
        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('common:loading')}</p>
        ) : requests.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('roleReq.none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">{t('roleReq.colUser')}</th>
                  <th className="px-5 py-3">{t('roleReq.colRole')}</th>
                  <th className="px-5 py-3">{t('roleReq.colNote')}</th>
                  <th className="px-5 py-3">{t('roleReq.colStatus')}</th>
                  <th className="px-5 py-3">{t('roleReq.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-surface-border/70 last:border-0 align-top">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">{r.user?.name}</div>
                      <div className="text-xs text-ink-soft">{r.user?.email}</div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-ink">{t(`enums:role.${r.role}`, { defaultValue: r.role })}</td>
                    <td className="max-w-[220px] px-5 py-3 text-ink-soft">{r.note || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[r.status] ?? 'slate'}>{t(`roleReq.filter.${r.status}`, { defaultValue: r.status })}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {r.status === 'pending' ? (
                        rejecting?.id === r.id ? (
                          <div className="flex flex-col gap-2">
                            <Input
                              placeholder={t('roleReq.reasonPlaceholder')}
                              value={rejecting.reason}
                              onChange={(e) => setRejecting({ id: r.id, reason: e.target.value })}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={decide.isPending}
                                onClick={() => decide.mutate({ id: r.id, status: 'rejected', note: rejecting.reason })}
                              >
                                {t('roleReq.confirmReject')}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                                {t('common:cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={decide.isPending}
                              onClick={() => decide.mutate({ id: r.id, status: 'approved' })}
                            >
                              {t('roleReq.approve')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRejecting({ id: r.id, reason: '' })}>
                              {t('roleReq.reject')}
                            </Button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-ink-soft">{t('roleReq.decided')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
