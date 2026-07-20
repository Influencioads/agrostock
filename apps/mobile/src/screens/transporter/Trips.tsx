import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { tripNext, tripTone } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';

interface Trip { id: string; reference: string; fromCity: string; toCity: string; cargo: string; status: string; otp: string | null }

export function TransporterTrips() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: trips = [], isLoading } = useQuery<Trip[]>({ queryKey: ['trips', 'mine'], queryFn: () => api.transport.myTrips() as Promise<Trip[]>, enabled: !!user });
  const adv = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.transport.setTripStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', 'mine'] }),
  });

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('mobile2.trips.title')}</Txt>
      {isLoading ? (
        <Loading />
      ) : trips.length === 0 ? (
        <EmptyState icon="car-outline" title={t('mobile2.trips.empty')} body={t('mobile2.trips.emptyBody')} />
      ) : (
        trips.map((trip) => {
          const next = tripNext[trip.status];
          return (
            <Card key={trip.id} style={{ gap: 10 }}>
              <View>
                <Txt variant="title">{trip.fromCity} → {trip.toCity}</Txt>
                <Txt variant="muted">#{trip.reference} · {trip.cargo}{trip.otp ? ` · OTP ${trip.otp}` : ''}</Txt>
              </View>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge label={trip.status.replace('_', ' ')} tone={tripTone[trip.status] ?? 'slate'} />
                {next ? <Button title={t('mobile2.trips.mark', { status: next.replace('_', ' ') })} size="sm" loading={adv.isPending} onPress={() => adv.mutate({ id: trip.id, status: next })} /> : null}
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
