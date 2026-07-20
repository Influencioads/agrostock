import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiDriver } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { compactUsd } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { BarChart } from '../../ui/charts';
import { Card, ProgressBar, Row, Screen, Stat, Txt } from '../../ui';
import { C } from '../../theme/tokens';

interface Trip { id: string; reference: string; status: string }
const ACTIVE = ['pending', 'loading', 'in_transit', 'delayed'];

export function TransporterDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: trips = [] } = useQuery<Trip[]>({ queryKey: ['trips', 'mine'], queryFn: () => api.transport.myTrips() as Promise<Trip[]>, enabled: !!user });
  const { data: requests = [] } = useQuery<unknown[]>({ queryKey: ['requests', 'open'], queryFn: () => api.transport.requestsOpen() as Promise<unknown[]>, enabled: !!user });
  const { data: vehicles = [] } = useQuery<unknown[]>({ queryKey: ['vehicles'], queryFn: () => api.transport.vehicles() as Promise<unknown[]>, enabled: !!user });
  const { data: drivers = [] } = useQuery<ApiDriver[]>({ queryKey: ['my-drivers'], queryFn: () => api.drivers.mine(), enabled: !!user });
  const { data: wallet } = useQuery<{ balanceCents: number }>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>, enabled: !!user });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series(), enabled: !!user });

  const active = trips.filter((t) => ACTIVE.includes(t.status));
  const utilization = Math.min(100, Math.round((active.length / Math.max(vehicles.length, 1)) * 100));
  const topDrivers = [...drivers].sort((a, b) => (b.onTimePct ?? 0) - (a.onTimePct ?? 0)).slice(0, 2);

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('dash.welcome', { name: (user?.name ?? t('dash.nameFallback')).split(' ')[0] })}</Txt>
      <Txt variant="muted">{t('dash.transporterSub')}</Txt>

      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="car-outline" value={String(active.length)} label={t('dash.activeTrips')} delta={`+${active.length}`} />
        <Stat icon="cube-outline" value={String(requests.length)} label={t('dash.availableRequests')} delta={t('dash.newBadge')} />
      </Row>
      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="wallet-outline" value={compactUsd((wallet?.balanceCents ?? 0) / 100)} label={t('dash.thisMonth')} delta="+8%" />
        <Stat icon="speedometer-outline" value={`${utilization}%`} label={t('dash.fleetUtilization')} delta="+5%" />
      </Row>

      <BarChart title={t('dash.earnings')} caption={t('dash.perMonth')} data8={series?.data8} data12={series?.data12} />

      <Card style={{ gap: 10 }}>
        <Txt variant="h3">{t('dash.liveTracking')}</Txt>
        <View style={{ height: 130, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="map-outline" size={30} color={C.green} />
          <Txt variant="muted">{trips.find((tr) => tr.status === 'in_transit')?.reference ?? 'TR-441'} · {t('dash.trackingMeta', { km: 320, h: 6 })}</Txt>
        </View>
      </Card>

      <Card style={{ gap: 14 }}>
        <Txt variant="h3">{t('dash.driverPerformance')}</Txt>
        {topDrivers.length === 0 ? (
          <Txt variant="muted">{t('dash.noDrivers')}</Txt>
        ) : (
          topDrivers.map((d) => (
            <View key={d.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="title">{d.name} · <Txt color={C.mangoDeep}>★ {d.ratingPct ?? 0}%</Txt></Txt>
                <Txt variant="muted">{t('dash.onTime', { pct: d.onTimePct ?? 0 })}</Txt>
              </Row>
              <ProgressBar pct={d.onTimePct ?? 0} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
