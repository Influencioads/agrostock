import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiOrder, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { parseAmount } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { BarChart } from '../../ui/charts';
import { ProgressBar, Row, Txt } from '../../ui';
import { DashHeader, DashSection, StatCards } from '../components/dash-parts';
import { C, radius, space, type } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type SellerProduct = ApiProduct & { _count?: { orders: number; auctionBids: number } };
const PAID = ['paid', 'shipped', 'in_transit', 'delivered'];

export function SellerDashboard() {
  const { t } = useI18n();
  const { fmtCompactCents } = useCurrency();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
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
    // Real engagement only: orders placed and bids received. A "views" figure was
    // shown here once, derived arithmetically from order counts — it measured
    // nothing and is gone.
    const inquiries = orders.filter((o) => o.status === 'quote').length + products.reduce((s, p) => s + (p._count?.auctionBids ?? 0), 0);
    const top = [...products].sort((a, b) => (b._count?.orders ?? 0) - (a._count?.orders ?? 0)).slice(0, 3);
    const maxOrders = Math.max(1, ...top.map((p) => p._count?.orders ?? 0));
    return { paidCount: paid.length, totalSales, inquiries, top, maxOrders };
  }, [orders, products]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <DashHeader
          name={user?.name ?? t('dash.nameFallback')}
          sub={t('dash.sellerSub')}
          right={
            <Pressable onPress={() => nav.navigate('Section', { role: 'seller', section: 'add', title: t('dash.addProduct') })} style={s.addBtn}>
              <Ionicons name="add" size={18} color={C.white} />
              <Text style={s.addBtnText}>{t('dash.product')}</Text>
            </Pressable>
          }
        />

        <View style={{ paddingVertical: space.sm }}>
          <StatCards
            items={[
              { icon: 'cube-outline', value: String(products.length), label: t('dash.liveListings') },
              { icon: 'document-text-outline', value: String(awaitingBid), label: t('dash.openRfqs'), tint: C.gold },
              { icon: 'card-outline', value: fmtCompactCents(m.totalSales * 100), label: t('dash.totalSales') },
            ]}
          />
        </View>

        <View style={{ backgroundColor: C.white, paddingVertical: space.lg }}>
          <BarChart title={t('dash.revenue')} caption={t('dash.perMonth')} data8={series?.data8} data12={series?.data12} />
        </View>

        <DashSection title={t('dash.topProducts')}>
          {m.top.length === 0 ? (
            <Txt variant="muted">{t('dash.noProducts')}</Txt>
          ) : (
            m.top.map((p) => {
              const count = p._count?.orders ?? 0;
              return (
                <View key={p.id} style={{ gap: 6, paddingVertical: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt variant="title" numberOfLines={1}>{p.name}</Txt>
                    <Txt variant="muted">{t('dash.ordersCount', { count })}</Txt>
                  </Row>
                  <ProgressBar pct={(count / m.maxOrders) * 100} />
                </View>
              );
            })
          )}
        </DashSection>

        <DashSection title={t('dash.actionNeeded')}>
          <View style={{ backgroundColor: C.mangoSoft, borderRadius: radius.card, padding: space.md }}>
            <Txt>
              <Txt variant="title">{t('dash.lowStockCount', { count: products.filter((p) => parseAmount(p.qty) < 100).length })}</Txt>
              {' '}{t('dash.lowOnStock')}
            </Txt>
          </View>
          <View style={{ backgroundColor: '#E6F0F4', borderRadius: radius.card, padding: space.md }}>
            <Txt>
              <Txt variant="title">{t('dash.buyerBidsCount', { count: awaitingBid })}</Txt>
              {' '}{t('dash.awaitingBid')}
            </Txt>
          </View>
        </DashSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.green, borderRadius: radius.pill, paddingHorizontal: 16, height: 42, ...({ shadowColor: C.green, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }) },
  addBtnText: { ...type.title, fontSize: 14, color: C.white },
});
