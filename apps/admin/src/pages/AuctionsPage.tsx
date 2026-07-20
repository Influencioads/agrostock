import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { AdminAuction } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

/** Compact dollar label, e.g. 284000 → "$284K". `n` is dollars. */
const compactUsd = (n: number): string =>
  n >= 1000 ? '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : '$' + Math.round(n).toLocaleString();

function AuctionDrawer({ slug, onClose, onChanged }: { slug: string; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  const { data: detail } = useQuery({ queryKey: ['admin-auction', slug], queryFn: () => api.admin.auctionDetail(slug) });
  const { data: bids = [] } = useQuery({ queryKey: ['admin-auction-bids', slug], queryFn: () => api.admin.auctionBids(slug) });
  const close = useMutation({ mutationFn: () => api.admin.closeAuction(slug), onSuccess: onChanged });
  const cancel = useMutation({ mutationFn: () => api.admin.cancelAuction(slug), onSuccess: onChanged });
  const d = detail as Record<string, unknown> | undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-s border-surface-border bg-surface-bg p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{t('auctionsAdmin.drawerTitle')}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x" size={18} />
          </Button>
        </div>
        <Card className="mb-4">
          <div className="font-display text-lg font-bold text-ink">
            {String(d?.emoji ?? '🌾')} {String(d?.name ?? '…')}
          </div>
          <div className="mt-1 text-sm text-ink-soft">
            {t('auctionsAdmin.ends', { date: d?.auctionEndsAt ? new Date(String(d.auctionEndsAt)).toLocaleString() : '—' })}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={close.isPending} onClick={() => close.mutate()}>
              {t('auctionsAdmin.closeNow')}
            </Button>
            <Button size="sm" variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {t('auctionsAdmin.void')}
            </Button>
          </div>
        </Card>
        <Card padded={false}>
          <div className="border-b border-surface-border px-4 py-3 font-display font-bold text-ink">{t('auctionsAdmin.bidBook', { count: bids.length })}</div>
          {bids.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">{t('auctionsAdmin.noBids')}</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {(bids as Record<string, unknown>[]).map((b, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-ink">{String((b as { masked?: string }).masked ?? (b.bidder as { name?: string })?.name ?? t('auctionsAdmin.bidderFallback'))}</span>
                  <span className="font-numeric font-semibold text-ink">{compactUsd((Number(b.amountCents) || 0) / 100)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Admin auction oversight: every auction, clickable, with bid book + controls. */
export function AuctionsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<string | null>(null);
  const { data: auctions = [], isLoading } = useQuery<AdminAuction[]>({
    queryKey: ['admin-auctions'],
    queryFn: () => api.admin.auctions(),
    retry: 1,
  });
  const onChanged = () => {
    setViewing(null);
    void qc.invalidateQueries({ queryKey: ['admin-auctions'] });
  };

  return (
    <div>
      <PageHeader title={t('nav.auctions')} subtitle={t('auctionsAdmin.sub')} action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : auctions.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('auctionsAdmin.none')}</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a) => (
            <button key={a.id} onClick={() => setViewing(a.slug)} className="text-left">
              <Card className="h-full transition hover:shadow-[0_10px_30px_rgba(11,61,46,0.10)]">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{a.emoji ?? '🌾'}</span>
                  <Badge tone="info">{t('auctionsAdmin.bidsCount', { count: a.bidCount })}</Badge>
                </div>
                <div className="mt-2 font-display font-bold text-ink">{a.name}</div>
                <div className="text-xs text-ink-soft">
                  {a.seller?.name} · {t('auctionsAdmin.high', { amount: a.highestCents != null ? compactUsd(a.highestCents / 100) : '—' })}
                </div>
                <div className="mt-1 text-[11px] text-ink-soft">
                  {t('auctionsAdmin.ends', { date: a.auctionEndsAt ? new Date(a.auctionEndsAt).toLocaleDateString() : '—' })}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
      {viewing && <AuctionDrawer slug={viewing} onClose={() => setViewing(null)} onChanged={onChanged} />}
    </div>
  );
}
