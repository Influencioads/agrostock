import type { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme/tokens';

export type DirectoryType = 'sellers' | 'transporters' | 'loaders' | 'workers';

/**
 * Home marketplace shortcut. `labelKey` (and, for Directory targets, `titleKey`)
 * are i18n keys resolved with `t()` at render/navigation time — the array must
 * carry no user-visible English of its own.
 */
export type HomeLink = {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  tint?: string;
} & (
  | { route: 'Search' }
  | { route: 'AuctionsBoard' }
  | { route: 'BuyerBidsBoard' }
  | { route: 'SafeDeal' }
  | { route: 'Offices' }
  | { route: 'Directory'; dirType: DirectoryType; titleKey: string }
);

export const HOME_QUICK_LINKS: HomeLink[] = [
  { labelKey: 'pubX.home.link.buy', icon: 'bag-outline', route: 'Search' },
  { labelKey: 'pubX.home.link.sellers', icon: 'storefront-outline', route: 'Directory', dirType: 'sellers', titleKey: 'pubX.nav.sellers' },
  { labelKey: 'pubX.home.link.auctions', icon: 'hammer-outline', route: 'AuctionsBoard' },
  { labelKey: 'pubX.home.link.bids', icon: 'clipboard-outline', route: 'BuyerBidsBoard' },
  { labelKey: 'pubX.home.link.transporters', icon: 'car-outline', route: 'Directory', dirType: 'transporters', titleKey: 'pubX.nav.transporters' },
  { labelKey: 'pubX.home.link.loaders', icon: 'people-outline', route: 'Directory', dirType: 'loaders', titleKey: 'pubX.nav.loadingCompanies' },
  { labelKey: 'pubX.home.link.workers', icon: 'person-outline', route: 'Directory', dirType: 'workers', titleKey: 'pubX.nav.workers' },
];

export const HOME_SERVICE_LINKS: HomeLink[] = [
  { icon: 'car-outline', labelKey: 'pubX.home.svc.transport', tint: C.surface, route: 'Directory', dirType: 'transporters', titleKey: 'pubX.nav.transporters' },
  { icon: 'people-outline', labelKey: 'pubX.home.svc.loaders', tint: C.mangoSoft, route: 'Directory', dirType: 'loaders', titleKey: 'pubX.nav.loadingCompanies' },
  { icon: 'shield-checkmark-outline', labelKey: 'pubX.home.svc.safeDeal', tint: C.surface, route: 'SafeDeal' },
  { icon: 'business-outline', labelKey: 'pubX.home.svc.offices', tint: C.mangoSoft, route: 'Offices' },
];
