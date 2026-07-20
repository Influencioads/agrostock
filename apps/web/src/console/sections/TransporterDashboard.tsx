import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Icon, Stat, Stagger, StaggerItem } from '@agrotraders/ui';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { compactUsd } from '../lib';
import { BarChart } from './BarChart';
import { useDrivers } from './transporterData';

interface Trip {
  id: string;
  reference: string;
  fromCity: string;
  toCity: string;
  cargo: string;
  status: string;
}

const ACTIVE = ['pending', 'loading', 'in_transit', 'delayed'];
const tripTone: Record<string, 'slate' | 'warn' | 'info' | 'green' | 'error'> = {
  pending: 'slate', loading: 'warn', in_transit: 'info', delivered: 'green', delayed: 'error',
};

export function TransporterDashboard({ name, onNavigate }: { name: string; onNavigate: (id: string) => void }) {
  const { t } = useI18n();
  const { drivers } = useDrivers();
  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ['my-trips'],
    queryFn: () => api.transport.myTrips() as Promise<Trip[]>,
  });
  const { data: requests = [] } = useQuery<unknown[]>({
    queryKey: ['open-requests'],
    queryFn: () => api.transport.requestsOpen() as Promise<unknown[]>,
  });
  const { data: vehicles = [] } = useQuery<unknown[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.transport.vehicles() as Promise<unknown[]>,
  });
  const { data: wallet } = useQuery<{ balanceCents: number }>({
    queryKey: ['me-wallet'],
    queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>,
  });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series() });

  const active = trips.filter((t) => ACTIVE.includes(t.status));
  const fleet = Math.max(vehicles.length, 1);
  const utilization = Math.min(100, Math.round((active.length / fleet) * 100));
  const inTransit = trips.find((t) => t.status === 'in_transit') ?? active[0];
  const topDrivers = [...drivers].filter((d) => d.status === 'active').sort((a, b) => (b.onTimePct ?? 0) - (a.onTimePct ?? 0)).slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.dash.welcome', { name: name.split(' ')[0] })}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('console.dash.transporterSub')}</p>
      </div>

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StaggerItem><Stat className="h-full" icon={<Icon name="truck" size={18} />} value={String(active.length)} label={t('console.dash.activeTrips')} delta={`+${active.length}`} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="box" size={18} />} value={String(requests.length)} label={t('console.dash.availableRequests')} delta={t('console.dash.new')} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="wallet" size={18} />} value={compactUsd((wallet?.balanceCents ?? 0) / 100)} label={t('console.dash.thisMonth')} delta="+8%" up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="gauge" size={18} />} value={`${utilization}%`} label={t('console.dash.fleetUtilization')} delta="+5%" up /></StaggerItem>
      </Stagger>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* earnings chart */}
        <BarChart title={t('console.dash.earningsTitle')} caption={t('console.dash.perMonth')} className="lg:col-span-2" data8={series?.data8} data12={series?.data12} />

        {/* live tracking */}
        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.liveTracking')}</h3>
          <div className="relative mt-4 overflow-hidden rounded-xl border border-surface-border bg-brand-surface">
            <svg viewBox="0 0 600 220" className="h-44 w-full">
              <path
                d="M40,150 C160,40 260,200 380,120 S520,40 560,70"
                fill="none"
                stroke="#53B86A"
                strokeWidth="3"
                strokeDasharray="6 9"
                strokeLinecap="round"
              />
              <circle cx="40" cy="150" r="9" fill="#fff" />
              <circle cx="40" cy="150" r="5" fill="#249653" />
              <circle cx="560" cy="70" r="11" fill="#F57C00" />
              <circle cx="560" cy="70" r="4" fill="#fff" />
            </svg>
            <div className="absolute bottom-3 start-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-card">
              {inTransit?.reference ?? 'TR-441'} · {t('console.dash.trackingMeta', { km: 320, h: 6 })}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* active trips */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.activeTrips')}</h3>
            <button onClick={() => onNavigate('trips')} className="text-sm font-bold text-brand hover:underline">
              {t('common:viewAll')}
            </button>
          </div>
          <div className="mt-4 divide-y divide-surface-border">
            {active.slice(0, 5).map((tr) => (
              <div key={tr.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-brand-dark">
                    <Icon name="truck" size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{tr.fromCity} → {tr.toCity}</div>
                    <div className="truncate text-xs text-ink-soft">#{tr.reference} · {tr.cargo}</div>
                  </div>
                </div>
                <Badge tone={tripTone[tr.status] ?? 'slate'}>{t(`console.dash.tripStatus.${tr.status}`, { defaultValue: tr.status.replace('_', ' ') })}</Badge>
              </div>
            ))}
            {active.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">{t('console.dash.noActiveTrips')}</p>}
          </div>
        </Card>

        {/* driver performance */}
        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.driverPerformance')}</h3>
          <div className="mt-4 space-y-4">
            {topDrivers.map((d) => (
              <div key={d.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">
                    {d.name} · <span className="text-mango-deep">★ {d.ratingPct ?? 0}%</span>
                  </span>
                  <span className="text-xs text-ink-soft">{t('console.dash.onTime', { pct: d.onTimePct ?? 0 })}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${d.onTimePct ?? 0}%` }} />
                </div>
              </div>
            ))}
            <button onClick={() => onNavigate('drivers')} className="text-sm font-bold text-brand hover:underline">
              {t('console.dash.manageDrivers')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
