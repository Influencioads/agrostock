import { useMemo } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiOrder, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { compactUsd, parseAmount, orderLabel, orderTone } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Card, ProgressBar, Row, Screen, Stat, Txt } from '../../ui';

type SellerProduct = ApiProduct & { _count?: { orders: number; auctionBids: number } };

/** Analytics — performance across the seller's catalogue. */
export function SellerAnalytics() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: products = [] } = useQuery<SellerProduct[]>({
    queryKey: ['products', 'mine'], queryFn: () => api.products.mine() as Promise<SellerProduct[]>, enabled: !!user,
  });
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'incoming'], queryFn: () => api.orders.incoming() as Promise<ApiOrder[]>, enabled: !!user,
  });

  const statusMix = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    return { entries: Object.entries(counts), max };
  }, [orders]);

  const revenue = orders.reduce((s, o) => s + parseAmount(o.amount), 0);
  const totalBids = products.reduce((s, p) => s + (p._count?.auctionBids ?? 0), 0);

  return (
    <Screen>
      <Txt variant="h2">{t('sellerX.analytics.title')}</Txt>
      <Row gap={12}>
        <Stat icon="cash-outline" value={compactUsd(revenue)} label={t('sellerX.analytics.grossRevenue')} />
        <Stat icon="storefront-outline" value={String(products.length)} label={t('sellerX.analytics.listings')} />
      </Row>
      <Row gap={12}>
        <Stat icon="cube-outline" value={String(orders.length)} label={t('sellerX.analytics.orders')} />
        <Stat icon="hammer-outline" value={String(totalBids)} label={t('sellerX.analytics.totalBids')} />
      </Row>

      <Card style={{ gap: 12 }}>
        <Txt variant="h3">{t('sellerX.analytics.ordersByStatus')}</Txt>
        {statusMix.entries.length === 0 ? (
          <Txt variant="muted">{t('sellerX.analytics.noOrders')}</Txt>
        ) : (
          statusMix.entries.map(([status, count]) => (
            <View key={status} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge label={orderLabel[status] ?? status} tone={orderTone[status] ?? 'slate'} />
                <Txt variant="muted">{count}</Txt>
              </Row>
              <ProgressBar pct={(count / statusMix.max) * 100} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
