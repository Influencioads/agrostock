import type { Icon } from '@agrotraders/ui';

export interface NavItem {
  /** Indexes `nav:primary.<key>`; the rendered label is translated per locale. */
  key: string;
  icon: Parameters<typeof Icon>[0]['name'];
  to: string;
}

/**
 * Primary header nav — every marketplace surface one click away.
 *
 * Shared by the desktop header and the mobile drawer so the two can never drift.
 */
export const NAV: NavItem[] = [
  { key: 'buy', icon: 'bag', to: '/market' },
  { key: 'sellers', icon: 'store', to: '/sellers' },
  { key: 'auctions', icon: 'gavel', to: '/auctions' },
  { key: 'bids', icon: 'file', to: '/bids' },
  { key: 'transporters', icon: 'truck', to: '/transporters' },
  { key: 'loaders', icon: 'worker', to: '/loaders' },
  { key: 'workers', icon: 'user', to: '/workers' },
];

/** Whether a nav item is the current route (`/market` is exact; the rest match prefixes). */
export function isNavActive(pathname: string, to: string): boolean {
  return pathname === to || (to !== '/market' && pathname.startsWith(to));
}
