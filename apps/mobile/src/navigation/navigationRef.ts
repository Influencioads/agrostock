import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
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
  // FLOW-01: order notifications carry /orders/:id. Every role's tab navigator
  // has an `Orders` screen, so route there rather than dropping the tap on the
  // generic Notifications list (which previously did nothing but mark it read).
  if (/^\/orders\/[^/?#]+/.test(linkUrl) || linkUrl === '/console/orders') {
    // `App` is the tabs root and takes no params, so select the tab with a
    // follow-up dispatch rather than a nested-screen param.
    navigationRef.navigate('App');
    navigationRef.dispatch(CommonActions.navigate({ name: 'Orders' }));
    return true;
  }
  return false;
}

/**
 * MOB-08: a cold-start notification tap fires before the NavigationContainer is
 * ready, so the route used to be silently discarded and the app just opened on
 * Home. Hold the payload and replay it from `flushPendingNotificationRoute()`
 * once the container mounts.
 */
let pendingRoute: Record<string, unknown> | undefined;

/** Route a tapped notification to the most relevant screen. */
export function routeForNotification(data: Record<string, unknown> | undefined) {
  if (!navigationRef.isReady()) {
    pendingRoute = data;
    return;
  }
  // Prefer an explicit link target when we can render it (F05).
  if (navigateToLink(data?.linkUrl)) return;
  const system = String(data?.system ?? '');
  if (system === 'community') navigationRef.navigate('Community');
  else if (system === 'support') navigationRef.navigate('Support');
  else navigationRef.navigate('Notifications');
}

/** Call from NavigationContainer's `onReady` to deliver a queued cold-start tap. */
export function flushPendingNotificationRoute() {
  if (!pendingRoute) return;
  const data = pendingRoute;
  pendingRoute = undefined;
  routeForNotification(data);
}
