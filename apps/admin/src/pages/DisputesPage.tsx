import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiOrder } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useI18n } from '../i18n';

/** Live dispute resolution — release escrow to the seller or refund the buyer. */
export function DisputesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: disputes = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['admin-disputes'],
    queryFn: () => api.admin.disputes(),
    retry: 1,
  });

  const resolve = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: 'release_to_seller' | 'refund_buyer' }) =>
      api.admin.resolveDispute(id, { resolution }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-disputes'] });
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
      void qc.invalidateQueries({ queryKey: ['admin-payments'] });
      void qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });

  return (
    <div>
      <PageHeader title={t('nav.disputes')} subtitle={t('disputes.sub', { count: disputes.length })} action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>} />

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : disputes.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-dark">
            <Icon name="check" size={28} />
          </span>
          <p className="mt-3 font-display text-lg font-bold text-ink">{t('disputes.none')}</p>
          <p className="text-sm text-ink-soft">{t('disputes.allSmooth')}</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {disputes.map((d) => (
            <Card key={d.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-bold text-ink">{t('disputes.orderRef', { ref: d.reference })}</div>
                  <div className="text-sm text-ink-soft">{d.product?.name}</div>
                </div>
                <Badge tone="error">{t('disputes.badge')}</Badge>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-ink">
                  <Icon name="worker" size={15} className="text-ink-soft" /> {d.buyer?.name} ↔ {d.seller?.name}
                </div>
                <div className="flex items-center gap-2 text-ink">
                  <Icon name="wallet" size={15} className="text-ink-soft" /> {t('disputes.amount', { amount: d.amount })}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: d.id, resolution: 'release_to_seller' })}>
                  {t('disputes.release')}
                </Button>
                <Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: d.id, resolution: 'refund_buyer' })}>
                  {t('disputes.refund')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
