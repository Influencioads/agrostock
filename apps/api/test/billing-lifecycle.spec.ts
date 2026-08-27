import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PLAN_SEED } from '@agrotraders/types';
import { tightestLimit, topPerk } from '../src/billing/lifecycle.service';
import { unsubscribeToken, verifyUnsubscribeToken } from '../src/common/crypto';
import { channelEnabled, categoryConfig } from '../src/notifications/notification-categories';
import { EMAIL_TEMPLATE_MAP } from '../src/mail/template-registry';
import { renderNotification } from '@agrotraders/i18n/notifications';

const I18N_LOCALES = join(dirname(fileURLToPath(import.meta.url)), '../../../packages/i18n/locales');

/**
 * The lifecycle email flow makes two kinds of promise that are worth a test:
 * that the pitch it writes is TRUE for the recipient's plan, and that a
 * recipient who says stop is actually stopped.
 */

describe('upgrade pitch', () => {
  it('names a quota the paid plan really raises', () => {
    const free = { activeListings: 5, auctionLotsPerMonth: 1, photosPerListing: 3 };
    const paid = { activeListings: 50, auctionLotsPerMonth: 5, photosPerListing: 3 };
    const pick = tightestLimit(free, paid);
    // photosPerListing is the smallest number on the free plan (3) but the paid
    // plan does not raise it — advertising it would be a lie.
    expect(pick?.key).toBe('auctionLotsPerMonth');
    expect(pick?.freeLimit).toBe(1);
    expect(pick?.paidLimit).toBe(5);
  });

  it('treats an absent or null paid limit as unlimited', () => {
    expect(tightestLimit({ activeListings: 5 }, { activeListings: null })?.paidLimit).toBeNull();
    expect(tightestLimit({ activeListings: 5 }, {})?.paidLimit).toBeNull();
  });

  it('returns nothing when the paid plan raises no quota at all', () => {
    expect(tightestLimit({ activeListings: 5 }, { activeListings: 5 })).toBeNull();
    expect(tightestLimit({}, { activeListings: 50 })).toBeNull();
  });

  it('never sells a feature the free plan already has', () => {
    const free = { verifiedBadge: true, searchPriority: 'none' as const };
    const paid = { verifiedBadge: true, searchPriority: 'top' as const };
    expect(topPerk(free, paid)).toBe('searchPriority');
  });

  it('produces a true, complete pitch for every seeded role', () => {
    const roles = [...new Set(PLAN_SEED.map((p) => p.role))];
    let featureLadders = 0;
    for (const role of roles) {
      const free = PLAN_SEED.find((p) => p.role === role && p.tier === 0);
      const paid = PLAN_SEED.find((p) => p.role === role && p.tier === 1);
      if (!free || !paid) continue;

      // Every role must be sellable one way or the other — a role with neither a
      // quota to raise nor a feature to add would silently drop out of the flow.
      const pick = tightestLimit(free.limits, paid.limits);
      const perk = topPerk(free.features, paid.features);

      if (pick) {
        // The claim in the copy — "raises that to {{paidLimit}}" — must hold.
        expect(pick.paidLimit === null || pick.paidLimit > pick.freeLimit, `${role}: quota not raised`).toBe(true);
      } else {
        featureLadders++;
      }

      expect(paid.features[perk as keyof typeof paid.features], `${role}: perk not granted`).toBeTruthy();
      expect(paid.features[perk as keyof typeof paid.features]).not.toBe(
        free.features[perk as keyof typeof free.features],
      );
    }
    // The worker ladder sells visibility and has no quotas; if that ever changes,
    // the feature-led copy has lost its only caller.
    expect(featureLadders).toBeGreaterThan(0);
  });
});

describe('unsubscribe', () => {
  it('round-trips a signed, category-scoped token', () => {
    const token = unsubscribeToken('user-1', 'marketing');
    expect(verifyUnsubscribeToken(token)).toEqual({ userId: 'user-1', category: 'marketing' });
  });

  it('rejects a tampered token', () => {
    const token = unsubscribeToken('user-1', 'marketing');
    // Swapping the user id must not survive the signature.
    expect(verifyUnsubscribeToken(token.replace('user-1', 'user-2'))).toBeNull();
    expect(verifyUnsubscribeToken(token.slice(0, -1))).toBeNull();
    expect(verifyUnsubscribeToken('nonsense')).toBeNull();
  });

  it('opting out of promotional mail leaves receipts alone', () => {
    const prefs = { categories: { marketing: { email: false } } };
    expect(channelEnabled(prefs, 'marketing', 'email')).toBe(false);
    expect(channelEnabled(prefs, 'billing', 'email')).toBe(true);
    expect(channelEnabled(prefs, 'wallet', 'email')).toBe(true);
  });

  it('only the marketing category is flagged commercial', () => {
    expect(categoryConfig('marketing').marketing).toBe(true);
    for (const cat of ['billing', 'wallet', 'orders', 'account']) {
      expect(categoryConfig(cat).marketing, `${cat} must not carry an unsubscribe`).toBeFalsy();
    }
  });
});

describe('catalog coverage', () => {
  const KEYS = [
    'billing.activated',
    'billing.renewed',
    'billing.renewal_upcoming',
    'billing.renewal_action_needed',
    'billing.expiring_soon',
    'billing.expiring_soon_plain',
    'billing.payment_failed',
    'billing.past_due',
    'billing.downgraded',
    'billing.canceled',
    'billing.addon_active',
    'billing.addon_expiring',
    'billing.quota_warning',
    'marketing.upgrade_intro',
    'marketing.upgrade_benefits',
    'marketing.upgrade_final',
    'marketing.upgrade_intro_feature',
    'marketing.upgrade_benefits_feature',
    'marketing.upgrade_final_feature',
  ];

  it('every message renders in English and Russian, and has an editable template', () => {
    for (const key of KEYS) {
      expect(EMAIL_TEMPLATE_MAP[key], `${key}: no admin template`).toBeDefined();
      for (const locale of ['en', 'ru']) {
        const rendered = renderNotification(locale, key, {});
        expect(rendered?.title, `${key} (${locale})`).toBeTruthy();
      }
    }
  });

  /**
   * The params each message is actually sent with. Mirrors the `notifications.create`
   * calls in lifecycle.service.ts / subscriptions.service.ts / payments.service.ts —
   * a placeholder in the copy that no sender fills renders as a blank, which is
   * how "…which allows  ." reaches a customer's inbox.
   */
  const SENT_WITH: Record<string, Record<string, unknown>> = {
    'billing.activated': { plan: 'Standard', until: '2026-09-27' },
    'billing.renewed': { plan: 'Standard', amount: '2 900 ₽', until: '2026-09-27' },
    'billing.renewal_upcoming': { plan: 'Standard', until: '2026-09-27', amount: '2 900 ₽' },
    'billing.renewal_action_needed': { plan: 'Standard', until: '2026-09-27', amount: '2 900 ₽' },
    'billing.expiring_soon': {
      plan: 'Standard',
      until: '2026-09-27',
      amount: '2 900 ₽',
      limit: 5,
      quota: { enum: 'plan_limit', value: 'activeListings' },
    },
    'billing.expiring_soon_plain': { plan: 'Pro', until: '2026-09-27', amount: '490 ₽' },
    'billing.payment_failed': { plan: 'Standard', attempt: 1, max: 3 },
    'billing.past_due': { plan: 'Standard', attempt: 2, max: 3 },
    'billing.downgraded': { plan: 'Standard' },
    'billing.canceled': { plan: 'Standard', until: '2026-09-27' },
    'billing.addon_active': { addon: 'promote home', detail: ' until 2026-09-27' },
    'billing.addon_expiring': { addon: 'promote home', until: '2026-09-27' },
    'billing.quota_warning': { used: 45, limit: 50, quota: { enum: 'plan_limit', value: 'activeListings' } },
    'marketing.upgrade_intro': {
      plan: 'Basic',
      paidPlan: 'Standard',
      price: '2 900 ₽/mo',
      quota: { enum: 'plan_limit', value: 'activeListings' },
      limit: 5,
      paidLimit: 50,
      perk: { enum: 'plan_feature', value: 'verifiedBadge' },
    },
    'marketing.upgrade_benefits': {
      plan: 'Basic',
      paidPlan: 'Standard',
      price: '2 900 ₽/mo',
      quota: { enum: 'plan_limit', value: 'activeListings' },
      limit: 5,
      paidLimit: { enum: 'plan_value', value: 'unlimited' },
      perk: { enum: 'plan_feature', value: 'searchPriority' },
    },
    'marketing.upgrade_final': {
      plan: 'Basic',
      paidPlan: 'Standard',
      price: '2 900 ₽/mo',
      quota: { enum: 'plan_limit', value: 'activeListings' },
      limit: 5,
      paidLimit: 50,
      perk: { enum: 'plan_feature', value: 'verifiedBadge' },
    },
    'marketing.upgrade_intro_feature': {
      plan: 'Basic',
      paidPlan: 'Pro',
      price: '490 ₽/mo',
      perk: { enum: 'plan_feature', value: 'directoryVisible' },
    },
    'marketing.upgrade_benefits_feature': {
      plan: 'Basic',
      paidPlan: 'Pro',
      price: '490 ₽/mo',
      perk: { enum: 'plan_feature', value: 'directHireRequests' },
    },
    'marketing.upgrade_final_feature': {
      plan: 'Basic',
      paidPlan: 'Pro',
      price: '490 ₽/mo',
      perk: { enum: 'plan_feature', value: 'directoryVisible' },
    },
  };

  /**
   * Compares the PLACEHOLDERS IN THE COPY against the params the sender passes,
   * rather than eyeballing the rendered string: an unfilled `{{var}}` renders as
   * an empty string, so "Ref {{invoiceNo}}." silently becomes "Ref ." and no
   * amount of whitespace checking finds it.
   */
  function placeholdersOf(locale: string, key: string): Set<string> {
    const catalog = JSON.parse(
      readFileSync(join(I18N_LOCALES, locale, 'notification.json'), 'utf8'),
    ) as Record<string, Record<string, { title?: string; body?: string }>>;
    const [group, name] = key.split('.');
    const node = catalog[group]?.[name];
    const found = new Set<string>();
    for (const text of [node?.title ?? '', node?.body ?? '']) {
      for (const m of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) found.add(m[1]);
    }
    return found;
  }

  it('every placeholder in the copy is a param the sender actually passes', () => {
    for (const key of KEYS) {
      const params = SENT_WITH[key];
      expect(params, `${key}: no fixture — add the params the sender uses`).toBeDefined();
      for (const locale of ['en', 'ru']) {
        const used = placeholdersOf(locale, key);
        expect(used.size, `${key} (${locale}): copy missing from the catalog`).toBeGreaterThan(0);
        for (const name of used) {
          expect(
            Object.prototype.hasOwnProperty.call(params, name),
            `${key} (${locale}): copy uses {{${name}}} but nothing sends it`,
          ).toBe(true);
        }
      }
    }
  });

  it('the two locales agree on which params the copy needs', () => {
    // A translator who drops {{until}} ships a date-less renewal notice; one who
    // invents a placeholder ships a blank. Both are invisible until a customer
    // reads the mail, so they are caught here.
    for (const key of KEYS) {
      expect([...placeholdersOf('ru', key)].sort(), key).toEqual([...placeholdersOf('en', key)].sort());
    }
  });

  it('resolves plan limits and features to localized words, not raw keys', () => {
    const en = renderNotification('en', 'billing.quota_warning', {
      used: 45,
      limit: 50,
      quota: { enum: 'plan_limit', value: 'activeListings' },
    });
    expect(en?.body).toContain('45');
    expect(en?.body).toContain('active listings');
    expect(en?.body).not.toContain('activeListings');

    const ru = renderNotification('ru', 'marketing.upgrade_intro', {
      plan: 'Basic',
      paidPlan: 'Standard',
      price: '2 900 ₽/mo',
      quota: { enum: 'plan_limit', value: 'activeListings' },
      limit: 5,
      paidLimit: { enum: 'plan_value', value: 'unlimited' },
      perk: { enum: 'plan_feature', value: 'verifiedBadge' },
    });
    expect(ru?.body).toContain('активных объявлений');
    expect(ru?.body).not.toContain('unlimited');
    expect(ru?.body).not.toContain('verifiedBadge');
    // Every placeholder must have been filled — a blank leaves a double space.
    expect(ru?.body).not.toMatch(/\{\{|\s{2,}/);
  });
});
