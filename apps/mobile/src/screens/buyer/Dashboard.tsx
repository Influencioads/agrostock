import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { ApiOrder } from '@agrotraders/api-client';
import type { RootStackParamList } from '../../navigation/types';
import { api } from '../../lib/api';
import { parseAmount } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { BarChart } from '../../ui/charts';
import { KeyValue, ProgressBar, Row, Txt } from '../../ui';
import { DashHeader, DashSection, QuickGrid, StatCards } from '../components/dash-parts';
import { C, space } from '../../theme/tokens';

export function BuyerDashboard() {
  const { t } = useI18n();
  const { fmtCents, fmtCompactCents } = useCurrency();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: dash } = useQuery<{ kpis: Record<string, number> }>({ queryKey: ['me-dashboard'], queryFn: () => api.me.dashboard(), enabled: !!user });
  const { data: wallet } = useQuery<{ balanceCents: number }>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>, enabled: !!user });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series(), enabled: !!user });
  const { data: orders = [] } = useQuery<ApiOrder[]>({ queryKey: ['orders', 'mine'], queryFn: () => api.orders.mine() as Promise<ApiOrder[]>, enabled: !!user });

  const kpis = dash?.kpis ?? {};
  const deliveries = orders.filter((o) => ['shipped', 'in_transit'].includes(o.status)).slice(0, 4);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <DashHeader
          name={t('dash.welcome', { name: (user?.name ?? t('dash.nameFallback')).split(' ')[0] })}
          sub={t('dash.buyerSub')}
          onBell={() => nav.navigate('Notifications')}
        />

        <View style={{ gap: space.md, paddingVertical: space.sm }}>
          <StatCards
            items={[
              { icon: 'document-text-outline', value: String(kpis.bids ?? 0), label: t('dash.activeBids') },
              { icon: 'shield-checkmark-outline', value: fmtCompactCents(wallet?.balanceCents ?? 0), label: t('dash.escrow'), tint: C.gold },
              { icon: 'cube-outline', value: String(kpis.active ?? 0), label: t('dash.activeOrders') },
            ]}
          />
          <QuickGrid
            items={[
              { icon: 'document-text-outline', label: t('dash.quickPostRfq'), onPress: () => nav.navigate('BuyerBidsBoard') },
              { icon: 'car-outline', label: t('dash.quickHireTransport'), onPress: () => nav.navigate('Directory', { type: 'transporters', title: t('nav:directory.transporters') }) },
              { icon: 'card-outline', label: t('dash.quickWallet'), onPress: () => nav.navigate('Section', { role: 'buyer', section: 'wallet', title: t('dash.quickWallet') }) },
              { icon: 'shield-checkmark-outline', label: t('dash.quickKyc'), onPress: () => nav.navigate('Kyc') },
            ]}
          />
        </View>

        <DashSection title={t('dash.safeDeal')}>
          <KeyValue label={t('dash.escrow')} value={fmtCents(wallet?.balanceCents)} strong />
          <KeyValue label={t('dash.totalSpent')} value={fmtCompactCents(orders.reduce((s, o) => s + parseAmount(o.amount), 0) * 100)} strong />
        </DashSection>

        <View style={{ backgroundColor: C.white, paddingVertical: space.lg }}>
          <BarChart title={t('dash.procurementSpend')} caption={t('dash.perMonth')} data8={series?.data8} data12={series?.data12} />
        </View>

        <DashSection title={t('dash.activeDeliveries')}>
          {deliveries.length === 0 ? (
            <Txt variant="muted">{t('dash.noShipments')}</Txt>
          ) : (
            deliveries.map((o, i) => (
              <View key={o.id} style={{ gap: 6, paddingVertical: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="title">{o.product?.name ?? t('dash.shipmentFallback')}</Txt>
                  <Txt variant="muted">{t('dash.etaDays', { count: o.status === 'in_transit' ? 2 + i : 5 + i })}</Txt>
                </Row>
                <ProgressBar pct={o.status === 'in_transit' ? 72 : 35} />
              </View>
            ))
          )}
        </DashSection>
      </ScrollView>
    </SafeAreaView>
  );
}
