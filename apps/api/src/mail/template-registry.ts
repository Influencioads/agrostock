/**
 * Registry of every admin-editable email template. This is the single source of
 * truth for:
 *  - seeding the `EmailTemplate` table (idempotent upsert on boot), and
 *  - the admin UI's per-template variable reference / grouping.
 *
 * Two kinds of key exist:
 *  - **Notification events** — the key equals the notification `type`
 *    (`order.dispatched`, `hire.request`, …). `MailService` looks these up when
 *    fanning out `NOTIFICATION_CREATED`. Their default body is a passthrough of
 *    the already-localized `{{body}}`, so seeding changes nothing until an admin
 *    edits it; the listed `variables` let an admin rewrite the copy with the
 *    event's own params.
 *  - **Direct auth emails** — bespoke `auth.*` keys sent straight from
 *    `MailService` (verification, password reset, OTP, welcome).
 *
 * Every notification-driven key here must belong to an email-eligible category
 * (`transactional: true` in notification-categories.ts) — anything else never
 * emails, so a template for it would be dead copy. The `marketing` category is
 * email-eligible but commercial: its templates render with a one-click
 * unsubscribe and the sender's postal identity, added by the shell rather than
 * by the editable body, so they cannot be edited away.
 */

export type TemplateCategory =
  | 'auth'
  | 'orders'
  | 'wallet'
  | 'auctions'
  | 'hire'
  | 'loader'
  | 'transport'
  | 'reviews'
  | 'account'
  | 'billing'
  | 'marketing';

export interface TemplateDef {
  key: string;
  name: string;
  description: string;
  category: TemplateCategory;
  subject: string;
  bodyHtml: string;
  ctaLabel?: string;
  /** Variables an admin may use in subject/body (for the UI reference). */
  variables: string[];
}

const APP = 'AgroTraders';
/** Variables present on every template. */
const BASE_VARS = ['name'];
/** Variables every notification-driven template can use (rendered + localized). */
const NOTIFY_VARS = [...BASE_VARS, 'title', 'body'];

/**
 * Build a notification-event template. Default body is the localized passthrough
 * so behaviour is unchanged until edited. `extraVars` are the event's own params
 * (from packages/i18n locales/en/notification.json) an admin can pull into copy.
 */
function evt(
  key: string,
  name: string,
  category: TemplateCategory,
  description: string,
  subjectPrefix: string,
  extraVars: string[] = [],
  ctaLabel = 'Open AgroTraders',
): TemplateDef {
  const prefix = subjectPrefix ? `${subjectPrefix}: ` : '';
  return {
    key,
    name,
    description,
    category,
    subject: `[${APP}] ${prefix}{{title}}`,
    bodyHtml: '<p>{{body}}</p>',
    ctaLabel,
    variables: [...NOTIFY_VARS, ...extraVars],
  };
}

export const EMAIL_TEMPLATES: TemplateDef[] = [
  /* ── Auth (direct sends) ─────────────────────────────────────────── */
  {
    key: 'auth.email_verify',
    name: 'Confirm email address',
    description: 'Sent at signup to verify the account. {{ctaUrl}} is the confirmation link.',
    category: 'auth',
    subject: `[${APP}] Confirm your email address`,
    bodyHtml:
      '<p>Tap the button below to activate your AgroTraders account. The link is valid for 24 hours — if it expires, request a new one from the sign-in page.</p>',
    ctaLabel: 'Confirm my email',
    variables: [...BASE_VARS, 'ctaUrl'],
  },
  {
    key: 'auth.password_reset',
    name: 'Password reset',
    description: 'Sent when a user requests a password reset. {{ctaUrl}} is the reset link.',
    category: 'auth',
    subject: `[${APP}] Reset your password`,
    bodyHtml:
      '<p>We received a request to reset your AgroTraders password. Tap the button below to choose a new one — the link is valid for 1 hour.</p><p>If you didn\'t request this, you can safely ignore this email; your password won\'t change.</p>',
    ctaLabel: 'Reset my password',
    variables: [...BASE_VARS, 'ctaUrl'],
  },
  {
    key: 'auth.login_otp',
    name: 'Login code (OTP)',
    description: 'Passwordless sign-in code. {{code}} is the 6-digit code.',
    category: 'auth',
    subject: `[${APP}] Your login code`,
    bodyHtml:
      '<p>Your one-time login code is:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px;color:#0B3D2E;margin:8px 0 16px;">{{code}}</p><p>It expires in 10 minutes. If you didn\'t try to sign in, you can ignore this email.</p>',
    variables: [...BASE_VARS, 'code'],
  },
  {
    key: 'auth.welcome',
    name: 'Welcome',
    description: 'Sent once an account is verified. {{ctaUrl}} opens the app.',
    category: 'auth',
    subject: `[${APP}] Welcome to AgroTraders`,
    bodyHtml:
      '<p>Your email is confirmed and your account is ready. Explore verified products, place safe-deal orders, and connect with buyers, sellers and logistics partners worldwide.</p>',
    ctaLabel: 'Open AgroTraders',
    variables: [...BASE_VARS, 'ctaUrl'],
  },

  /* ── Orders ──────────────────────────────────────────────────────── */
  evt('order.new_enquiry', 'New enquiry', 'orders', 'A buyer enquired about a product.', 'Order', ['buyer', 'product']),
  evt('order.seller_responded', 'Seller responded', 'orders', 'A seller quoted an enquiry.', 'Order', ['seller', 'product', 'amount']),
  evt('order.status_changed', 'Order status changed', 'orders', 'Order moved to a new status.', 'Order', ['reference', 'status']),
  evt('order.new_order', 'New order placed', 'orders', 'A buyer placed a direct "buy now" order.', 'Order', ['reference', 'buyer', 'product']),
  evt('order.bid_awarded', 'Buyer bid awarded', 'orders', 'A buyer-bid was awarded and an order opened (buyer copy).', 'Order', ['reference', 'orderReference']),
  evt('order.dispatched', 'Order dispatched', 'orders', 'Goods left the seller.', 'Order', ['cargo']),
  evt('order.load_assigned', 'Load assigned', 'orders', 'A transporter was assigned a load.', 'Order', ['cargo', 'fromCity']),
  evt('order.picked_up', 'Goods picked up', 'orders', 'Cargo was picked up and is in transit.', 'Order', ['reference']),
  evt('order.delivered_buyer', 'Delivered (buyer)', 'orders', 'Order delivered — buyer copy.', 'Order', ['reference']),
  evt('order.delivered_seller', 'Delivered (seller)', 'orders', 'Order delivered — seller copy.', 'Order', ['reference']),

  /* ── Wallet & payments ───────────────────────────────────────────── */
  evt('wallet.topup', 'Funds added', 'wallet', 'Wallet top-up succeeded.', 'Payment', ['amount']),
  evt('wallet.escrow_release', 'Payment received', 'wallet', 'Escrow released to a wallet.', 'Payment', ['amount']),
  evt('wallet.refund', 'Refund processed', 'wallet', 'A refund landed in the wallet.', 'Payment', ['amount']),
  evt('wallet.invoice', 'New invoice', 'wallet', 'An invoice was issued to the user.', 'Payment', ['issuer', 'number', 'amount']),
  evt('wallet.invoice_paid', 'Invoice paid', 'wallet', 'An issued invoice was marked paid (issuer copy).', 'Payment', ['number', 'amount']),
  evt('wallet.payout_requested', 'Payout requested', 'wallet', 'A withdrawal request was submitted.', 'Payment', ['amount']),
  evt('wallet.payout_approved', 'Payout sent', 'wallet', 'A withdrawal was approved and paid out.', 'Payment', ['amount']),
  evt('wallet.payout_declined', 'Payout declined', 'wallet', 'A withdrawal request was declined.', 'Payment', []),

  /* ── Auctions ────────────────────────────────────────────────────── */
  evt('auction.won', 'Auction won', 'auctions', 'The recipient won an auction.', 'Auction', ['product', 'amount']),
  evt('auction.sold', 'Auction sold', 'auctions', 'A seller\'s auction sold.', 'Auction', ['product', 'amount', 'buyer']),

  /* ── Hiring ──────────────────────────────────────────────────────── */
  evt('hire.request', 'Hire request', 'hire', 'Someone requested to hire the recipient.', 'Hiring', ['requester', 'detail']),
  evt('hire.accepted', 'Hire accepted', 'hire', 'A hire request was accepted.', 'Hiring', ['actor', 'reference']),
  evt('hire.declined', 'Hire declined', 'hire', 'A hire request was declined.', 'Hiring', ['actor', 'reference']),
  evt('hire.cancelled', 'Hire cancelled', 'hire', 'A hire was cancelled and escrow refunded.', 'Hiring', ['actor', 'reference']),

  /* ── Loading jobs ────────────────────────────────────────────────── */
  evt('loader.job_claimed', 'Job claimed', 'loader', 'A loading company claimed a job.', 'Job', ['reference', 'loaderco']),
  evt('loader.assigned', 'Assigned to job', 'loader', 'A worker was assigned to a loading job.', 'Job', ['reference']),
  evt('loader.completed', 'Job completed', 'loader', 'A loading job was completed.', 'Job', ['reference']),

  /* ── Transport ───────────────────────────────────────────────────── */
  evt('transport.quote_new', 'New transport quote', 'transport', 'A transporter quoted a request.', 'Transport', ['amount']),
  evt('transport.assigned', 'Trip assigned', 'transport', 'A transport quote was accepted — trip assigned.', 'Transport', ['reference', 'fromCity', 'toCity']),
  evt('transport.delivered', 'Trip delivered', 'transport', 'A transport trip was delivered.', 'Transport', ['reference']),

  /* ── Reviews ─────────────────────────────────────────────────────── */
  evt('review.received', 'Review received', 'reviews', 'The recipient received a new review.', 'Review', ['author', 'stars']),

  /* ── Subscriptions & payments ────────────────────────────────────── */
  evt('billing.activated', 'Subscription active', 'billing', 'A subscription payment settled and the plan is live.', 'Subscription', ['plan', 'until'], 'View my plan'),
  evt('billing.renewed', 'Subscription renewed', 'billing', 'An unattended renewal charge succeeded.', 'Subscription', ['plan', 'amount', 'until'], 'View my plan'),
  evt('billing.renewal_upcoming', 'Renewal reminder', 'billing', 'Courtesy notice 7 days before a card is charged.', 'Subscription', ['plan', 'amount', 'until'], 'Manage my plan'),
  evt('billing.renewal_action_needed', 'Renewal needs a card', 'billing', 'The period ends and there is no saved payment method to renew with.', 'Subscription', ['plan', 'until'], 'Add a payment method'),
  evt('billing.expiring_soon', 'Plan ending soon', 'billing', 'A cancelled plan is about to lapse to free — names the free tier’s limit.', 'Subscription', ['plan', 'until', 'limit', 'quota'], 'Resume my plan'),
  evt('billing.expiring_soon_plain', 'Plan ending soon (no quota)', 'billing', 'Same notice for ladders that carry no quotas, e.g. independent workers.', 'Subscription', ['plan', 'until'], 'Resume my plan'),
  evt('billing.payment_failed', 'Payment failed', 'billing', 'First failed renewal charge — the retry cycle has started.', 'Subscription', ['plan', 'attempt', 'max'], 'Update payment method'),
  evt('billing.past_due', 'Subscription past due', 'billing', 'A later dunning attempt failed.', 'Subscription', ['plan', 'attempt', 'max'], 'Update payment method'),
  evt('billing.downgraded', 'Moved to the free plan', 'billing', 'Retries ran out and the account dropped to free.', 'Subscription', ['plan'], 'See plans'),
  evt('billing.canceled', 'Subscription cancelled', 'billing', 'Self-serve cancellation confirmed; runs to period end.', 'Subscription', ['plan', 'until'], 'Manage my plan'),
  evt('billing.addon_active', 'Add-on active', 'billing', 'A one-off add-on purchase was granted.', 'Subscription', ['addon', 'detail'], 'View my add-ons'),
  evt('billing.addon_expiring', 'Add-on ending soon', 'billing', 'A promotion or badge lapses in a few days.', 'Subscription', ['addon', 'until'], 'Renew it'),
  evt('billing.quota_warning', 'Approaching a plan limit', 'billing', 'The account passed 80% of one of its quotas.', 'Subscription', ['used', 'limit', 'quota'], 'See plans'),

  /* ── Upgrade sequence (promotional) ──────────────────────────────────
   * The only templates on the marketing ladder. Every one of them carries a
   * one-click unsubscribe and the sender's postal identity automatically (see
   * mail.templates.ts) — the shell adds them for any category flagged
   * `marketing`, so an admin cannot accidentally edit them out of the copy.
   */
  evt('marketing.upgrade_intro', 'Upgrade nudge 1 — your free limits', 'marketing', 'First of three, a few days after signup. Names the tightest quota on the free plan.', '', ['plan', 'paidPlan', 'price', 'quota', 'limit', 'paidLimit', 'perk'], 'See what changes'),
  evt('marketing.upgrade_benefits', 'Upgrade nudge 2 — what a plan adds', 'marketing', 'Second of three. Leads on the feature the free plan lacks.', '', ['plan', 'paidPlan', 'price', 'quota', 'limit', 'paidLimit', 'perk'], 'See plans and prices'),
  evt('marketing.upgrade_final', 'Upgrade nudge 3 — last one', 'marketing', 'Final message of the sequence; says so in the copy. Nothing promotional follows it.', '', ['plan', 'paidPlan', 'price', 'quota', 'limit'], 'See plans and prices'),
  // The worker ladder sells visibility, not volume — it has no quotas to quote,
  // so its three steps lead on the feature instead. Same schedule, same caps.
  evt('marketing.upgrade_intro_feature', 'Upgrade nudge 1 — feature ladder', 'marketing', 'First of three, for roles whose paid plan raises no quota (independent workers).', '', ['plan', 'paidPlan', 'price', 'perk'], 'See what changes'),
  evt('marketing.upgrade_benefits_feature', 'Upgrade nudge 2 — feature ladder', 'marketing', 'Second of three on the feature ladder.', '', ['plan', 'paidPlan', 'price', 'perk'], 'See plans and prices'),
  evt('marketing.upgrade_final_feature', 'Upgrade nudge 3 — feature ladder, last one', 'marketing', 'Final message on the feature ladder; nothing promotional follows it.', '', ['plan', 'paidPlan', 'price', 'perk'], 'See plans and prices'),

  /* ── Account & verification ──────────────────────────────────────── */
  evt('kyc.verified', 'Identity verified', 'account', 'KYC approved.', 'Account', []),
  evt('kyc.rejected', 'Verification needs attention', 'account', 'KYC rejected.', 'Account', []),
  evt('market.approved', 'Market approved', 'account', 'A proposed market was approved.', 'Account', ['market']),
  evt('market.declined', 'Market declined', 'account', 'A proposed market was declined.', 'Account', ['market']),
  evt('product.approved', 'Listing approved', 'account', 'A product listing was approved.', 'Account', ['product']),
  evt('product.rejected', 'Listing needs changes', 'account', 'A product listing was rejected.', 'Account', ['product']),
  evt('role_request.approved', 'Role approved', 'account', 'A role request was approved.', 'Account', ['role']),
  evt('role_request.declined', 'Role declined', 'account', 'A role request was declined.', 'Account', ['role']),
];

export const EMAIL_TEMPLATE_MAP: Record<string, TemplateDef> = Object.fromEntries(
  EMAIL_TEMPLATES.map((t) => [t.key, t]),
);
