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
 * The map half of the Live Tracking screen — WEB. Never draws a map.
 *
 * react-native-maps is a native-only module: its MapMarkerNativeComponent imports
 * `react-native/Libraries/Utilities/codegenNativeCommands`, which Metro refuses to
 * bundle for web. Without this file the bare `TrackingMap.tsx` is what web resolves,
 * and that single import fails the WHOLE web bundle — not just this screen — so
 * `expo start --web` (and the `mobile-web` target in .claude/launch.json) died with
 * "Importing native-only module ... on web" before rendering anything at all.
 *
 * Same shape as the iOS sibling, and for the same reason: everything below the map in
 * LiveTracking already carries origin, destination, road distance, ETA and status, so
 * the successful state has nothing left to say. The LOADING / ERROR / NO-ROUTE states
 * are kept, because dropping them leaves a bare card with no explanation.
 */
export function TrackingMap({ route, enabled, isLoading, isError }: TrackingMapProps) {
  const { t } = useI18n();

  // Route resolved: the detail card below is the whole story on web.
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
