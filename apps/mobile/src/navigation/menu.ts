import type { Ionicons } from '@expo/vector-icons';

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
    { id: 'verify', icon: 'shield-checkmark-outline' },
  ],
  loaderco: [
    { id: 'teams', icon: 'grid-outline' },
    { id: 'availability', icon: 'calendar-outline' },
    { id: 'attendance', icon: 'checkmark-done-outline' },
    { id: 'pricing', icon: 'cash-outline' },
    { id: 'earnings', icon: 'wallet-outline' },
    { id: 'wallet', icon: 'card-outline' },
    { id: 'reviews', icon: 'star-outline' },
    { id: 'invoices', icon: 'receipt-outline' },
    { id: 'hires', icon: 'people-outline' },
    { id: 'verify', icon: 'shield-checkmark-outline' },
  ],
  worker: [
    { id: 'wallet', icon: 'card-outline' },
    { id: 'earnings', icon: 'wallet-outline' },
    { id: 'attendance', icon: 'checkmark-done-outline' },
    { id: 'reviews', icon: 'star-outline' },
    { id: 'invoices', icon: 'receipt-outline' },
    { id: 'hires', icon: 'people-outline' },
    { id: 'verify', icon: 'shield-checkmark-outline' },
  ],
};
