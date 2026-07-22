import { useQuery } from '@tanstack/react-query';
import { Card, Icon, Stat, Stagger, StaggerItem, type IconName } from '@agrotraders/ui';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';

// Icons only; labels are translated at render from `console.dash.kpi.<key>`.
const kpiIcon: Record<string, IconName> = {
  orders: 'box',
  active: 'truck',
  bids: 'gavel',
  products: 'store',
  trips: 'truck',
  requests: 'box',
  vehicles: 'truck',
  workers: 'worker',
  teams: 'grid',
  jobs: 'box',
  assignments: 'worker',
};

export function Overview({ name }: { name: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery<{ kpis: Record<string, number> }>({
    queryKey: ['me-dashboard'],
    queryFn: () => api.me.dashboard(),
  });
  const kpis = Object.entries(data?.kpis ?? {});

  return (
    <div>
      <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.dash.welcome', { name: name.split(' ')[0] })}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t('console.dash.overviewSub')}</p>

      <Stagger className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {isLoading ? (
          <Card className="col-span-2 py-10 text-center text-ink-soft lg:col-span-4">{t('console.dash.loadingMetrics')}</Card>
        ) : kpis.length === 0 ? (
          <Card className="col-span-2 py-10 text-center text-ink-soft lg:col-span-4">{t('console.dash.noMetrics')}</Card>
        ) : (
          kpis.map(([k, v]) => (
            <StaggerItem key={k}>
              <Stat
                className="h-full"
                label={t(`console.dash.kpi.${k}`, { defaultValue: k })}
                value={String(v)}
                icon={<Icon name={kpiIcon[k] ?? 'chart'} size={18} />}
              />
            </StaggerItem>
          ))
        )}
      </Stagger>
    </div>
  );
}
