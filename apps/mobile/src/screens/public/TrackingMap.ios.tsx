import { StyleSheet, View } from 'react-native';
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
 * The map half of the Live Tracking screen — iOS. Never draws a map.
 *
 * iOS ships without react-native-maps: its Google provider pod (AirGoogleMaps) cannot
 * compile alongside @react-native-firebase under `use_frameworks! :static`. See
 * react-native.config.js, app.config.js, and plugins/with-ios-nonmodular-headers.js
 * for the full account. Metro resolves this `.ios` file ahead of the bare one, and the
 * native module is excluded from iOS autolinking entirely — so this file must NOT
 * import react-native-maps. Doing so would crash at runtime, not render an empty box.
 *
 * It still renders the LOADING / ERROR / NO-ROUTE states, because the Android sibling
 * shows them inside the same card and dropping them here left iOS silent: a deep link
 * with no params rendered a bare "Trip" card with no explanation. Only the successful
 * state differs — where Android draws the map, iOS shows nothing, since LiveTracking's
 * own card below already carries origin, destination, road distance, ETA and status.
 */
export function TrackingMap({ route, enabled, isLoading, isError }: TrackingMapProps) {
  const { t } = useI18n();

  // Route resolved: the detail card below is the whole story on iOS.
  if (enabled && route) return null;

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={styles.status}>
        {isLoading ? (
          <Loading label={t('mobile2.tracking.locating')} />
        ) : (
          <>
            <Ionicons name="navigate-circle-outline" size={40} color={C.green} />
            <Txt variant="muted">
              {isError ? t('mobile2.tracking.notFound') : t('mobile2.tracking.unavailable')}
            </Txt>
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  status: {
    height: 140,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
