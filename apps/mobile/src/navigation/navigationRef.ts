import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';
import { ROLE_ALIAS, SECTION_REGISTRY_KEYS } from '../screens/sectionRegistryKeys';

/**
 * Global navigation ref so non-React code (push notification tap handlers) can
 * navigate. Attached to the NavigationContainer in App.tsx.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * The signed-in account's active role, mirrored out of React so push-tap routing
 * can read it. A tap is handled outside the tree (and can arrive before it mounts),
 * so there is no context to consult — the same reason `navigationRef` exists.
 * AuthProvider keeps this in step; null when signed out.
 */
let routingRole: string | null = null;

/** Called by AuthProvider whenever the active role changes. */
export function setRoutingRole(role: string | null) {
  routingRole = role;
}

const REGISTERED = new Set(SECTION_REGISTRY_KEYS);

/** Whether this role really has that console section, aliases expanded. */
function hasSection(role: string, section: string): boolean {
  return REGISTERED.has(`${role}:${section}`) || REGISTERED.has(`${ROLE_ALIAS[role] ?? role}:${section}`);
}

/**
 * `/console/...` link targets the API emits that are NOT console sections.
 * Everything else after `/console/` is looked up in the section registry.
 */
const CONSOLE_SCREEN_ALIASES: Record<string, keyof RootStackParamList> = {
  'settings/verification': 'Kyc',
};

/**
 * Console paths whose mobile home is a TAB, not a registry section.
 *
 * Web keeps listings under /console/products; on mobile they are the seller's
 * Inventory tab, so a "your listing was approved" tap has to select the tab rather
 * than push a section that does not exist.
 */
const CONSOLE_TAB_ALIASES: Record<string, string> = {
  orders: 'Orders',
  products: 'Inventory',
};

/** Select a bottom tab, if the current role's stack actually has one by that name. */
function navigateToTab(tab: string): boolean {
  const app = navigationRef.getRootState()?.routes.find((r) => r.name === 'App');
  const tabs = (app?.state?.routeNames as string[] | undefined) ?? [];
  // Empty means the tabs have not mounted yet — keep the old, permissive behaviour.
  if (tabs.length > 0 && !tabs.includes(tab)) return false;
  // `App` is the tabs root and takes no params, so select the tab with a
  // follow-up dispatch rather than a nested-screen param.
  navigationRef.navigate('App');
  navigationRef.dispatch(CommonActions.navigate({ name: tab }));
  return true;
}

/**
 * Push a console section — only when it really exists for this role: `Section`
 * falls back to a Placeholder, which is a worse landing than the list.
 */
function openSection(section: string): boolean {
  if (!routingRole || !hasSection(routingRole, section)) return false;
  navigationRef.navigate('Section', { role: routingRole, section });
  return true;
}

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
  // FLOW-01: order notifications carry /orders/:id. Only the shop and seller tab
  // sets actually have an `Orders` screen — transporter, loader/workerco, worker
  // and service do not, and for those the dispatch is a silent no-op. navigateToTab
  // bails out in that case so the caller's fallback runs instead.
  // Buyers have no Orders tab since Auctions & Bids took its slot; theirs is the
  // Account › Orders section.
  if (/^\/orders\/[^/?#]+/.test(linkUrl)) return navigateToTab('Orders') || openSection('orders');

  // Everything else the API links to lives under /console. The app renders those
  // through the generic `Section` screen, which needs the viewer's role — hence
  // `routingRole`. Only 3 of the 13 shapes the API emits used to resolve here
  // (/product/:id, /orders/:id, /console/orders); the rest fell through to the
  // notification list, so a "payment failed" or "KYC approved" tap dropped the
  // user on an index instead of the screen the message was about.
  const console_ = linkUrl.match(/^\/console(?:\/([^?#]+))?/);
  if (console_) {
    const path = console_[1] ?? 'dashboard';
    const alias = CONSOLE_SCREEN_ALIASES[path];
    if (alias) {
      navigationRef.navigate(alias as never);
      return true;
    }
    const tab = CONSOLE_TAB_ALIASES[path];
    if (tab && navigateToTab(tab)) return true;
    return openSection(path);
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
