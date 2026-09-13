import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiGeoRoute } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { Card, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { TrackingMap } from './TrackingMap';

type R = RouteProp<RootStackParamList, 'LiveTracking'>;

// Rough conversions from straight-line distance to a road estimate + ETA. These are
// intentionally labelled as estimates — the backend returns great-circle distance,
// and there is no live GPS feed for trips yet.
const ROAD_FACTOR = 1.3;
const AVG_ROAD_KMH = 45;

// The map lives in TrackingMap, which is platform-split: Android draws a Google map,
// iOS renders nothing (see TrackingMap.ios.tsx). Everything below the map — route,
// distance, ETA, status — is shared and shows on both platforms.
export function LiveTracking() {
  const { t } = useI18n();
  const { params } = useRoute<R>();
  const fromCity = params?.fromCity;
  const toCity = params?.toCity;

  const enabled = Boolean(fromCity && toCity);
  const { data, isLoading, isError } = useQuery<ApiGeoRoute>({
    queryKey: ['geo', 'route', fromCity, toCity],
    queryFn: () => api.geo.route(fromCity!, toCity!),
    enabled,
    staleTime: 1000 * 60 * 60, // city coordinates are stable
  });

  const roadKm = data ? Math.round(data.distanceKm * ROAD_FACTOR) : null;
  const etaHours = roadKm ? Math.max(1, Math.round(roadKm / AVG_ROAD_KMH)) : null;

  return (
    <Screen>
      <Txt variant="h2">{t('mobile2.tracking.title')}</Txt>

      <TrackingMap route={data} enabled={enabled} isLoading={isLoading} isError={isError} />

      <Card style={{ gap: 8 }}>
        <Row style={{ alignItems: 'center', gap: 10 }}>
          <Ionicons name="car" size={22} color={C.dark} />
          <Txt variant="title">
            {params?.reference ?? t('mobile2.tracking.tripFallback')}
            {params?.cargo ? ` · ${params.cargo}` : ''}
          </Txt>
        </Row>
        {fromCity && toCity ? (
          <Txt variant="muted">
            {fromCity} → {toCity}
          </Txt>
        ) : null}
        {roadKm ? (
          <Row style={{ alignItems: 'center', gap: 10 }}>
            <Ionicons name="navigate" size={18} color={C.green} />
            <Txt variant="muted">
              {t('mobile2.tracking.byRoad', { km: roadKm.toLocaleString(), h: etaHours, straight: data!.distanceKm.toLocaleString() })}
            </Txt>
          </Row>
        ) : null}
        {params?.status ? <Txt variant="muted">{t('mobile2.tracking.status', { status: params.status.replace(/_/g, ' ') })}</Txt> : null}
      </Card>
    </Screen>
  );
}
