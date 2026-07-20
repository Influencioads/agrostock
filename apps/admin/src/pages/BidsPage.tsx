import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, type BadgeTone } from '@agrotraders/ui';
import type { AdminBuyerBid } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

const STATUS_TONE: Record<string, BadgeTone> = {
  open: 'green',
  awarded: 'info',
  closed: 'slate',
  cancelled: 'error',
};
const FILTERS = ['open', 'awarded', 'closed', 'cancelled', 'all'] as const;
const usd = (cents?: number | null) => (cents == null ? '—' : '$' + (cents / 100).toLocaleString());

function BidDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ['admin-buyer-bid', id], queryFn: () => api.admin.buyerBidDetail(id) });
  const cancel = useMutation({ mutationFn: () => api.admin.cancelBuyerBid(id), onSuccess: onChanged });
  const award = useMutation({ mutationFn: (bidId: string) => api.admin.awardBuyerBid(id, bidId), onSuccess: onChanged });
  const d = data as Record<string, unknown> | undefined;
  const sellerBids = (d?.sellerBids as Record<string, unknown>[]) ?? [];
  const isOpen = d?.status === 'open';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-s border-surface-border bg-surface-bg p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{t('bidsAdmin.drawerTitle')}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x" size={18} />
          </Button>
        </div>
        <Card className="mb-4">
          <div className="font-display text-lg font-bold text-ink">
            {String((d?.category as { emoji?: string })?.emoji ?? '📦')} {String((d?.category as { name?: string })?.name ?? t('bidsAdmin.reqFallback'))}
          </div>
          <div className="mt-1 text-sm text-ink-soft">
            {t('bidsAdmin.buyerLine', { name: String((d?.buyer as { name?: string })?.name ?? '—') })} · {String(d?.qtyValue ?? '')} {String(d?.qtyUnit ?? '')}
          </div>
          {isOpen && (
            <Button size="sm" variant="danger" className="mt-3" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {t('bidsAdmin.cancelReq')}
            </Button>
          )}
        </Card>
        <Card padded={false}>
          <div className="border-b border-surface-border px-4 py-3 font-display font-bold text-ink">{t('bidsAdmin.sellerBidsCount', { count: sellerBids.length })}</div>
          {sellerBids.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">{t('bidsAdmin.noSellerBids')}</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {sellerBids.map((b, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <div className="text-ink">{String((b.seller as { name?: string })?.name ?? t('bidsAdmin.sellerFallback'))}</div>
                    <div className="text-xs text-ink-soft">
                      {usd(Number(b.priceCents))} · {t(`bidsAdmin.status.${String(b.status ?? '')}`, { defaultValue: String(b.status ?? '') })}
                    </div>
                  </div>
                  {isOpen && b.status === 'submitted' && (
                    <Button size="sm" disabled={award.isPending} onClick={() => award.mutate(String(b.id))}>
                      {t('bidsAdmin.award')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Admin oversight of buyer bids (reverse auctions / RFQs). */
export function BidsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('open');
  const [viewing, setViewing] = useState<string | null>(null);

  const { data: bids = [], isLoading } = useQuery<AdminBuyerBid[]>({
    queryKey: ['admin-buyer-bids', filter],
    queryFn: () => api.admin.buyerBidsList(filter === 'all' ? undefined : filter),
    retry: 1,
  });
  const onChanged = () => {
    setViewing(null);
    void qc.invalidateQueries({ queryKey: ['admin-buyer-bids'] });
  };

  return (
    <div>
      <PageHeader title={t('nav.bids')} subtitle={t('bidsAdmin.sub')} action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>} />

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' + (filter === f ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')}
          >
            {t(`bidsAdmin.status.${f}`)}
          </button>
        ))}
      </div>

      <Card padded={false}>
        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('common:loading')}</p>
        ) : bids.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('bidsAdmin.none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">{t('bidsAdmin.colReq')}</th>
                  <th className="px-5 py-3">{t('bidsAdmin.colBuyer')}</th>
                  <th className="px-5 py-3">{t('bidsAdmin.colQty')}</th>
                  <th className="px-5 py-3">{t('bidsAdmin.colSellerBids')}</th>
                  <th className="px-5 py-3">{t('bidsAdmin.colBest')}</th>
                  <th className="px-5 py-3">{t('bidsAdmin.colStatus')}</th>
                  <th className="px-5 py-3 text-end">{t('bidsAdmin.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => (
                  <tr key={b.id} className="border-b border-surface-border/70 last:border-0 hover:bg-brand-surface/30">
                    <td className="px-5 py-3 font-semibold text-ink">
                      {b.category?.emoji} {b.product?.name ?? b.category?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{b.buyer?.name}</td>
                    <td className="px-5 py-3 text-ink-soft">
                      {b.qtyValue} {b.qtyUnit}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{b._count.sellerBids}</td>
                    <td className="px-5 py-3 font-numeric text-ink">{usd(b.bestPriceCents)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[b.status] ?? 'slate'}>{t(`bidsAdmin.status.${b.status}`, { defaultValue: b.status })}</Badge>
                    </td>
                    <td className="px-5 py-3 text-end">
                      <Button size="sm" variant="outline" onClick={() => setViewing(b.id)}>
                        {t('bidsAdmin.view')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {viewing && <BidDrawer id={viewing} onClose={() => setViewing(null)} onChanged={onChanged} />}
    </div>
  );
}
