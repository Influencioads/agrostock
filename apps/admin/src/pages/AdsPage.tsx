import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import type { ApiAdCampaign } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

const FILTERS: Filter[] = ['pending', 'approved', 'rejected', 'all'];

const usd = (cents: number) => `$${(cents / 100).toLocaleString()}`;

/** Ad-campaign moderation. Approving a campaign is what puts it on the site. */
export function AdsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('pending');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: ads = [], isLoading } = useQuery<ApiAdCampaign[]>({
    queryKey: ['admin-ads', filter],
    queryFn: () => api.admin.ads(filter === 'all' ? undefined : filter),
    retry: 1,
  });

  const liveCount = ads.filter((a) => a.status === 'approved' && a.active).length;
  const pendingCount = ads.filter((a) => a.status === 'pending').length;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-ads'] });
    void qc.invalidateQueries({ queryKey: ['admin-stats'] });
  };
  const approve = useMutation({ mutationFn: (id: string) => api.admin.approveAd(id), onSuccess: refresh });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.admin.rejectAd(id, reason || undefined),
    onSuccess: () => { refresh(); setRejecting(null); setReason(''); },
  });

  return (
    <div>
      <PageHeader
        title={t('nav.ads')}
        subtitle={t('adsAdmin.sub')}
        action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="py-3">
          <div className="text-xs text-ink-soft">{t('adsAdmin.liveNow')}</div>
          <div className="font-display text-2xl font-extrabold text-brand-dark">{liveCount}</div>
        </Card>
        <Card className="py-3">
          <div className="text-xs text-ink-soft">{t('adsAdmin.awaiting')}</div>
          <div className="font-display text-2xl font-extrabold text-status-warning">{pendingCount}</div>
        </Card>
        <Card className="py-3">
          <div className="text-xs text-ink-soft">{t('adsAdmin.impressions')}</div>
          <div className="font-display text-2xl font-extrabold text-ink">
            {ads.reduce((s, a) => s + (a.impressions ?? 0), 0).toLocaleString()}
          </div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              'rounded-full border px-3 py-1 text-sm font-semibold ' +
              (filter === f ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft')
            }
          >
            {t(`adsAdmin.filter.${f}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : ads.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-dark">
            <Icon name="check" size={28} />
          </span>
          <p className="mt-3 font-display text-lg font-bold text-ink">
            {filter === 'pending' ? t('adsAdmin.queueCleared') : t('adsAdmin.nothingHere')}
          </p>
          <p className="text-sm text-ink-soft">
            {filter === 'pending' ? t('adsAdmin.noneAwaiting') : t('adsAdmin.noneFilter', { filter: t(`adsAdmin.filter.${filter}`) })}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {ads.map((a) => {
            const live = a.status === 'approved' && a.active;
            return (
              <Card key={a.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-ink">
                      {a.product?.emoji ?? '🌾'} {a.product?.name ?? t('adsAdmin.listingFallback')}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {a.seller?.name ?? t('adsAdmin.sellerFallback')} · {t('adsAdmin.perDaySubmitted', { amount: usd(a.dailyBudgetCents) })}{' '}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                    <div className="mt-0.5 flex gap-3 text-[11px] text-ink-soft">
                      <span>👁 {t('adsAdmin.views', { count: a.impressions ?? 0 })}</span>
                      <span>👆 {t('adsAdmin.clicks', { count: a.clicks ?? 0 })}</span>
                    </div>
                    {a.status === 'rejected' && a.rejectionReason && (
                      <div className="mt-1 text-xs text-status-error">{t('adsAdmin.reasonLabel', { reason: a.rejectionReason })}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.status === 'pending' && <Badge tone="warn">{t('adsAdmin.pending')}</Badge>}
                    {a.status === 'rejected' && <Badge tone="error">{t('adsAdmin.rejected')}</Badge>}
                    {a.status === 'approved' && <Badge tone={live ? 'green' : 'slate'}>{live ? t('adsAdmin.live') : t('adsAdmin.paused')}</Badge>}

                    {a.status !== 'approved' && (
                      <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(a.id)}>
                        {t('prodMod.approve')}
                      </Button>
                    )}
                    {a.status !== 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setRejecting(rejecting === a.id ? null : a.id); setReason(''); }}
                      >
                        {t('prodMod.reject')}
                      </Button>
                    )}
                  </div>
                </div>

                {rejecting === a.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-surface-border pt-3">
                    <div className="min-w-[240px] flex-1">
                      <Input
                        label={t('adsAdmin.reasonPlaceholder')}
                        placeholder={t('adsAdmin.reasonExample')}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    <Button size="sm" variant="danger" disabled={reject.isPending} onClick={() => reject.mutate({ id: a.id, reason })}>
                      {reject.isPending ? t('adsAdmin.rejecting') : t('adsAdmin.confirmReject')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>{t('common:cancel')}</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
