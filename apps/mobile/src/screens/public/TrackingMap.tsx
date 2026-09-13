import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import type { ApiGeoRoute } from '@agrotraders/api-client';
import { useI18n } from '../../i18n';
import { Card, Loading, Txt } from '../../ui';
import { C } from '../../theme/tokens';

export type TrackingMapProps = {
  route?: ApiGeoRoute;
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
};

/**
 * The map half of the Live Tracking screen — ANDROID (and any non-iOS platform).
 *
 * react-native-maps is a NATIVE module, so this needs a dev/native build; it does
 * not run in plain Expo Go. The Google provider's key is injected into the native
 * manifest by app.config.js.
 *
 * There is a sibling `TrackingMap.ios.tsx` that renders nothing. Metro resolves the
 * platform suffix first, so the iOS bundle never imports react-native-maps at all —
 * see that file for why iOS ships without a map.
 */
export function TrackingMap({ route, enabled, isLoading, isError }: TrackingMapProps) {
  const { t } = useI18n();
  const mapRef = useRef<MapView>(null);

  // Frame both endpoints once they resolve.
  useEffect(() => {
    if (!route || !mapRef.current) return;
    mapRef.current.fitToCoordinates(
      [
        { latitude: route.from.lat, longitude: route.from.lng },
        { latitude: route.to.lat, longitude: route.to.lng },
      ],
      { edgePadding: { top: 64, right: 64, bottom: 64, left: 64 }, animated: true },
    );
  }, [route]);

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ height: 280 }}>
        {enabled && route ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: (route.from.lat + route.to.lat) / 2,
              longitude: (route.from.lng + route.to.lng) / 2,
              latitudeDelta: Math.abs(route.from.lat - route.to.lat) + 4,
              longitudeDelta: Math.abs(route.from.lng - route.to.lng) + 4,
            }}
          >
            <Marker
              coordinate={{ latitude: route.from.lat, longitude: route.from.lng }}
              title={route.from.label}
              description={t('mobile2.tracking.origin')}
              pinColor={C.green}
            />
            <Marker
              coordinate={{ latitude: route.to.lat, longitude: route.to.lng }}
              title={route.to.label}
              description={t('mobile2.tracking.destination')}
              pinColor={C.mango}
            />
            <Polyline
              coordinates={[
                { latitude: route.from.lat, longitude: route.from.lng },
                { latitude: route.to.lat, longitude: route.to.lng },
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
