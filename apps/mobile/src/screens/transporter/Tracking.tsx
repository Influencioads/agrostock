import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { RootStackParamList } from '../../navigation/types';
import { Badge, Button, Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';
import { tripTone } from '../../lib/format';
import { useI18n } from '../../i18n';

type Nav = NativeStackNavigationProp<RootStackParamList>;
interface Trip { id: string; reference: string; fromCity: string; toCity: string; cargo: string; status: string }

export function TransporterTracking() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ['trips', 'mine'],
    queryFn: () => api.transport.myTrips() as Promise<Trip[]>,
  });
  const active = trips.filter((trip) => !['delivered', 'cancelled'].includes(trip.status));

  return (
    <Screen>
      <Txt variant="h2">{t('transX.tracking.title')}</Txt>
      <Txt variant="muted">{t('transX.tracking.subtitle')}</Txt>
      {isLoading ? (
        <Loading />
      ) : active.length === 0 ? (
        <EmptyState icon="map-outline" title={t('transX.tracking.emptyTitle')} body={t('transX.tracking.emptyBody')} />
      ) : (
        active.map((trip) => (
          <Card key={trip.id} style={{ gap: 10 }}>
            <View>
              <Txt variant="title">{trip.fromCity} {t('transX.tracking.arrow')} {trip.toCity}</Txt>
              <Txt variant="muted">#{trip.reference} - {trip.cargo}</Txt>
            </View>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge label={trip.status.replace('_', ' ')} tone={tripTone[trip.status] ?? 'slate'} />
              <Button
                title={t('transX.tracking.openMap')}
                size="sm"
                icon="map-outline"
                onPress={() =>
                  nav.navigate('LiveTracking', {
                    reference: trip.reference,
                    fromCity: trip.fromCity,
                    toCity: trip.toCity,
                    cargo: trip.cargo,
                    status: trip.status,
                  })
                }
              />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
