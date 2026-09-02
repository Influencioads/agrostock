import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, type Role } from '@prisma/client';
import {
  UNENFORCED_LIMIT_KEYS,
  applyDiscount,
  isPlanFeatureKey,
  isPlanLimitKey,
  type PlanFeatures,
  type PlanLimits,
  type PlanLimitKey,
} from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, type NotificationParams } from '../notifications/notifications.service';
import { channelEnabled } from '../notifications/notification-categories';
import { PlansService } from './plans.service';

/**
 * Everything the payment flow sends on a CLOCK rather than on an event.
 *
 * The event-driven half of billing email already exists: a payment settles, a
 * card is declined, a plan is cancelled, and `NotificationsService` fans that out
 * to in-app, push and email. What no event can produce is the mail that has to
 * arrive *before* something happens — a renewal the customer forgot about, a
 * promotion about to lapse — and the upgrade sequence for accounts that never
 * subscribed at all. That is this file.
 *
 * ## Why it is not spam
 *
 * The requirement was "keep reminding people what they are missing, but don't be
 * spammy". Politeness is not a tone here, it is five mechanisms:
 *
 *  1. **Send-once, structurally.** Every message claims a `LifecycleEmail` row
 *     whose unique key encodes the message AND its subject (`renewal:<sub>:<date>`).
 *     The claim happens before the send, so a re-run, a second replica or a
 *     retried cron cannot produce a duplicate — the database refuses it.
 *  2. **A sequence that ends.** The upgrade nudges are three mails over a month
 *     and then silence forever, and the third one says so in its own copy.
 *  3. **A cooldown, on promotional mail only.** Nothing commercial goes out
 *     within {@link MARKETING_COOLDOWN_DAYS} days of the last lifecycle mail —
 *     but a "we charge your card tomorrow" notice is never suppressed, because
 *     silence there costs the customer money.
 *  4. **Stop means stop.** One-click unsubscribe (RFC 8058) is checked here
 *     before anything is composed, so opting out kills the in-app copy too, not
 *     just the email.
 *  5. **Relevance over frequency.** A nudge names the account's own tightest
 *     quota and the one feature its plan actually lacks — the pitch is computed
 *     per role, so nobody is sold a verified badge their plan already includes.
 *
 * An admin can stop the whole clock-driven half with
 * `BillingSettings.lifecycleEmailsEnabled` without touching receipts or dunning.
 */

/** How far ahead the first renewal notice goes out. */
const NOTICE_DAYS = 7;
/** The second, urgent notice — only for renewals that will FAIL without action. */
const FINAL_NOTICE_DAYS = 2;
/** Add-ons are short-lived, so their single notice sits closer to the end. */
const ADDON_NOTICE_DAYS = 3;
/** No promotional mail within this many days of any other lifecycle mail. */
const MARKETING_COOLDOWN_DAYS = 4;

/**
 * Which feature to lead the upgrade pitch with, best first. The first key in
 * this list that the paid plan grants and the free plan does not becomes the
 * `{{perk}}` in the copy — so the sentence is true for the recipient's role
 * rather than true on average.
 */
const PERK_PRIORITY = [
  'verifiedBadge',
  'dispatchBoard',
  'searchPriority',
  'routePriority',
  'directoryPlacement',
  'analytics',
  'payoutReports',
  'apiAccess',
  'bulkImport',
  'directHireRequests',
  'directoryVisible',
] as const;

const DAY_MS = 86_400_000;

/** Which copy a role's plan ladder can honestly support. See `pitchFor`. */
type NudgeVariant = 'quota' | 'feature';

/** The sequence, in order. Step 3 is the last promotional mail an account gets. */
const NUDGE_STEPS: Record<NudgeVariant, string>[] = [
  { quota: 'marketing.upgrade_intro', feature: 'marketing.upgrade_intro_feature' },
  { quota: 'marketing.upgrade_benefits', feature: 'marketing.upgrade_benefits_feature' },
  { quota: 'marketing.upgrade_final', feature: 'marketing.upgrade_final_feature' },
];

/** Kopecks → the string the recipient will recognise from the price card. */
function rub(amountMinor: number): string {
  return `${(amountMinor / 100).toLocaleString('ru-RU')} ₽`;
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The limit worth naming in an upgrade pitch: the smallest countable ceiling on
 * the free plan that the paid plan actually raises. Smallest because that is the
 * one the account hits first, and "actually raises" because pointing at a quota
 * both plans share would make the email a lie.
 *
 * Pure and exported so the branch table can be tested without a database.
 */
export function tightestLimit(
  freeLimits: PlanLimits,
  paidLimits: PlanLimits,
): { key: PlanLimitKey; freeLimit: number; paidLimit: number | null } | null {
  let best: { key: PlanLimitKey; freeLimit: number; paidLimit: number | null } | null = null;
  for (const [rawKey, value] of Object.entries(freeLimits ?? {})) {
    if (!isPlanLimitKey(rawKey) || typeof value !== 'number') continue;
    // A cap on a feature that does not exist yet is not a reason to upgrade.
    if (UNENFORCED_LIMIT_KEYS.includes(rawKey)) continue;
    const paid = paidLimits?.[rawKey];
    // Absent or null on the paid side means unlimited — the biggest raise there is.
    const paidLimit = paid === undefined || paid === null ? null : paid;
    if (paidLimit !== null && paidLimit <= value) continue;
    if (!best || value < best.freeLimit) best = { key: rawKey, freeLimit: value, paidLimit };
  }
  return best;
}

/** First feature by {@link PERK_PRIORITY} that the paid plan adds over the free one. */
export function topPerk(freeFeatures: PlanFeatures, paidFeatures: PlanFeatures): string {
  for (const key of PERK_PRIORITY) {
    const paid = paidFeatures?.[key];
    if (paid === undefined || paid === false || paid === 'none') continue;
    if (paid === freeFeatures?.[key]) continue;
    return key;
  }
  // Only reached when a plan grants no flags at all — pitchFor already refuses a
  // plan that raises no quota, so there is always something else to say.
  const fallback = Object.keys(paidFeatures ?? {}).find(
    (k) => isPlanFeatureKey(k) && paidFeatures[k] !== freeFeatures?.[k],
  );
  return fallback ?? 'searchPriority';
}

@Injectable()
export class LifecycleService {
  private readonly logger = new Logger('LifecycleService');

  constructor(
    private prisma: PrismaService,
    private plans: PlansService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Claim a message, then send it. The unique index on `(userId, key)` is the
   * lock: whoever inserts the row owns the send, and everyone else — a duplicate
   * cron tick, a second instance, a manual admin run — gets P2002 and does
   * nothing. Claiming BEFORE sending means the worst case is a mail that is
   * never sent rather than one sent twice, which is the right way round for
   * something a customer can report as spam.
   */
  private async once(userId: string, key: string, send: () => Promise<unknown>): Promise<boolean> {
    try {
      await this.prisma.lifecycleEmail.create({ data: { userId, key } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
    try {
      await send();
      return true;
    } catch (e) {
      // The claim stays. A failed transport is the mailer's problem to log, and
      // deleting the claim here would turn one SMTP blip into a repeat send on
      // the next tick.
      this.logger.error(`lifecycle send ${key} failed: ${(e as Error).message}`);
      return false;
    }
  }

  private async settings() {
    return this.prisma.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  }

  /**
   * The daily pass. One fixed hour rather than per-recipient local morning:
   * `User` stores a country but not a timezone, and 08:00 UTC is a civil hour
   * across every longitude this platform trades in.
   *
   * ponytail: single-instance, like the renewal sweep beside it. A multi-replica
   * deployment wants a leader lock — though the `once()` claim already makes a
   * double run harmless, which is why this is a nicety and not a bug.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'billing-lifecycle' })
  async runDaily(): Promise<{ renewals: number; addons: number; nudges: number }> {
    const settings = await this.settings();
    if (!settings.lifecycleEmailsEnabled) return { renewals: 0, addons: 0, nudges: 0 };

    // Sequential, not Promise.all: the marketing cooldown reads the same ledger
    // the reminders write, and a daily job has no latency budget worth defending.
    const renewals = await this.remindRenewals();
    const addons = await this.remindAddons();
    const nudges = await this.runUpgradeSequence(settings.upgradeNudgeDays);

    if (renewals || addons || nudges) {
      this.logger.log(`Lifecycle mail: ${renewals} renewal notices, ${addons} add-on notices, ${nudges} upgrade nudges`);
    }
    return { renewals, addons, nudges };
  }

  /* ── before the money moves ───────────────────────────────────── */

  /**
   * Warn about every period that ends in the next week. Three different mails,
   * because three different things are about to happen and only one of them
   * needs the customer to do anything:
   *
   *  - the card will be charged      → one courtesy notice, no action needed
   *  - there is no card to charge    → two notices, because the plan WILL lapse
   *  - the plan was cancelled        → two notices, because it is about to end
   *
   * A free tier is skipped entirely: nothing renews and nothing is lost, so a
   * reminder would be pure noise.
   */
  async remindRenewals(): Promise<number> {
    const now = new Date();
    const due = await this.prisma.subscription.findMany({
      where: {
        // `past_due` is deliberately absent. Dunning already owns that
        // conversation — it emails on every failed attempt — and a "your plan
        // renews soon" notice landing between two "we could not charge your
        // card" notices is both confusing and the definition of spam.
        status: { in: ['active', 'canceled'] },
        currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + NOTICE_DAYS * DAY_MS) },
      },
      include: { plan: true },
      take: 500,
    });

    let sent = 0;
    for (const sub of due) {
      try {
        const price = await this.plans.priceFor(sub.planId, sub.cycle);
        if (!price || price.amountMinor <= 0) continue;

        const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS);
        // One bucket per notice so the 7-day and 2-day mails hold distinct keys
        // and neither can be re-sent as the date creeps closer.
        const bucket = daysLeft <= FINAL_NOTICE_DAYS ? FINAL_NOTICE_DAYS : NOTICE_DAYS;
        const stamp = `${sub.id}:${day(sub.currentPeriodEnd)}:${bucket}`;
        const until = day(sub.currentPeriodEnd);

        const ending = sub.cancelAtPeriodEnd || sub.status === 'canceled';
        // cancel() already emails billing.canceled with the same plan and date.
        // Without this, cancelling inside the last week produces that mail plus
        // the 7-day notice plus the 2-day notice — three messages saying one
        // thing, to someone who has just told us they are leaving.
        if (ending && sub.canceledAt && now.getTime() - sub.canceledAt.getTime() < MARKETING_COOLDOWN_DAYS * DAY_MS) continue;
        const willRetry = Boolean(sub.provider && sub.providerToken);

        // A charge that is simply going to succeed needs telling once, early.
        if (!ending && willRetry && bucket !== NOTICE_DAYS) continue;

        // Quote what we will ACTUALLY take. `subscriptions.service.liveDiscount`
        // applies the grandfathering discount at charge time, so billing the
        // catalogue price here would promise a comped or discounted customer a
        // charge that never arrives — wrong in the direction people act on.
        // Duplicated rather than injected: SubscriptionsService → Entitlements →
        // Lifecycle would close a DI cycle.
        const chargeMinor =
          sub.discountPercent > 0 && !(sub.discountUntil && sub.discountUntil.getTime() < now.getTime())
            ? applyDiscount(price.amountMinor, sub.discountPercent)
            : price.amountMinor;

        const params: NotificationParams = {
          plan: sub.plan.name,
          until,
          amount: rub(chargeMinor),
        };

        // "…then you drop to 5 active listings" is the half of the message that
        // makes the loss concrete. Some ladders (the worker plans) carry no
        // quotas at all, so there is a second wording without that clause —
        // leaving the placeholder unfilled would render "allows  ." instead.
        let type: string;
        if (ending) {
          const free = await this.plans.freePlanFor(sub.role);
          const floor = free && tightestLimit(free.limits as PlanLimits, sub.plan.limits as PlanLimits);
          if (floor) {
            params.limit = floor.freeLimit;
            params.quota = { enum: 'plan_limit', value: floor.key };
          }
          type = floor ? 'billing.expiring_soon' : 'billing.expiring_soon_plain';
        } else {
          type = willRetry ? 'billing.renewal_upcoming' : 'billing.renewal_action_needed';
        }

        if (
          await this.once(sub.userId, `renewal:${type.split('.')[1]}:${stamp}`, () =>
            this.notifications.create({ userId: sub.userId, system: 'billing', type, params, linkUrl: '/console/billing' }),
          )
        ) {
          sent++;
        }
      } catch (e) {
        // One bad subscription must not stop the notices for everyone else.
        this.logger.error(`Renewal notice failed for ${sub.id}: ${(e as Error).message}`);
      }
    }
    return sent;
  }

  /** Promotions and badges lapse silently otherwise — the slot just stops selling. */
  async remindAddons(): Promise<number> {
    const now = new Date();
    const expiring = await this.prisma.addonPurchase.findMany({
      where: { active: true, expiresAt: { gt: now, lte: new Date(now.getTime() + ADDON_NOTICE_DAYS * DAY_MS) } },
      take: 500,
    });

    let sent = 0;
    for (const addon of expiring) {
      const ok = await this.once(addon.userId, `addon:${addon.id}`, () =>
        this.notifications.create({
          userId: addon.userId,
          system: 'billing',
          type: 'billing.addon_expiring',
          params: { addon: addon.kind.replace(/_/g, ' '), until: day(addon.expiresAt!) },
          linkUrl: '/console/billing',
        }),
      ).catch((e) => {
        this.logger.error(`Add-on notice failed for ${addon.id}: ${(e as Error).message}`);
        return false;
      });
      if (ok) sent++;
    }
    return sent;
  }

  /* ── the upgrade sequence ─────────────────────────────────────── */

  /**
   * Three mails, on the configured days after the account confirmed its email,
   * to accounts that are still on a free plan — then nothing, ever again.
   *
   * Each step queries one day's cohort rather than "everyone older than N days",
   * so the work is proportional to signups, not to the size of the user table,
   * and an account that was already past the day when the feature shipped is
   * never carpet-bombed with the whole sequence at once.
   */
  async runUpgradeSequence(days: number[]): Promise<number> {
    let sent = 0;
    // A pitch depends only on the role's plan ladder, and a day's cohort is
    // mostly two or three roles — so resolve each ladder once per run instead of
    // once per recipient.
    const pitches = new Map<Role, Awaited<ReturnType<LifecycleService['pitchFor']>>>();
    // NUDGE_STEPS is indexed by POSITION while the cohort comes from the VALUE,
    // so an admin typing "30, 12, 3" would send the "this is the last email"
    // copy first, on day 3. Sort and dedupe rather than trusting the input.
    days = [...new Set(days)].sort((a, b) => a - b);
    for (const [step, offset] of days.entries()) {
      const until = new Date(Date.now() - offset * DAY_MS);
      const from = new Date(until.getTime() - DAY_MS);
      const cohort = await this.prisma.user.findMany({
        where: {
          active: true,
          emailVerifiedAt: { gte: from, lt: until },
          role: { not: 'admin' },
          // A paying account is not a prospect. The condition mirrors how
          // EntitlementsService decides a plan is live — status in ENTITLING and
          // the period still running — because a customer who cancelled
          // yesterday still HAS the plan, and selling it back to them reads as
          // though we did not notice they were already a customer.
          subscriptions: {
            none: {
              status: { in: ['active', 'past_due', 'canceled'] },
              currentPeriodEnd: { gt: new Date() },
              plan: { tier: { gt: 0 } },
            },
          },
        },
        select: { id: true, role: true, notificationPrefs: true },
        take: 500,
      });

      for (const user of cohort) {
        try {
          if (!pitches.has(user.role)) pitches.set(user.role, await this.pitchFor(user.role));
          if (await this.sendNudge(user, step, pitches.get(user.role)!)) sent++;
        } catch (e) {
          this.logger.error(`Upgrade nudge failed for ${user.id}: ${(e as Error).message}`);
        }
      }
    }
    return sent;
  }

  private async sendNudge(
    user: { id: string; role: Role; notificationPrefs: unknown },
    step: number,
    pitch: Awaited<ReturnType<LifecycleService['pitchFor']>>,
  ): Promise<boolean> {
    if (!pitch) return false; // no paid ladder for this role — nothing to sell
    // Checked here and not left to the mailer: an opt-out should stop the whole
    // message, in-app copy included, not just its email leg.
    if (!channelEnabled(user.notificationPrefs, 'marketing', 'email')) return false;
    if (await this.recentlyMailed(user.id)) return false;

    const type = NUDGE_STEPS[step]?.[pitch.variant];
    if (!type) return false;

    return this.once(user.id, `upgrade:${step}`, () =>
      this.notifications.create({
        userId: user.id,
        system: 'marketing',
        type,
        params: pitch.params,
        linkUrl: '/pricing',
        // Promotional mail has no business ringing a phone.
        push: false,
      }),
    );
  }

  /** True when this account got any lifecycle mail inside the cooldown window. */
  private async recentlyMailed(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - MARKETING_COOLDOWN_DAYS * DAY_MS);
    const recent = await this.prisma.lifecycleEmail.findFirst({
      where: { userId, sentAt: { gte: since } },
      select: { id: true },
    });
    return recent !== null;
  }

  /**
   * The concrete pitch for one role, and which copy it fits.
   *
   * Two ladders sell two different things. Most roles sell volume, so the pitch
   * is a number the recipient can check — "5 listings becomes 50". The worker
   * ladder has no quotas at all and sells visibility, so its copy leads on the
   * feature instead; naming a limit those plans do not have would be an invented
   * fact in a marketing email, which is exactly how a sender earns a spam
   * report. Returns null when the role has no paid tier to sell.
   */
  private async pitchFor(role: Role): Promise<{ variant: NudgeVariant; params: NotificationParams } | null> {
    const [free, paid] = await Promise.all([
      this.plans.freePlanFor(role),
      this.prisma.plan.findFirst({
        where: { role, tier: { gt: 0 }, active: true },
        include: { prices: true },
        orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);
    if (!free || !paid) return null;

    const monthly = paid.prices.find((p) => p.cycle === 'monthly' && p.active) ?? paid.prices[0];
    if (!monthly || monthly.amountMinor <= 0) return null;

    const perk = topPerk(free.features as PlanFeatures, paid.features as PlanFeatures);
    const common = {
      plan: free.name,
      paidPlan: paid.name,
      price: `${rub(monthly.amountMinor)}${monthly.cycle === 'monthly' ? '/mo' : ''}`,
      perk: { enum: 'plan_feature', value: perk },
    };

    const floor = tightestLimit(free.limits as PlanLimits, paid.limits as PlanLimits);
    if (!floor) return { variant: 'feature', params: common };

    return {
      variant: 'quota',
      params: {
        ...common,
        quota: { enum: 'plan_limit', value: floor.key },
        limit: floor.freeLimit,
        // An unlimited ceiling has no number to print, so it resolves through the
        // catalog like any other localized token instead of leaking "null".
        paidLimit: floor.paidLimit === null ? { enum: 'plan_value', value: 'unlimited' } : floor.paidLimit,
      },
    };
  }

  /* ── behavioural: the quota ceiling ───────────────────────────── */

  /**
   * "You have used 45 of 50 listings." Fired from the quota gate itself rather
   * than from a sweep, because that is both free — the gate has already counted
   * — and better timed: the moment somebody feels the ceiling is the moment the
   * upgrade is a relief rather than an advert.
   *
   * Scoped once per quota per billing window, so a seller who spends an
   * afternoon publishing hears about it once and not forty times.
   */
  async warnApproachingQuota(input: {
    userId: string;
    role: Role;
    key: PlanLimitKey;
    used: number;
    limit: number;
    windowKey: string;
  }): Promise<void> {
    // The kill switch has to cover this too. It is the emergency brake on a live
    // billing system, and an operator who pulls it because customers are
    // complaining about mail must not keep seeing quota warnings go out from the
    // same ledger under the same feature name.
    if (!(await this.settings()).lifecycleEmailsEnabled) return;
    await this.once(input.userId, `quota:${input.role}:${input.key}:${input.windowKey}`, () =>
      this.notifications.create({
        userId: input.userId,
        system: 'billing',
        type: 'billing.quota_warning',
        params: {
          used: input.used,
          limit: input.limit,
          quota: { enum: 'plan_limit', value: input.key },
        },
        linkUrl: '/pricing',
      }),
    );
  }

  /* ── admin ───────────────────────────────────────────────────── */

  /** What the account has already been sent, newest first (admin support view). */
  historyFor(userId: string) {
    return this.prisma.lifecycleEmail.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
  }
}
