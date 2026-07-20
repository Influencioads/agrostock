import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Icon, Stat, Stagger, StaggerItem } from '@agrotraders/ui';
import { PageHeader, BarChart } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Localized short month name; falls back to English if ICU data is unavailable. */
function monthLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  } catch {
    return MONTHS_EN[d.getMonth()];
  }
}

function toPoints(series: number[] | undefined, locale: string): { m: string; v: number }[] {
  const data = series ?? [];
  const now = new Date();
  return data.map((v, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (data.length - 1 - i), 1);
    return { m: monthLabel(d, locale), v };
  });
}

export function OverviewPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.admin.stats(), retry: 1 });
  const { data: volume } = useQuery({ queryKey: ['admin-volume'], queryFn: () => api.admin.volume(), retry: 1 });
  const { data: auditData } = useQuery({ queryKey: ['admin-audit', 'overview'], queryFn: () => api.admin.audit({ take: 8 }), retry: 1 });

  const kpis = [
    { label: t('overview.stats.users'), value: (stats?.users ?? 0).toLocaleString(), icon: 'user' as const },
    { label: t('overview.stats.products'), value: (stats?.products ?? 0).toLocaleString(), icon: 'box' as const },
    { label: t('overview.stats.orders'), value: (stats?.orders ?? 0).toLocaleString(), icon: 'bag' as const },
    { label: t('overview.stats.disputes'), value: String(stats?.disputes ?? 0), icon: 'gavel' as const },
  ];

  // Real approval queue: pending counts across every review surface.
  const queue = [
    { label: t('overview.queue.kyc'), count: stats?.pendingKyc ?? 0, to: '/kyc' },
    { label: t('overview.queue.products'), count: stats?.pendingProducts ?? 0, to: '/products' },
    { label: t('overview.queue.roleRequests'), count: stats?.pendingRoleRequests ?? 0, to: '/role-requests' },
    { label: t('overview.queue.markets'), count: stats?.pendingMarkets ?? 0, to: '/markets' },
    { label: t('overview.queue.ads'), count: stats?.pendingAds ?? 0, to: '/ads' },
    { label: t('overview.queue.payouts'), count: stats?.pendingPayouts ?? 0, to: '/payments' },
  ].filter((q) => q.count > 0);

  const points = toPoints(volume?.data8, lang);
  const hasGmv = points.some((p) => p.v > 0);

  return (
    <div>
      <PageHeader
        title={t('page.overview.title')}
        subtitle={t('page.overview.subtitle')}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={stats ? 'green' : 'warn'}>{stats ? t('apiBadge.live') : t('apiBadge.connecting')}</Badge>
            <Button leftIcon={<Icon name="check" size={16} />} onClick={() => navigate('/kyc')}>
              {t('overview.reviewQueue')}
            </Button>
          </div>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <StaggerItem key={k.label}>
            <Stat className="h-full" label={k.label} value={k.value} icon={<Icon name={k.icon} size={18} />} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">{t('overview.gmv')}</h3>
            <Badge tone="slate">{t('overview.lastMonths', { count: points.length })}</Badge>
          </div>
          <p className="text-xs text-ink-soft">{t('overview.perMonthSettled')}</p>
          <div className="mt-4">{hasGmv ? <BarChart data={points} /> : <div className="flex h-40 items-center justify-center text-sm text-ink-soft">{t('overview.noSettledYet')}</div>}</div>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('overview.recentActivity')}</h3>
          <ul className="mt-3 space-y-3">
            {(auditData?.rows ?? []).slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-leaf" />
                <div>
                  <div className="text-sm font-semibold text-ink">{a.action}</div>
                  <div className="text-xs text-ink-soft">
                    {a.actor?.name ?? t('overview.system')} · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
            {(!auditData || auditData.rows.length === 0) && <li className="text-sm text-ink-soft">{t('overview.noRecent')}</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-6" padded={false}>
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{t('overview.approvalQueue')}</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
            {t('overview.viewReports')}
          </Button>
        </div>
        {queue.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">{t('overview.nothingAwaiting')}</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {queue.map((q) => (
              <div key={q.label} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Badge tone="warn">{q.count}</Badge>
                  <span className="text-sm font-semibold text-ink">{q.label}</span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate(q.to)}>
                  {t('overview.review')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
