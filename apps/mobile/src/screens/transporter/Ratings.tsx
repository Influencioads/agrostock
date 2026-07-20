import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiDriver } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { Card, EmptyState, Loading, ProgressBar, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';

export function TransporterRatings() {
  const { t } = useI18n();
  const { data: drivers = [], isLoading } = useQuery<ApiDriver[]>({
    queryKey: ['my-drivers'],
    queryFn: () => api.drivers.mine(),
  });

  return (
    <Screen>
      <Txt variant="h2">{t('transX.ratings.title')}</Txt>
      <Txt variant="muted">{t('transX.ratings.subtitle')}</Txt>
      {isLoading ? (
        <Loading />
      ) : drivers.length === 0 ? (
        <EmptyState icon="star-outline" title={t('transX.ratings.emptyTitle')} body={t('transX.ratings.emptyBody')} />
      ) : (
        drivers.map((driver) => (
          <Card key={driver.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Txt variant="title">{driver.name}</Txt>
                <Txt variant="muted">{driver.vehicle ?? t('transX.ratings.noVehicle')}</Txt>
              </View>
              <Txt variant="title" color={C.mangoDeep}>{driver.ratingPct ?? 0}%</Txt>
            </Row>
            <ProgressBar pct={driver.ratingPct ?? 0} color={C.mangoDeep} />
            <Txt variant="small" color={C.inkSoft}>{t('transX.ratings.onTime', { pct: driver.onTimePct ?? 0 })}</Txt>
          </Card>
        ))
      )}
    </Screen>
  );
}
