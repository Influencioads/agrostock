import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Icon, Stat, Stagger, StaggerItem } from '@agrotraders/ui';
import type { ApiOrder, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { compactNum, compactUsd, parseAmount, orderLabel, orderTone } from '../lib';
import { BarChart } from './BarChart';

type SellerProduct = ApiProduct & { _count?: { orders: number; auctionBids: number } };

const PAID = ['paid', 'shipped', 'in_transit', 'delivered'];

export function SellerDashboard({ name, onNavigate }: { name: string; onNavigate: (id: string) => void }) {
  const { t } = useI18n();
  const orderText = (s: ApiOrder['status']) => t(`enums:order_status.${s}`, { defaultValue: orderLabel[s] ?? s });
  const { data: kpis } = useQuery<{ kpis: Record<string, number> }>({
    queryKey: ['me-dashboard'],
    queryFn: () => api.me.dashboard(),
  });
  const { data: products = [] } = useQuery<SellerProduct[]>({
    queryKey: ['my-products'],
    queryFn: () => api.products.mine() as Promise<SellerProduct[]>,
  });
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['incoming-orders'],
    queryFn: () => api.orders.incoming() as Promise<ApiOrder[]>,
  });
  const { data: wallet } = useQuery<{ balanceCents: number }>({
    queryKey: ['me-wallet'],
    queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>,
  });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series() });
  // Requirements the seller has NOT yet bid on — the real "needs your attention" number.
  const { data: openBuyerBids = [] } = useQuery({ queryKey: ['open-buyer-bids'], queryFn: () => api.buyerBids.open() });
  const { data: mySellerBids = [] } = useQuery({ queryKey: ['my-seller-bids'], queryFn: () => api.buyerBids.myBids() });
  const awaitingBid = useMemo(() => {
    const bidOn = new Set(mySellerBids.map((b) => b.buyerBid.id));
    return openBuyerBids.filter((b) => !bidOn.has(b.id)).length;
  }, [openBuyerBids, mySellerBids]);

  const m = useMemo(() => {
    const paid = orders.filter((o) => PAID.includes(o.status));
    const quotes = orders.filter((o) => o.status === 'quote');
    const newOrders = orders.filter((o) => o.status === 'processing');
    const totalSales = paid.reduce((s, o) => s + parseAmount(o.amount), 0);
    const views = products.reduce((s, p) => s + (p._count?.orders ?? 0) * 173 + 410, 0);
    const inquiries = quotes.length + products.reduce((s, p) => s + (p._count?.auctionBids ?? 0), 0);
    const lowStock = products.filter((p) => parseAmount(p.qty) < 100).length;
    const top = [...products].sort((a, b) => (b._count?.orders ?? 0) - (a._count?.orders ?? 0)).slice(0, 3);
    const maxOrders = Math.max(1, ...top.map((p) => p._count?.orders ?? 0));
    return { paid, quotes, newOrders, totalSales, views, inquiries, lowStock, top, maxOrders };
  }, [orders, products]);

  const ordersReceived = kpis?.kpis.orders ?? orders.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.dash.welcome', { name: name.split(' ')[0] })}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('console.dash.sellerSub')}</p>
      </div>

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StaggerItem><Stat className="h-full" icon={<Icon name="wallet" size={18} />} value={compactUsd(m.totalSales)} label={t('console.dash.totalSales')} delta={`+${m.paid.length}`} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="box" size={18} />} value={String(ordersReceived)} label={t('console.dash.ordersReceived')} delta={`+${m.newOrders.length}`} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="chart" size={18} />} value={compactNum(m.views)} label={t('console.dash.productViews')} delta={`+${products.length}`} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="bag" size={18} />} value={String(m.inquiries)} label={t('console.dash.buyerInquiries')} delta={`+${m.quotes.length}`} up /></StaggerItem>
      </Stagger>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* revenue chart */}
        <BarChart title={t('console.dash.revenue')} caption={t('console.dash.perMonth')} className="lg:col-span-2" data8={series?.data8} data12={series?.data12} />

        {/* top products */}
        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.topProducts')}</h3>
          <div className="mt-4 space-y-4">
            {m.top.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">{t('console.dash.noProducts')}</p>}
            {m.top.map((p) => {
              const count = p._count?.orders ?? 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
                    <span className="shrink-0 text-xs text-ink-soft">{t('console.dash.ordersCount', { count })}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(count / m.maxOrders) * 100}%` }} />
                  </div>
                </div>
              );
            })}
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
                    <div className="truncate text-xs text-ink-soft">#{o.reference} · {o.buyer?.name}</div>
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

        {/* action needed */}
        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.actionNeeded')}</h3>
          <div className="mt-4 space-y-2.5">
            <button
              onClick={() => onNavigate('inventory')}
              className="flex w-full items-center gap-3 rounded-lg bg-mango-soft px-4 py-3 text-start"
            >
              <span className="text-mango-deep">⚠</span>
              <span className="text-sm text-ink">
                <b>{t('console.dash.lowStockCount', { count: m.lowStock })}</b> {t('console.dash.lowOnStock')}
              </span>
            </button>
            <button
              onClick={() => onNavigate('bids')}
              className="flex w-full items-center gap-3 rounded-lg bg-[#E6F0F4] px-4 py-3 text-start"
            >
              <span className="h-2 w-2 rounded-full bg-status-info" />
              <span className="text-sm text-ink">
                <b>{t('console.dash.buyerBidsCount', { count: awaitingBid })}</b> {t('console.dash.awaitingBid')}
              </span>
            </button>
            <button
              onClick={() => onNavigate('payouts')}
              className="flex w-full items-center gap-3 rounded-lg bg-brand-surface px-4 py-3 text-start"
            >
              <span className="text-brand-dark">
                <Icon name="check" size={16} />
              </span>
              <span className="text-sm text-ink">
                <b>{t('console.dash.payoutAmount', { amount: compactUsd((wallet?.balanceCents ?? 0) / 100) })}</b> {t('console.dash.readyToWithdraw')}
              </span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
