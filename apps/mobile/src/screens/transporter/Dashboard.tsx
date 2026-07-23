import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiDriver } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { BarChart } from '../../ui/charts';
import { KeyValue, ProgressBar, Row, Txt } from '../../ui';
import { DashHeader, DashSection, StatCards } from '../components/dash-parts';
import { C, radius, space, type } from '../../theme/tokens';

interface Trip { id: string; reference: string; status: string }
const ACTIVE = ['pending', 'loading', 'in_transit', 'delayed'];

export function TransporterDashboard() {
  const { t } = useI18n();
  const { fmtCompactCents } = useCurrency();
  const { user } = useAuth();
  const { data: trips = [] } = useQuery<Trip[]>({ queryKey: ['trips', 'mine'], queryFn: () => api.transport.myTrips() as Promise<Trip[]>, enabled: !!user });
  const { data: vehicles = [] } = useQuery<unknown[]>({ queryKey: ['vehicles'], queryFn: () => api.transport.vehicles() as Promise<unknown[]>, enabled: !!user });
  const { data: drivers = [] } = useQuery<ApiDriver[]>({ queryKey: ['my-drivers'], queryFn: () => api.drivers.mine(), enabled: !!user });
  const { data: wallet } = useQuery<{ balanceCents: number }>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>, enabled: !!user });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series(), enabled: !!user });

  const active = trips.filter((tr) => ACTIVE.includes(tr.status));
  const utilization = Math.min(100, Math.round((active.length / Math.max(vehicles.length, 1)) * 100));
  const topDrivers = [...drivers].sort((a, b) => (b.onTimePct ?? 0) - (a.onTimePct ?? 0)).slice(0, 3);
  const inTransit = trips.find((tr) => tr.status === 'in_transit');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <DashHeader
          name={user?.name ?? t('dash.nameFallback')}
          sub={t('dash.transporterSub')}
        />

        {/* Online-status banner. */}
        <View style={s.onlineBanner}>
          <View style={s.onlineDot} />
          <Txt variant="small" color={C.green} style={{ flex: 1, fontFamily: type.title.fontFamily }}>{t('dash.online')}</Txt>
        </View>

        <View style={{ paddingVertical: space.sm }}>
          <StatCards
            items={[
              { icon: 'card-outline', value: fmtCompactCents(wallet?.balanceCents ?? 0), label: t('dash.earningsWeek') },
              { icon: 'car-outline', value: String(active.length), label: t('dash.activeTrips'), tint: C.gold },
              { icon: 'star-outline', value: `${utilization}%`, label: t('dash.fleetUtilization') },
            ]}
          />
        </View>

        <DashSection>
          <KeyValue label={t('dash.thisMonth')} value={fmtCompactCents(wallet?.balanceCents ?? 0)} strong />
        </DashSection>

        <View style={{ backgroundColor: C.white, paddingVertical: space.lg }}>
          <BarChart title={t('dash.earnings')} caption={t('dash.perMonth')} data8={series?.data8} data12={series?.data12} />
        </View>

        {/* Only shown when a trip is genuinely in transit — this panel used to
            fall back to a hardcoded reference and distance. */}
        {inTransit ? (
          <DashSection title={t('dash.liveTracking')}>
            <View style={s.map}>
              <Ionicons name="map-outline" size={28} color={C.green} />
              <Txt variant="title">{inTransit.reference}</Txt>
            </View>
          </DashSection>
        ) : null}

        <DashSection title={t('dash.driverPerformance')}>
          {topDrivers.length === 0 ? (
            <Txt variant="muted">{t('dash.noDrivers')}</Txt>
          ) : (
            topDrivers.map((d) => (
              <View key={d.id} style={{ gap: 6, paddingVertical: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="title" numberOfLines={1}>{d.name}</Txt>
                  <Txt variant="muted">{t('dash.onTime', { pct: d.onTimePct ?? 0 })}</Txt>
                </Row>
                <ProgressBar pct={d.onTimePct ?? 0} />
              </View>
            ))
          )}
        </DashSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  onlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: radius.card, marginHorizontal: space.lg, paddingHorizontal: 16, paddingVertical: 14 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  map: {
    height: 120,
    borderRadius: radius.card,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
