import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { ApiOrder, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { parseAmount, orderLabel, orderTone } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, KeyValue, ProgressBar, Row, SkeletonStats, StatStrip, Txt } from '../../ui';
import { DashSection } from '../components/dash-parts';
import { C, space } from '../../theme/tokens';

type SellerProduct = ApiProduct & { _count?: { orders: number; auctionBids: number } };

/** Analytics — performance across the seller's catalogue. */
export function SellerAnalytics() {
  const { t } = useI18n();
  const { fmtCompactCents } = useCurrency();
  const { user } = useAuth();
  const { data: products = [], isLoading } = useQuery<SellerProduct[]>({
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

  // Reached from the More menu, so the stack header supplies the title; the
  // body starts straight into the numbers.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <DashSection padded={false}>
          {isLoading ? (
            <View style={{ paddingHorizontal: space.lg }}><SkeletonStats /></View>
          ) : (
            <StatStrip
              items={[
                { value: fmtCompactCents(revenue * 100), label: t('sellerX.analytics.grossRevenue') },
                { value: String(products.length), label: t('sellerX.analytics.listings'), animateTo: products.length },
                { value: String(orders.length), label: t('sellerX.analytics.orders'), animateTo: orders.length },
              ]}
            />
          )}
        </DashSection>

        {/* One figure in a three-column strip would leave two empty columns. */}
        <DashSection>
          <KeyValue label={t('sellerX.analytics.totalBids')} value={String(totalBids)} strong />
        </DashSection>

        <DashSection title={t('sellerX.analytics.ordersByStatus')}>
          {statusMix.entries.length === 0 ? (
            <Txt variant="muted">{t('sellerX.analytics.noOrders')}</Txt>
          ) : (
            statusMix.entries.map(([status, count]) => (
              <View key={status} style={{ gap: 6, paddingVertical: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Badge label={orderLabel[status] ?? status} tone={orderTone[status] ?? 'slate'} />
                  <Txt variant="muted">{count}</Txt>
                </Row>
                <ProgressBar pct={(count / statusMix.max) * 100} />
              </View>
            ))
          )}
        </DashSection>
      </ScrollView>
    </SafeAreaView>
  );
}
