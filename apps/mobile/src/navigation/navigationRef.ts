import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Global navigation ref so non-React code (push notification tap handlers) can
 * navigate. Attached to the NavigationContainer in App.tsx.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * F05: resolve a notification `linkUrl` to a concrete mobile screen for the
 * targets the app can render (currently product detail). Returns true when it
 * navigated, so callers can fall back to system-based routing otherwise.
 */
export function navigateToLink(linkUrl: unknown): boolean {
  if (!navigationRef.isReady() || typeof linkUrl !== 'string') return false;
  const product = linkUrl.match(/^\/product\/([^/?#]+)/);
  if (product) {
    navigationRef.navigate('ProductDetail', { slug: product[1] });
    return true;
  }
  return false;
}

/** Route a tapped notification to the most relevant screen. */
export function routeForNotification(data: Record<string, unknown> | undefined) {
  if (!navigationRef.isReady()) return;
  // Prefer an explicit link target when we can render it (F05).
  if (navigateToLink(data?.linkUrl)) return;
  const system = String(data?.system ?? '');
  if (system === 'community') navigationRef.navigate('Community');
  else if (system === 'support') navigationRef.navigate('Support');
  else navigationRef.navigate('Notifications');
}
