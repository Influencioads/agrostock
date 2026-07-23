import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { ApiLoaderJob, ApiLoaderWorker } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { BarChart } from '../../ui/charts';
import { KeyValue, ProgressBar, Row, Txt } from '../../ui';
import { DashHeader, DashSection, StatCards } from '../components/dash-parts';
import { C, space } from '../../theme/tokens';

const ACTIVE = ['assigned', 'in_progress', 'pending_proof'];
const DAYS = [{ n: 1, key: 'mon' }, { n: 2, key: 'tue' }, { n: 3, key: 'wed' }, { n: 4, key: 'thu' }, { n: 5, key: 'fri' }, { n: 6, key: 'sat' }];
const SLOTS = ['morning', 'afternoon', 'evening'];

export function LoaderDashboard() {
  const { t } = useI18n();
  const { fmtCompactCents } = useCurrency();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <DashHeader
          name={t('dash.welcome', { name: (user?.name ?? t('dash.nameFallback')).split(' ')[0] })}
          sub={t('dash.loaderSub')}
        />

        <View style={{ paddingVertical: space.sm }}>
          <StatCards
            items={[
              { icon: 'briefcase-outline', value: String(activeJobs.length), label: t('dash.activeJobs') },
              { icon: 'document-text-outline', value: String(open.length), label: t('dash.jobRequests'), tint: C.gold },
              { icon: 'people-outline', value: `${onSite}/${workers.length}`, label: t('dash.workersOnsite') },
            ]}
          />
        </View>

        <DashSection>
          <KeyValue label={t('dash.thisMonth')} value={fmtCompactCents(wallet?.balanceCents ?? 0)} strong />
        </DashSection>

        <View style={{ backgroundColor: C.white, paddingVertical: space.lg }}>
          <BarChart title={t('dash.earnings')} caption={t('dash.perMonth')} data8={series?.data8} data12={series?.data12} />
        </View>

        <DashSection title={t('dash.crewAvailability')}>
          <Row gap={5}>
            <View style={{ width: 62 }} />
            {DAYS.map((d) => (
              <Txt key={d.n} variant="muted" style={{ flex: 1, textAlign: 'center' }}>{t(`dash.weekdayShort.${d.key}`)}</Txt>
            ))}
          </Row>
          {SLOTS.map((slot) => (
            <Row key={slot} gap={5}>
              <Txt variant="small" style={{ width: 62 }}>{t(`dash.slot.${slot}`)}</Txt>
              {DAYS.map((d) => (
                <View key={d.n} style={[s.cell, availOn(d.n, slot) ? s.cellOn : s.cellOff]} />
              ))}
            </Row>
          ))}
        </DashSection>

        <DashSection title={t('dash.crewStatus')}>
          {workers.length === 0 ? (
            <Txt variant="muted">{t('dash.noWorkers')}</Txt>
          ) : (
            crewStatus.map((c) => (
              <View key={c.status} style={{ gap: 6, paddingVertical: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="title">{t(`dash.workerStatus.${c.status}`, { defaultValue: c.status.replace('_', ' ') })}</Txt>
                  <Txt variant="muted">{t('dash.workersCount', { count: c.count })}</Txt>
                </Row>
                <ProgressBar pct={(c.count / maxCrew) * 100} />
              </View>
            ))
          )}
        </DashSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cell: { flex: 1, height: 20, borderRadius: 3 },
  cellOn: { backgroundColor: C.leaf },
  cellOff: { backgroundColor: C.page },
});
