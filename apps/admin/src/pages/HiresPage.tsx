import { useQuery } from '@tanstack/react-query';
import { Badge, Card, type BadgeTone } from '@agrotraders/ui';
import type { ApiHireRequest } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

const tone: Record<string, BadgeTone> = { pending: 'warn', accepted: 'green', declined: 'error', cancelled: 'slate' };

/**
 * Direct-hire operations feed (transporters, loading companies, workers).
 * Accepted hires convert into TransportRequests/Trips or LoaderJobs.
 * `titleKey` indexes the `admin` namespace so the caller stays locale-agnostic.
 */
export function HiresPage({
  titleKey = 'hires.title',
  filter,
  embedded = false,
}: {
  titleKey?: string;
  filter?: ApiHireRequest['targetType'][];
  /** When rendered inside another page's tab, suppress the standalone header. */
  embedded?: boolean;
}) {
  const { t } = useI18n();
  const { data: hires = [] } = useQuery<ApiHireRequest[]>({
    queryKey: ['admin-hires'],
    queryFn: () => api.admin.hires(),
  });
  const rows = filter ? hires.filter((h) => filter.includes(h.targetType)) : hires;

  return (
    <div>
      {!embedded && <PageHeader title={t(titleKey)} subtitle={t('hires.subtitle', { count: rows.length })} />}
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3">{t('common:table.ref')}</th>
                <th className="px-5 py-3">{t('common:table.type')}</th>
                <th className="px-5 py-3">{t('common:table.requester')}</th>
                <th className="px-5 py-3">{t('common:table.provider')}</th>
                <th className="px-5 py-3">{t('common:table.detail')}</th>
                <th className="px-5 py-3">{t('common:table.budget')}</th>
                <th className="px-5 py-3">{t('common:table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id} className="border-b border-surface-border/70 last:border-0 hover:bg-brand-surface/30">
                  <td className="px-5 py-3 font-numeric font-bold text-ink">{h.reference}</td>
                  <td className="px-5 py-3"><Badge tone="slate">{t(`enums:hire_target.${h.targetType}`)}</Badge></td>
                  <td className="px-5 py-3 text-ink">{h.requester?.name}</td>
                  <td className="px-5 py-3 text-ink">{h.targetUser?.name}{h.worker ? ` (${h.worker.name})` : ''}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {[h.cargo, h.fromCity && h.toCity ? `${h.fromCity} → ${h.toCity}` : null, h.location].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-5 py-3 font-numeric text-ink-soft">{h.budgetCents != null ? `$${(h.budgetCents / 100).toLocaleString()}` : '—'}</td>
                  <td className="px-5 py-3"><Badge tone={tone[h.status] ?? 'slate'}>{t(`enums:hire_status.${h.status}`)}</Badge></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-ink-soft">{t('hires.empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
