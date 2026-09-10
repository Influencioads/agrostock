import type { Ionicons } from '@expo/vector-icons';
import { isServiceRole, SERVICE_ROLES } from '@agrotraders/types';

/**
 * Roles with a console of their own. A general labour company runs the same
 * console as a loading company; they differ only in which worker types they
 * may publish.
 *
 * The NAMES live here, apart from the components `RoleRouter` maps them to, so
 * that plain callers (`Home`) can ask "is this the shop?" without importing the
 * navigator — that import was a require cycle
 * (RoleRouter -> tabs -> Home -> RoleRouter), which RN warns can leave values
 * uninitialized. Same split as `categorySelection.ts` and
 * `sectionRegistryKeys.ts`. `RoleRouter`'s map is typed off this list, so
 * adding a console role without its tabs is a compile error, not drift.
 */
export const CONSOLE_ROLES = ['seller', 'transporter', 'loaderco', 'workerco', 'worker'] as const;
export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

/** True when `role` lands on the shop tabs (Home / Offers / Browse / Orders / Account). */
export function isShopRole(role: string | null): boolean {
  return !(role && (CONSOLE_ROLES as readonly string[]).includes(role)) && !isServiceRole(role);
}

export interface MenuItem {
  /** Section registry key, and the key into `nav:section` for the visible label. */
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Secondary sections per role, surfaced via the "More"/"Account" hub tab. */
export const ROLE_MENU: Record<string, MenuItem[]> = {
  buyer: [
    { id: 'dashboard', icon: 'speedometer-outline' },
    { id: 'bids', icon: 'pricetags-outline' },
    { id: 'auctions', icon: 'hammer-outline' },
    { id: 'saved', icon: 'heart-outline' },
    { id: 'safedeal', icon: 'shield-checkmark-outline' },
    { id: 'transport', icon: 'car-outline' },
    { id: 'wallet', icon: 'wallet-outline' },
    { id: 'invoices', icon: 'document-text-outline' },
    { id: 'billing', icon: 'card-outline' },
    { id: 'verify', icon: 'shield-checkmark-outline' },
    { id: 'messages', icon: 'chatbubbles-outline' },
  ],
  seller: [
    { id: 'add', icon: 'add-circle-outline' },
    { id: 'bids', icon: 'document-text-outline' },
    { id: 'auctions', icon: 'hammer-outline' },
    { id: 'offers', icon: 'star-outline' },
    { id: 'ads', icon: 'megaphone-outline' },
    { id: 'hires', icon: 'people-outline' },
    { id: 'payouts', icon: 'wallet-outline' },
    { id: 'wallet', icon: 'card-outline' },
    { id: 'invoices', icon: 'receipt-outline' },
    { id: 'billing', icon: 'card-outline' },
    { id: 'verify', icon: 'shield-checkmark-outline' },
    { id: 'analytics', icon: 'bar-chart-outline' },
  ],
  transporter: [
    { id: 'loads', icon: 'cube-outline' },
    { id: 'myrequests', icon: 'clipboard-outline' },
    { id: 'quotes', icon: 'document-text-outline' },
    { id: 'vehicles', icon: 'bus-outline' },
    { id: 'drivers', icon: 'people-outline' },
    { id: 'routes', icon: 'git-network-outline' },
    { id: 'invoices', icon: 'receipt-outline' },
    { id: 'earnings', icon: 'wallet-outline' },
    { id: 'wallet', icon: 'card-outline' },
    { id: 'ratings', icon: 'star-outline' },
    { id: 'tracking', icon: 'map-outline' },
    { id: 'billing', icon: 'card-outline' },
    { id: 'verify', icon: 'shield-checkmark-outline' },
  ],
  loaderco: [
    { id: 'teams', icon: 'grid-outline' },
    // What buyers actually browse — publishing here is what lists the account.
    { id: 'labour', icon: 'pricetags-outline' },
    { id: 'availability', icon: 'calendar-outline' },
    { id: 'attendance', icon: 'checkmark-done-outline' },
    { id: 'pricing', icon: 'cash-outline' },
    { id: 'earnings', icon: 'wallet-outline' },
    { id: 'wallet', icon: 'card-outline' },
    { id: 'reviews', icon: 'star-outline' },
    { id: 'invoices', icon: 'receipt-outline' },
    { id: 'hires', icon: 'people-outline' },
    { id: 'billing', icon: 'card-outline' },
    { id: 'verify', icon: 'shield-checkmark-outline' },
  ],
  worker: [
    { id: 'labour', icon: 'pricetags-outline' },
    { id: 'wallet', icon: 'card-outline' },
    { id: 'earnings', icon: 'wallet-outline' },
    { id: 'attendance', icon: 'checkmark-done-outline' },
    { id: 'reviews', icon: 'star-outline' },
    { id: 'invoices', icon: 'receipt-outline' },
    { id: 'hires', icon: 'people-outline' },
    { id: 'billing', icon: 'card-outline' },
    { id: 'verify', icon: 'shield-checkmark-outline' },
  ],
};

// A general labour company runs the loading company's console: same jobs, crew,
// availability and rates. They differ only in which worker types they may
// publish, which the workforce module enforces server-side.
ROLE_MENU.workerco = ROLE_MENU.loaderco;

// One menu for every service role — they differ only in which categories they
// may offer, which the service profile form already scopes. Dashboard and
// enquiries are bottom tabs, so they are deliberately absent here.
const SERVICE_MENU: MenuItem[] = [
  { id: 'serviceProfile', icon: 'storefront-outline' },
  { id: 'servicePrices', icon: 'pricetags-outline' },
  { id: 'invoices', icon: 'receipt-outline' },
  { id: 'earnings', icon: 'wallet-outline' },
  { id: 'wallet', icon: 'card-outline' },
  { id: 'hires', icon: 'people-outline' },
  { id: 'billing', icon: 'card-outline' },
  { id: 'verify', icon: 'shield-checkmark-outline' },
];
for (const role of SERVICE_ROLES) ROLE_MENU[role] = SERVICE_MENU;
