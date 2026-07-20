import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiGeoRoute } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { Card, Loading, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type R = RouteProp<RootStackParamList, 'LiveTracking'>;

// Rough conversions from straight-line distance to a road estimate + ETA. These are
// intentionally labelled as estimates — the backend returns great-circle distance,
// and there is no live GPS feed for trips yet.
const ROAD_FACTOR = 1.3;
const AVG_ROAD_KMH = 45;

// react-native-maps is a NATIVE module — this screen needs a dev/native build (the
// Google Maps key is injected via app.config.js). It is not available in plain Expo Go.
export function LiveTracking() {
  const { t } = useI18n();
  const { params } = useRoute<R>();
  const fromCity = params?.fromCity;
  const toCity = params?.toCity;
  const mapRef = useRef<MapView>(null);

  const enabled = Boolean(fromCity && toCity);
  const { data, isLoading, isError } = useQuery<ApiGeoRoute>({
    queryKey: ['geo', 'route', fromCity, toCity],
    queryFn: () => api.geo.route(fromCity!, toCity!),
    enabled,
    staleTime: 1000 * 60 * 60, // city coordinates are stable
  });

  // Frame both endpoints once they resolve.
  useEffect(() => {
    if (!data || !mapRef.current) return;
    mapRef.current.fitToCoordinates(
      [
        { latitude: data.from.lat, longitude: data.from.lng },
        { latitude: data.to.lat, longitude: data.to.lng },
      ],
      { edgePadding: { top: 64, right: 64, bottom: 64, left: 64 }, animated: true },
    );
  }, [data]);

  const roadKm = data ? Math.round(data.distanceKm * ROAD_FACTOR) : null;
  const etaHours = roadKm ? Math.max(1, Math.round(roadKm / AVG_ROAD_KMH)) : null;

  return (
    <Screen>
      <Txt variant="h2">{t('mobile2.tracking.title')}</Txt>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ height: 280 }}>
          {enabled && data ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: (data.from.lat + data.to.lat) / 2,
                longitude: (data.from.lng + data.to.lng) / 2,
                latitudeDelta: Math.abs(data.from.lat - data.to.lat) + 4,
                longitudeDelta: Math.abs(data.from.lng - data.to.lng) + 4,
              }}
            >
              <Marker
                coordinate={{ latitude: data.from.lat, longitude: data.from.lng }}
                title={data.from.label}
                description={t('mobile2.tracking.origin')}
                pinColor={C.green}
              />
              <Marker
                coordinate={{ latitude: data.to.lat, longitude: data.to.lng }}
                title={data.to.label}
                description={t('mobile2.tracking.destination')}
                pinColor={C.mango}
              />
              <Polyline
                coordinates={[
                  { latitude: data.from.lat, longitude: data.from.lng },
                  { latitude: data.to.lat, longitude: data.to.lng },
                ]}
                strokeColor={C.green}
                strokeWidth={3}
                geodesic
              />
            </MapView>
          ) : (
            <View style={styles.placeholder}>
              {isLoading ? (
                <Loading label={t('mobile2.tracking.locating')} />
              ) : (
                <>
                  <Ionicons name="map" size={40} color={C.green} />
                  <Txt variant="muted">
                    {isError
                      ? t('mobile2.tracking.notFound')
                      : enabled
                        ? t('mobile2.tracking.preview')
                        : t('mobile2.tracking.unavailable')}
                  </Txt>
                </>
              )}
            </View>
          )}
        </View>
      </Card>

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

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
