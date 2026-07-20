import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiLoaderJob, ApiLoaderWorker } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { compactUsd } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { BarChart } from '../../ui/charts';
import { Card, ProgressBar, Row, Screen, Stat, Txt } from '../../ui';
import { C } from '../../theme/tokens';

const ACTIVE = ['assigned', 'in_progress', 'pending_proof'];
const DAYS = [{ n: 1, key: 'mon' }, { n: 2, key: 'tue' }, { n: 3, key: 'wed' }, { n: 4, key: 'thu' }, { n: 5, key: 'fri' }, { n: 6, key: 'sat' }];
const SLOTS = ['morning', 'afternoon', 'evening'];

export function LoaderDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: mine = [] } = useQuery<ApiLoaderJob[]>({ queryKey: ['jobs', 'mine'], queryFn: () => api.loaders.myJobs(), enabled: !!user });
  const { data: open = [] } = useQuery<ApiLoaderJob[]>({ queryKey: ['jobs', 'open'], queryFn: () => api.loaders.openJobs(), enabled: !!user });
  const { data: workers = [] } = useQuery<ApiLoaderWorker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers(), enabled: !!user });
  const { data: wallet } = useQuery<{ balanceCents: number }>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>, enabled: !!user });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series(), enabled: !!user });
  const { data: availRows = [] } = useQuery({ queryKey: ['loader-availability'], queryFn: () => api.loaders.availability(), enabled: !!user });
  const availOn = (weekday: number, slot: string) => availRows.some((r) => r.weekday === weekday && r.slot === slot && r.available);

  const activeJobs = mine.filter((j) => ACTIVE.includes(j.status));
  const onSite = workers.filter((w) => w.status === 'on_site').length;
  const crewStatus = ['available', 'on_site', 'off'].map((sName) => ({ status: sName, count: workers.filter((w) => w.status === sName).length }));
  const maxCrew = Math.max(1, ...crewStatus.map((c) => c.count));

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('dash.welcome', { name: (user?.name ?? t('dash.nameFallback')).split(' ')[0] })}</Txt>
      <Txt variant="muted">{t('dash.loaderSub')}</Txt>

      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="people-outline" value={String(activeJobs.length)} label={t('dash.activeJobs')} delta={`+${activeJobs.length}`} />
        <Stat icon="cube-outline" value={String(open.length)} label={t('dash.jobRequests')} delta={t('dash.newBadge')} />
      </Row>
      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="speedometer-outline" value={String(onSite)} label={t('dash.workersOnsite')} delta={`/${workers.length}`} />
        <Stat icon="wallet-outline" value={compactUsd((wallet?.balanceCents ?? 0) / 100)} label={t('dash.thisMonth')} />
      </Row>

      <BarChart title={t('dash.earnings')} caption={t('dash.perMonth')} data8={series?.data8} data12={series?.data12} />

      <Card style={{ gap: 10 }}>
        <Txt variant="h3">{t('dash.crewAvailability')}</Txt>
        <Row gap={6}>
          <View style={{ width: 64 }} />
          {DAYS.map((d, i) => <Txt key={i} variant="muted" style={{ flex: 1, textAlign: 'center' }}>{t(`dash.weekdayShort.${d.key}`)}</Txt>)}
        </Row>
        {SLOTS.map((slot) => (
          <Row key={slot} gap={6}>
            <Txt variant="small" style={{ width: 64 }}>{t(`dash.slot.${slot}`)}</Txt>
            {DAYS.map((d) => (
              <View key={d.n} style={{ flex: 1, height: 22, borderRadius: 6, backgroundColor: availOn(d.n, slot) ? C.leaf : C.bg }} />
            ))}
          </Row>
        ))}
      </Card>

      <Card style={{ gap: 14 }}>
        <Txt variant="h3">{t('dash.crewStatus')}</Txt>
        {workers.length === 0 ? <Txt variant="muted">{t('dash.noWorkers')}</Txt> : crewStatus.map((c) => (
          <View key={c.status} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="title">{t(`dash.workerStatus.${c.status}`, { defaultValue: c.status.replace('_', ' ') })}</Txt>
              <Txt variant="muted">{t('dash.workersCount', { count: c.count })}</Txt>
            </Row>
            <ProgressBar pct={(c.count / maxCrew) * 100} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
