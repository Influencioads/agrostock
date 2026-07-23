import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Icon } from '@agrotraders/ui';
import type { ApiOrder } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

/** Read-only dispute queue while financial settlement is disabled. */
export function DisputesPage() {
  const { t } = useI18n();
  const { data: disputes = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['admin-disputes'],
    queryFn: () => api.admin.disputes(),
    retry: 1,
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
