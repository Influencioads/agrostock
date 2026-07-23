import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, KeyValue, Row, Txt } from '../../ui';
import { DashHeader, DashSection, StatCards } from '../components/dash-parts';
import { C, space } from '../../theme/tokens';

export function WorkerDashboard() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: dash } = useQuery({ queryKey: ['me-dashboard'], queryFn: () => api.me.dashboard(), enabled: !!user });
  const kpis = dash?.kpis ?? {};
  const available = dash?.available ?? false;

  const toggle = useMutation({
    mutationFn: (next: boolean) => api.loaders.setWorkerAvailability(next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-dashboard'] }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <DashHeader
          name={t('dash.welcome', { name: (user?.name ?? t('dash.nameFallback')).split(' ')[0] })}
          sub={t('dash.workerSub')}
        />

        {/* Availability is the one control a worker uses every shift, so it sits
            above the numbers rather than below them. */}
        <View style={[s.availability, available && s.availabilityOn]}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="title">{t('dash.availability')}</Txt>
            <Badge label={available ? t('dash.availableBadge') : t('dash.offBadge')} tone={available ? 'green' : 'slate'} />
          </Row>
          <Txt variant="muted" style={{ marginTop: 4 }}>
            {available ? t('dash.online') : t('dash.offline')}
          </Txt>
          <View style={{ marginTop: space.md }}>
            <Button
              full
              title={available ? t('dash.goOffline') : t('dash.goOnline')}
              variant={available ? 'outline' : 'accent'}
              loading={toggle.isPending}
              onPress={() => toggle.mutate(!available)}
            />
          </View>
        </View>

        <View style={{ paddingVertical: space.sm }}>
          <StatCards
            items={[
              { icon: 'wallet-outline', value: fmtCents(kpis.earnedCents), label: t('dash.totalEarned') },
              { icon: 'checkmark-circle-outline', value: String(kpis.completed ?? 0), label: t('dash.completed'), tint: C.gold },
              { icon: 'briefcase-outline', value: String(kpis.assignments ?? 0), label: t('dash.assignments') },
            ]}
          />
        </View>

        {/* A single figure in a StatStrip would sit in a third of the width with
            two empty columns beside it, so the rating reads better as a row. */}
        <DashSection>
          <KeyValue label={t('dash.rating')} value={dash?.rating ? dash.rating.toFixed(1) : '—'} strong />
        </DashSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  availability: { backgroundColor: C.white, paddingHorizontal: space.lg, paddingVertical: space.lg },
  availabilityOn: { borderStartWidth: 3, borderStartColor: C.green },
});
