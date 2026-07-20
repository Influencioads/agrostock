/**
 * Notification taxonomy + channel policy. Single source of truth for which
 * categories are "transactional" (email-eligible) and the per-channel defaults
 * that apply when a user has no explicit preference. `Notification.system` is a
 * free-form String column, so a category is just its stored value.
 */

export type ChatSystem = 'community' | 'support';

export type NotificationCategory =
  | 'orders'
  | 'bids'
  | 'auctions'
  | 'wallet'
  | 'account'
  | 'reviews'
  | 'hire'
  | 'transport'
  | 'loader'
  | 'community'
  | 'support';

export type NotificationChannel = 'email' | 'push' | 'inApp';

export interface CategoryConfig {
  /** Human label for the preferences UI. */
  label: string;
  /** Whether this category may ever send email (high-value / low-frequency). */
  transactional: boolean;
  defaultEmail: boolean;
  defaultPush: boolean;
  defaultInApp: boolean;
}

/**
 * Transactional categories default to email ON; high-frequency ones (chat,
 * outbids) are push/in-app only. A single noisy event inside a transactional
 * category (e.g. an auction outbid) can still opt out per-call via the
 * `email: false` override on `create()`.
 */
export const NOTIFICATION_CATEGORIES: Record<NotificationCategory, CategoryConfig> = {
  orders: { label: 'Orders', transactional: true, defaultEmail: true, defaultPush: true, defaultInApp: true },
  wallet: { label: 'Wallet & payments', transactional: true, defaultEmail: true, defaultPush: true, defaultInApp: true },
  account: { label: 'Account & verification', transactional: true, defaultEmail: true, defaultPush: true, defaultInApp: true },
  auctions: { label: 'Auctions', transactional: true, defaultEmail: true, defaultPush: true, defaultInApp: true },
  hire: { label: 'Hiring', transactional: true, defaultEmail: true, defaultPush: true, defaultInApp: true },
  reviews: { label: 'Reviews', transactional: true, defaultEmail: true, defaultPush: true, defaultInApp: true },
  transport: { label: 'Transport', transactional: true, defaultEmail: true, defaultPush: true, defaultInApp: true },
  loader: { label: 'Loading jobs', transactional: true, defaultEmail: true, defaultPush: true, defaultInApp: true },
  bids: { label: 'Bids', transactional: false, defaultEmail: false, defaultPush: true, defaultInApp: true },
  community: { label: 'Community', transactional: false, defaultEmail: false, defaultPush: true, defaultInApp: true },
  support: { label: 'Support', transactional: false, defaultEmail: false, defaultPush: true, defaultInApp: true },
};

/** Per-user stored shape (User.notificationPrefs). All keys optional; null = all defaults. */
export interface NotificationPrefs {
  categories?: Partial<Record<NotificationCategory, Partial<Record<NotificationChannel, boolean>>>>;
  /** Hard opt-out of every email regardless of category (unsubscribe link). */
  emailUnsubscribedAll?: boolean;
}

const DEFAULT_CATEGORY: CategoryConfig = {
  label: 'Notifications',
  transactional: false,
  defaultEmail: false,
  defaultPush: true,
  defaultInApp: true,
};

export function categoryConfig(category: string): CategoryConfig {
  return NOTIFICATION_CATEGORIES[category as NotificationCategory] ?? DEFAULT_CATEGORY;
}

/**
 * Resolve whether a channel is enabled for a user + category, honouring (in
 * order): the global email unsubscribe, an explicit per-category preference,
 * then the category default. `prefs` may be null/unknown JSON.
 */
export function channelEnabled(
  prefs: unknown,
  category: string,
  channel: NotificationChannel,
): boolean {
  const cfg = categoryConfig(category);
  const p = (prefs ?? {}) as NotificationPrefs;

  if (channel === 'email' && p.emailUnsubscribedAll) return false;
  if (channel === 'email' && !cfg.transactional) return false;

  const explicit = p.categories?.[category as NotificationCategory]?.[channel];
  if (typeof explicit === 'boolean') return explicit;

  return channel === 'email' ? cfg.defaultEmail : channel === 'push' ? cfg.defaultPush : cfg.defaultInApp;
}

/** Full resolved preference matrix for the settings UI (defaults merged in). */
export function resolvedPrefs(prefs: unknown): {
  categories: Record<NotificationCategory, { label: string; transactional: boolean; email: boolean; push: boolean; inApp: boolean }>;
  emailUnsubscribedAll: boolean;
} {
  const p = (prefs ?? {}) as NotificationPrefs;
  const categories = {} as Record<
    NotificationCategory,
    { label: string; transactional: boolean; email: boolean; push: boolean; inApp: boolean }
  >;
  (Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[]).forEach((cat) => {
    const cfg = NOTIFICATION_CATEGORIES[cat];
    categories[cat] = {
      label: cfg.label,
      transactional: cfg.transactional,
      email: channelEnabled(p, cat, 'email'),
      push: channelEnabled(p, cat, 'push'),
      inApp: channelEnabled(p, cat, 'inApp'),
    };
  });
  return { categories, emailUnsubscribedAll: Boolean(p.emailUnsubscribedAll) };
}

/** Event name emitted by NotificationsService after a row is persisted. */
export const NOTIFICATION_CREATED = 'notification.created';
