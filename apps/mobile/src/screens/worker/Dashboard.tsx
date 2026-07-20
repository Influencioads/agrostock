import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { usd } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { View } from 'react-native';
import { Badge, Button, Card, Row, Screen, Stat, Txt } from '../../ui';

export function WorkerDashboard() {
  const { t } = useI18n();
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
    <Screen edges={['top']}>
      <Txt variant="h2">{t('dash.welcome', { name: (user?.name ?? t('dash.nameFallback')).split(' ')[0] })}</Txt>
      <Txt variant="muted">{t('dash.workerSub')}</Txt>

      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt variant="title">{t('dash.availability')}</Txt>
          <Badge label={available ? t('dash.availableBadge') : t('dash.offBadge')} tone={available ? 'green' : 'slate'} />
        </Row>
        <Txt variant="muted" style={{ marginTop: 4 }}>
          {available ? t('dash.online') : t('dash.offline')}
        </Txt>
        <View style={{ marginTop: 10 }}>
          <Button
            title={available ? t('dash.goOffline') : t('dash.goOnline')}
            variant={available ? 'outline' : 'accent'}
            loading={toggle.isPending}
            onPress={() => toggle.mutate(!available)}
          />
        </View>
      </Card>

      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="wallet-outline" value={usd(kpis.earnedCents)} label={t('dash.totalEarned')} delta={t('dash.paid')} />
        <Stat icon="checkmark-done-outline" value={String(kpis.completed ?? 0)} label={t('dash.completed')} delta={t('dash.allTime')} />
      </Row>
      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="briefcase-outline" value={String(kpis.assignments ?? 0)} label={t('dash.assignments')} delta={t('dash.live')} />
        <Stat icon="star-outline" value={dash?.rating ? dash.rating.toFixed(1) : '—'} label={t('dash.rating')} delta={t('dash.avg')} />
      </Row>
    </Screen>
  );
}
