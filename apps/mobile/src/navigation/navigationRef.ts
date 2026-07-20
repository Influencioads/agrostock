import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Global navigation ref so non-React code (push notification tap handlers) can
 * navigate. Attached to the NavigationContainer in App.tsx.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Route a tapped notification to the most relevant screen. */
export function routeForNotification(data: Record<string, unknown> | undefined) {
  if (!navigationRef.isReady()) return;
  const system = String(data?.system ?? '');
  if (system === 'community') navigationRef.navigate('Community');
  else if (system === 'support') navigationRef.navigate('Support');
  else navigationRef.navigate('Notifications');
}
