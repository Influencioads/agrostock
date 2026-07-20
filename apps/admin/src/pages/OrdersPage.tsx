import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, type BadgeTone } from '@agrotraders/ui';
import type { ApiOrder } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useI18n } from '../i18n';

const statusTone: Record<string, BadgeTone> = {
  quote: 'gold',
  processing: 'info',
  paid: 'gold',
  packed: 'info',
  dispatched: 'info',
  shipped: 'info',
  in_transit: 'info',
  delivered: 'green',
  dispute: 'error',
  cancelled: 'slate',
};
const STATUS_OPTIONS = ['processing', 'paid', 'packed', 'dispatched', 'in_transit', 'delivered', 'dispute', 'cancelled'];
const FILTERS = ['all', 'processing', 'paid', 'dispatched', 'delivered', 'dispute', 'cancelled'] as const;

function OrderDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ['admin-order', id], queryFn: () => api.admin.orderDetail(id) });
  const [status, setStatus] = useState('');
  const save = useMutation({
    mutationFn: () => api.admin.setOrderStatus(id, status),
    onSuccess: onChanged,
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });
  const d = data as Record<string, unknown> | undefined;
  const events = (d?.events as Record<string, unknown>[]) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-s border-surface-border bg-surface-bg p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{t('ordersAdmin.orderTitle', { ref: String(d?.reference ?? '') })}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x" size={18} />
          </Button>
        </div>
        {!d ? (
          <Card className="py-14 text-center text-ink-soft">{t('common:loading')}</Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">{t('ordersAdmin.product')}</dt><dd className="font-semibold text-ink">{String((d.product as { name?: string })?.name ?? '—')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('ordersAdmin.buyer')}</dt><dd className="font-semibold text-ink">{String((d.buyer as { name?: string })?.name ?? '—')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('ordersAdmin.seller')}</dt><dd className="font-semibold text-ink">{String((d.seller as { name?: string })?.name ?? '—')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('ordersAdmin.amount')}</dt><dd className="font-numeric font-semibold text-ink">{String(d.amount ?? '')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('ordersAdmin.status')}</dt><dd><Badge tone={statusTone[String(d.status)] ?? 'slate'}>{t(`enums:order_status.${String(d.status)}`)}</Badge></dd></div>
              </dl>
            </Card>

            <Card>
              <h3 className="mb-2 font-display font-bold text-ink">{t('ordersAdmin.override')}</h3>
              <div className="flex gap-2">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 flex-1 rounded-md border border-surface-border bg-white px-2 text-sm outline-none">
                  <option value="">{t('ordersAdmin.selectStatus')}</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {t(`enums:order_status.${s}`)}
                    </option>
                  ))}
                </select>
                <Button size="sm" disabled={!status || save.isPending} onClick={() => save.mutate()}>
                  {t('ordersAdmin.apply')}
                </Button>
              </div>
            </Card>

            <Card padded={false}>
              <div className="border-b border-surface-border px-4 py-3 font-display font-bold text-ink">{t('ordersAdmin.timeline', { count: events.length })}</div>
              <div className="divide-y divide-surface-border">
                {events.map((e, i) => (
                  <div key={i} className="px-4 py-2 text-sm">
                    <div className="font-semibold text-ink">{String(e.type)}</div>
                    <div className="text-xs text-ink-soft">
                      {e.note ? `${String(e.note)} · ` : ''}
                      {e.createdAt ? new Date(String(e.createdAt)).toLocaleString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrdersPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);

  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['admin-orders', filter, search],
    queryFn: () => api.admin.orders({ status: filter === 'all' ? undefined : filter, search: search || undefined }),
    retry: 1,
  });

  return (
    <div>
      <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle', { count: orders.length })} action={<Badge tone="green">{t('apiBadge.live')}</Badge>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ' + (filter === f ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')}
            >
              {f === 'all' ? t('ordersAdmin.all') : t(`enums:order_status.${f}`)}
            </button>
          ))}
        </div>
        <label className="ms-auto flex items-center gap-2 rounded-md border border-surface-border px-3">
          <Icon name="search" size={16} className="text-ink-soft" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('ordersAdmin.searchPh')} className="h-8 w-56 bg-transparent text-sm outline-none placeholder:text-ink-soft" />
        </label>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3">{t('common:table.order')}</th>
                <th className="px-5 py-3">{t('common:table.buyer')}</th>
                <th className="px-5 py-3">{t('common:table.seller')}</th>
                <th className="px-5 py-3 text-end">{t('common:table.amount')}</th>
                <th className="px-5 py-3">{t('common:table.status')}</th>
                <th className="px-5 py-3 text-end">{t('common:table.action')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-surface-border/70 last:border-0 hover:bg-brand-surface/30">
                  <td className="px-5 py-3 font-numeric font-semibold text-ink">#{o.reference}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {o.buyer?.name} {o.buyer?.country}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {o.seller?.name} {o.seller?.country}
                  </td>
                  <td className="px-5 py-3 text-end font-numeric font-bold text-ink">{o.amount}</td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone[o.status] ?? 'slate'}>{t(`enums:order_status.${o.status}`)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-end">
                    <Button size="sm" variant="outline" onClick={() => setViewing(o.id)}>
                      {t('orders.details')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {viewing && (
        <OrderDrawer
          id={viewing}
          onClose={() => setViewing(null)}
          onChanged={() => {
            setViewing(null);
            void qc.invalidateQueries({ queryKey: ['admin-orders'] });
          }}
        />
      )}
    </div>
  );
}
