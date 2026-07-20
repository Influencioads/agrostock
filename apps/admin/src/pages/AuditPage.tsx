import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Icon } from '@agrotraders/ui';
import type { ApiAuditEntry } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';

export function AuditPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<{ action?: string; entityType?: string; from?: string; to?: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', filters],
    queryFn: () => api.admin.audit(filters),
    retry: 1,
  });
  const rows = (data?.rows ?? []) as ApiAuditEntry[];

  return (
    <div>
      <PageHeader
        title={t('page.audit.title')}
        subtitle={t('page.audit.subtitle')}
        action={<Badge tone="green">{data ? t('audit.entriesCount', { count: data.total }) : t('apiBadge.live')}</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 rounded-md border border-surface-border px-3">
          <Icon name="search" size={16} className="text-ink-soft" />
          <input
            placeholder={t('audit.actionPh')}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value || undefined }))}
            className="h-8 w-56 bg-transparent text-sm outline-none placeholder:text-ink-soft"
          />
        </label>
        <input
          placeholder={t('audit.entityPh')}
          onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value || undefined }))}
          className="h-8 rounded-md border border-surface-border px-2 text-sm"
        />
        <label className="text-xs text-ink-soft">
          {t('range.from')}
          <input type="date" onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))} className="ms-2 h-8 rounded-md border border-surface-border px-2 text-sm" />
        </label>
        <label className="text-xs text-ink-soft">
          {t('range.to')}
          <input type="date" onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))} className="ms-2 h-8 rounded-md border border-surface-border px-2 text-sm" />
        </label>
      </div>

      <Card padded={false}>
        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('common:loading')}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('audit.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">{t('common:table.time')}</th>
                  <th className="px-5 py-3">{t('common:table.actor')}</th>
                  <th className="px-5 py-3">{t('common:table.action')}</th>
                  <th className="px-5 py-3">{t('common:table.target')}</th>
                  <th className="px-5 py-3">{t('audit.detail')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-surface-border/70 last:border-0">
                    <td className="px-5 py-3 font-numeric text-ink-soft">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3 text-ink">{a.actor?.name ?? t('audit.system')}</td>
                    <td className="px-5 py-3">
                      <Badge tone="slate">{a.action}</Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {a.entityType} · {a.entityId.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {a.meta ? JSON.stringify(a.meta).slice(0, 60) : '—'}
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
