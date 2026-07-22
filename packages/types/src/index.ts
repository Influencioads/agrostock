import { z } from 'zod';

export { BRAND } from './brand';
export * from './attributes';
export * from './units';

/** Platform roles (from the AgroTraders design). */
export const Role = {
  Buyer: 'buyer',
  Seller: 'seller',
  Transporter: 'transporter',
  LoaderCo: 'loaderco',
  Worker: 'worker',
  Admin: 'admin',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role) as Role[];

/** Top-level app views in the web shell. */
export const View = {
  Hub: 'hub',
  Website: 'web',
  Market: 'market',
  Product: 'product',
  Offices: 'offices',
  Boards: 'dash',
  Mobile: 'mobile',
  System: 'system',
} as const;
export type View = (typeof View)[keyof typeof View];

/**
 * Supported UI languages. Must stay in sync with `LOCALES` in `@agrotraders/i18n`
 * (kept as a plain list here so this package carries no i18n/runtime dependency).
 */
export const Lang = {
  En: 'en',
  Ru: 'ru',
  ZhHans: 'zh-Hans',
  Es: 'es',
  Hi: 'hi',
  Ar: 'ar',
  Pt: 'pt',
  Fr: 'fr',
  De: 'de',
  Ja: 'ja',
  Fa: 'fa',
} as const;
export type Lang = (typeof Lang)[keyof typeof Lang];
export const LANGS = Object.values(Lang) as Lang[];

/** Order lifecycle. */
export const OrderStatus = {
  Quote: 'quote',
  Processing: 'processing',
  Paid: 'paid',
  Shipped: 'shipped',
  InTransit: 'in_transit',
  Delivered: 'delivered',
  Dispute: 'dispute',
  Cancelled: 'cancelled',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Safe-Deal (escrow) states. */
export const EscrowState = {
  Held: 'held',
  Released: 'released',
  Refunded: 'refunded',
  Disputed: 'disputed',
} as const;
export type EscrowState = (typeof EscrowState)[keyof typeof EscrowState];

/* ── Chat systems (Community + Live Support) — kept separate ─────── */

/** CHAT SYSTEM 2 — Live Support ticket lifecycle. */
export const SupportStatus = {
  New: 'new',
  WaitingForSupport: 'waiting_support',
  Assigned: 'assigned',
  InProgress: 'in_progress',
  WaitingForUser: 'waiting_user',
  Escalated: 'escalated',
  Resolved: 'resolved',
  Closed: 'closed',
} as const;
export type SupportStatus = (typeof SupportStatus)[keyof typeof SupportStatus];

export const SupportPriority = { Low: 'low', Medium: 'medium', High: 'high', Urgent: 'urgent' } as const;
export type SupportPriority = (typeof SupportPriority)[keyof typeof SupportPriority];

export const SUPPORT_CATEGORIES = [
  'account_kyc',
  'product_listing',
  'buyer_order',
  'seller_order',
  'payment_safedeal',
  'wallet_payout',
  'auction_bid',
  'transport',
  'loader',
  'import_export',
  'technical',
  'global_office',
  'other',
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

/** CHAT SYSTEM 1 — Community group visibility. */
export const CommunityVisibility = { Public: 'public', Private: 'private', InviteOnly: 'invite_only' } as const;
export type CommunityVisibility = (typeof CommunityVisibility)[keyof typeof CommunityVisibility];

export const roleSchema = z.enum(ROLES as [Role, ...Role[]]);
export const langSchema = z.enum(LANGS as [Lang, ...Lang[]]);

/** Re-exported zod for downstream DTOs. */
export { z };
