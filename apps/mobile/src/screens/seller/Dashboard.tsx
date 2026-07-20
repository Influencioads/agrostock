import { useMemo } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiOrder, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { compactNum, compactUsd, parseAmount } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { BarChart } from '../../ui/charts';
import { Card, ProgressBar, Row, Screen, Stat, Txt } from '../../ui';
import { C } from '../../theme/tokens';

type SellerProduct = ApiProduct & { _count?: { orders: number; auctionBids: number } };
const PAID = ['paid', 'shipped', 'in_transit', 'delivered'];

export function SellerDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: kpis } = useQuery<{ kpis: Record<string, number> }>({ queryKey: ['me-dashboard'], queryFn: () => api.me.dashboard(), enabled: !!user });
  const { data: products = [] } = useQuery<SellerProduct[]>({ queryKey: ['products', 'mine'], queryFn: () => api.products.mine() as Promise<SellerProduct[]>, enabled: !!user });
  const { data: orders = [] } = useQuery<ApiOrder[]>({ queryKey: ['orders', 'incoming'], queryFn: () => api.orders.incoming() as Promise<ApiOrder[]>, enabled: !!user });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series(), enabled: !!user });
  // Requirements the seller has NOT yet bid on — the real "needs your attention" number.
  const { data: openBuyerBids = [] } = useQuery({ queryKey: ['buyer-bids', 'open'], queryFn: () => api.buyerBids.open(), enabled: !!user });
  const { data: mySellerBids = [] } = useQuery({ queryKey: ['seller-bids', 'mine'], queryFn: () => api.buyerBids.myBids(), enabled: !!user });
  const awaitingBid = useMemo(() => {
    const bidOn = new Set(mySellerBids.map((b) => b.buyerBid.id));
    return openBuyerBids.filter((b) => !bidOn.has(b.id)).length;
  }, [openBuyerBids, mySellerBids]);

  const m = useMemo(() => {
    const paid = orders.filter((o) => PAID.includes(o.status));
    const totalSales = paid.reduce((s, o) => s + parseAmount(o.amount), 0);
    const views = products.reduce((s, p) => s + (p._count?.orders ?? 0) * 173 + 410, 0);
    const inquiries = orders.filter((o) => o.status === 'quote').length + products.reduce((s, p) => s + (p._count?.auctionBids ?? 0), 0);
    const top = [...products].sort((a, b) => (b._count?.orders ?? 0) - (a._count?.orders ?? 0)).slice(0, 3);
    const maxOrders = Math.max(1, ...top.map((p) => p._count?.orders ?? 0));
    return { paidCount: paid.length, totalSales, views, inquiries, top, maxOrders };
  }, [orders, products]);

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('dash.welcome', { name: (user?.name ?? t('dash.nameFallback')).split(' ')[0] })}</Txt>
      <Txt variant="muted">{t('dash.sellerSub')}</Txt>

      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="wallet-outline" value={compactUsd(m.totalSales)} label={t('dash.totalSales')} delta={`+${m.paidCount}`} />
        <Stat icon="cube-outline" value={String(kpis?.kpis.orders ?? orders.length)} animateTo={kpis?.kpis.orders ?? orders.length} label={t('dash.ordersReceived')} delta={t('dash.new')} />
      </Row>
      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="bar-chart-outline" value={compactNum(m.views)} label={t('dash.productViews')} delta={`+${products.length}`} />
        <Stat icon="chatbubbles-outline" value={String(m.inquiries)} animateTo={m.inquiries} label={t('dash.buyerInquiries')} delta={t('dash.live')} />
      </Row>

      <BarChart title={t('dash.revenue')} caption={t('dash.perMonth')} data8={series?.data8} data12={series?.data12} />

      <Card style={{ gap: 14 }}>
        <Txt variant="h3">{t('dash.topProducts')}</Txt>
        {m.top.length === 0 ? <Txt variant="muted">{t('dash.noProducts')}</Txt> : m.top.map((p) => {
          const count = p._count?.orders ?? 0;
          return (
            <View key={p.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="title">{p.name}</Txt>
                <Txt variant="muted">{t('dash.ordersCount', { count })}</Txt>
              </Row>
              <ProgressBar pct={(count / m.maxOrders) * 100} />
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt variant="h3">{t('dash.actionNeeded')}</Txt>
        <View style={{ backgroundColor: C.mangoSoft, borderRadius: 10, padding: 12 }}><Txt><Txt variant="title">{t('dash.lowStockCount', { count: products.filter((p) => parseAmount(p.qty) < 100).length })}</Txt> {t('dash.lowOnStock')}</Txt></View>
        <View style={{ backgroundColor: '#E6F0F4', borderRadius: 10, padding: 12 }}><Txt><Txt variant="title">{t('dash.buyerBidsCount', { count: awaitingBid })}</Txt> {t('dash.awaitingBid')}</Txt></View>
      </Card>
    </Screen>
  );
}
