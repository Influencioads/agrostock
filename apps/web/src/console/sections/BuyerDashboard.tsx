import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Stat, Stagger, StaggerItem } from '@agrotraders/ui';
import { ORDER_STEPS, type ApiOrder, type ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd, parseAmount, orderLabel, orderTone } from '../lib';
import { BarChart } from './BarChart';

/** Progress = how far along the real lifecycle the order actually is. */
const progressOf = (status: ApiOrder['status']) => {
  const i = ORDER_STEPS.indexOf(status);
  return i < 0 ? 0 : Math.round(((i + 1) / ORDER_STEPS.length) * 100);
};

export function BuyerDashboard({ name, onNavigate }: { name: string; onNavigate: (id: string) => void }) {
  const { t } = useI18n();
  const orderText = (s: ApiOrder['status']) => t(`enums:order_status.${s}`, { defaultValue: orderLabel[s] ?? s });
  const { data: dash } = useQuery<{ kpis: Record<string, number> }>({
    queryKey: ['me-dashboard'],
    queryFn: () => api.me.dashboard(),
  });
  const { data: wallet } = useQuery<{ balanceCents: number }>({
    queryKey: ['me-wallet'],
    queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>,
  });
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.orders.mine() as Promise<ApiOrder[]>,
  });
  const { data: offers = [] } = useQuery<ApiProduct[]>({
    queryKey: ['offers-of-day'],
    queryFn: () => api.products.list({ offer: true }),
  });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series() });

  const kpis = dash?.kpis ?? {};
  const activeOrders = kpis.active ?? orders.filter((o) => ['processing', 'paid', 'shipped', 'in_transit'].includes(o.status)).length;
  const totalOrders = kpis.orders ?? orders.length;
  const activeBids = kpis.bids ?? 0;

  const pending = useMemo(() => {
    const due = orders.filter((o) => o.status === 'processing' || o.status === 'paid');
    return { count: due.length, total: due.reduce((s, o) => s + parseAmount(o.amount), 0) * 100 };
  }, [orders]);

  const deliveries = useMemo(
    () => orders.filter((o) => ['dispatched', 'shipped', 'in_transit'].includes(o.status)).slice(0, 4),
    [orders],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.dash.welcome', { name: name.split(' ')[0] })}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('console.dash.buyerSub')}</p>
      </div>

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StaggerItem><Stat className="h-full" icon={<Icon name="box" size={18} />} value={String(activeOrders)} label={t('console.dash.activeOrders')} delta={`+${Math.max(totalOrders - activeOrders, 0)}`} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="wallet" size={18} />} value={usd(pending.total)} label={t('console.dash.pendingPayments')} delta={t('console.dash.due', { count: pending.count })} up={false} /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="gavel" size={18} />} value={String(activeBids)} label={t('console.dash.activeBids')} delta={t('console.dash.live')} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="shield" size={18} />} value={usd(wallet?.balanceCents)} label={t('console.dash.safeDealBalance')} delta={t('console.dash.escrow')} up /></StaggerItem>
      </Stagger>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* spend chart */}
        <BarChart title={t('console.dash.procurementSpend')} caption={t('console.dash.perMonth')} className="lg:col-span-2" data8={series?.data8} data12={series?.data12} />

        {/* active deliveries */}
        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.activeDeliveries')}</h3>
          <div className="mt-4 space-y-4">
            {deliveries.map((o) => (
              <div key={o.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{o.product?.name ?? t('console.dash.shipmentFallback')}</span>
                  <span className="text-xs text-ink-soft">{orderText(o.status)}</span>
                </div>
                <div className="mt-0.5 text-xs text-ink-soft">
                  {o.transporterName ?? o.seller?.country ?? t('console.dash.origin')} → {o.buyer?.country ?? t('console.dash.destination')}
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${progressOf(o.status)}%` }} />
                </div>
              </div>
            ))}
            {deliveries.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-soft">{t('console.dash.noShipments')}</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* recent orders */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.recentOrders')}</h3>
            <button onClick={() => onNavigate('orders')} className="text-sm font-bold text-brand hover:underline">
              {t('common:viewAll')}
            </button>
          </div>
          <div className="mt-4 divide-y divide-surface-border">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface">🌾</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{o.product?.name ?? t('console.dash.orderFallback')}</div>
                    <div className="truncate text-xs text-ink-soft">#{o.reference} · {o.seller?.name}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-display text-sm font-extrabold text-ink">{o.amount}</span>
                  <Badge tone={orderTone[o.status] ?? 'slate'}>{orderText(o.status)}</Badge>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">{t('console.dash.noOrders')}</p>}
          </div>
        </Card>

        {/* offers of the day */}
        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('section.offers')}</h3>
          <div className="mt-4 space-y-2">
            {offers.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => onNavigate('browse')}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-start transition hover:bg-surface-bg"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mango-soft text-lg">
                  {p.emoji ?? '🌾'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                  {/* `price` already carries the "$" and `unit` the leading "/". */}
                  <div className="truncate text-xs text-ink-soft">
                    {p.flag} {p.price}{p.unit}
                  </div>
                </div>
                <Badge tone="mango">{t('console.dash.offer')}</Badge>
              </button>
            ))}
            {offers.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">{t('console.dash.noOffers')}</p>}
          </div>
          <Button variant="outline" size="sm" fullWidth className="mt-3" onClick={() => onNavigate('browse')}>
            {t('console.dash.browseAllProducts')}
          </Button>
        </Card>
      </div>
    </div>
  );
}
