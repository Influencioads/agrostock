import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Role } from '@prisma/client';
import {
  isPeriodLimit,
  PLAN_LIMIT_KEYS,
  type PlanFeatureKey,
  type PlanFeatures,
  type PlanLimitKey,
  type PlanLimits,
} from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Quota and feature resolution — the thing that makes a paid plan mean something.
 *
 * Two rules the commercial plan is explicit about, and which shape this whole file:
 *
 *  1. **Enforce at write time, not read time.** A downgrade that silently leaves
 *     200 listings live teaches every customer the plan is optional. So quotas
 *     are checked when a row is CREATED, and an over-quota account keeps what it
 *     already has but cannot add more.
 *  2. **Quotas are the upgrade trigger, not a paywall.** Nothing needed to
 *     understand the product is hidden; a plan buys more of it.
 *
 * A limit of `null` (or an absent key) means unlimited — deliberately distinct
 * from `0`, which means "none at all".
 */

export interface RoleEntitlement {
  role: Role;
  planId: string | null;
  planCode: string;
  planName: string;
  tier: number;
  limits: PlanLimits;
  features: PlanFeatures;
  /** Null when the user is on the free tier. */
  subscriptionId: string | null;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface Entitlements {
  userId: string;
  /** One entry per role the account effectively holds. */
  roles: Record<string, RoleEntitlement>;
}

export interface UsageRow {
  key: PlanLimitKey;
  used: number;
  /** Null = unlimited. */
  limit: number | null;
  /** Extra slots bought as add-ons on top of the plan limit. */
  addon: number;
  /** False when the platform has no counter for this key yet (see USAGE below). */
  enforced: boolean;
}

/** Statuses that still grant the paid plan's entitlements. */
const ENTITLING = ['active', 'past_due', 'canceled'] as const;

/** Cache TTL. Short on purpose: an upgrade must take effect immediately enough. */
const CACHE_MS = 30_000;

interface CacheEntry {
  at: number;
  value: Entitlements;
}

@Injectable()
export class EntitlementsService {
  private cache = new Map<string, CacheEntry>();

  constructor(private prisma: PrismaService) {}

  /** Drop a user's cached entitlements after any subscription/add-on write. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  /** Master switch — the commercial plan's Phase 0 runs with quotas disarmed. */
  private async quotasArmed(): Promise<boolean> {
    const settings = await this.prisma.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    return settings.quotasEnforced;
  }

  /**
   * Resolve every role the account holds to its current plan. Roles with no
   * subscription fall back to that role's free tier; a role with no free plan
   * seeded at all resolves to "unlimited", because refusing writes over a
   * catalogue gap would break the product for a configuration mistake.
   */
  async resolve(userId: string): Promise<Entitlements> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, roles: true } });
    const held = user ? Array.from(new Set<Role>([user.role, ...user.roles])) : [];

    const [subs, freePlans] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { userId, status: { in: [...ENTITLING] } },
        include: { plan: true },
      }),
      this.prisma.plan.findMany({ where: { tier: 0, active: true }, orderBy: { sortOrder: 'asc' } }),
    ]);

    const roles: Record<string, RoleEntitlement> = {};
    for (const role of held) {
      const sub = subs.find((s) => s.role === role);
      // An expired period is not an entitlement even if the row still says active:
      // the cron may not have run yet, and the customer must not get a free month.
      const live = sub && sub.currentPeriodEnd.getTime() > Date.now() ? sub : undefined;

      if (live) {
        roles[role] = {
          role,
          planId: live.planId,
          planCode: live.plan.code,
          planName: live.plan.name,
          tier: live.plan.tier,
          limits: (live.plan.limits ?? {}) as PlanLimits,
          features: (live.plan.features ?? {}) as PlanFeatures,
          subscriptionId: live.id,
          status: live.status,
          currentPeriodStart: live.currentPeriodStart,
          currentPeriodEnd: live.currentPeriodEnd,
          cancelAtPeriodEnd: live.cancelAtPeriodEnd,
        };
        continue;
      }

      const free = freePlans.find((p) => p.role === role);
      roles[role] = {
        role,
        planId: free?.id ?? null,
        planCode: free?.code ?? `${role}_free`,
        planName: free?.name ?? 'Free',
        tier: 0,
        limits: (free?.limits ?? {}) as PlanLimits,
        features: (free?.features ?? {}) as PlanFeatures,
        subscriptionId: null,
        status: 'free',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const value: Entitlements = { userId, roles };
    this.cache.set(userId, { at: Date.now(), value });
    return value;
  }

  /** The entitlement for one role, or null when the account does not hold it. */
  async forRole(userId: string, role: Role): Promise<RoleEntitlement | null> {
    return (await this.resolve(userId)).roles[role] ?? null;
  }

  /**
   * A feature flag. Returns the plan's value, or the supplied fallback when the
   * account does not hold that role at all.
   */
  async feature(userId: string, role: Role, key: PlanFeatureKey, fallback: boolean | string = false): Promise<boolean | string> {
    const ent = await this.forRole(userId, role);
    return ent?.features[key] ?? fallback;
  }

  /**
   * The effective quota: the plan limit plus any add-on slots bought on top.
   * Null means unlimited, and unlimited plus add-ons is still unlimited.
   */
  async limit(userId: string, role: Role, key: PlanLimitKey): Promise<number | null> {
    const ent = await this.forRole(userId, role);
    // A role the user does not hold has no plan to limit them by; the role guard
    // on the endpoint is what stops them, not the quota.
    if (!ent) return null;
    const base = ent.limits[key];
    if (base === null || base === undefined) return null;
    return base + (await this.addonSlots(userId, key));
  }

  /** Extra capacity purchased as add-ons. Only listings/auction lots sell slots. */
  private async addonSlots(userId: string, key: PlanLimitKey): Promise<number> {
    const kind = key === 'activeListings' ? 'extra_listing' : key === 'auctionLotsPerMonth' ? 'auction_lot' : null;
    if (!kind) return 0;
    return this.prisma.addonPurchase.count({
      where: { userId, kind, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    });
  }

  /**
   * Start of the window a per-period quota is counted over: the current billing
   * period for a subscriber, the calendar month for a free account. Using the
   * calendar month for free users keeps the reset predictable when there is no
   * period to anchor to.
   */
  private async windowStart(userId: string, role: Role): Promise<Date> {
    const ent = await this.forRole(userId, role);
    if (ent?.currentPeriodStart) return ent.currentPeriodStart;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Count current usage for one quota key. Returns null when the platform has no
   * counter for it — `savedSearches` and seller/buyer `teamMembers` are on the
   * published price card but the underlying features do not exist yet, and
   * inventing a counter that always reads zero would be a quota that silently
   * never binds. They are reported as unenforced instead.
   */
  async usageOf(userId: string, role: Role, key: PlanLimitKey): Promise<number | null> {
    const since = isPeriodLimit(key) ? await this.windowStart(userId, role) : undefined;

    switch (key) {
      case 'activeListings':
        // Pending counts: a listing awaiting moderation still occupies a slot,
        // or a seller could queue 500 and have them all go live on approval.
        return this.prisma.product.count({ where: { sellerId: userId, status: { in: ['live', 'pending'] } } });

      case 'auctionLotsPerMonth':
        return this.prisma.product.count({ where: { sellerId: userId, isAuction: true, createdAt: { gte: since } } });

      case 'rfqsPerMonth':
        return this.prisma.buyerBid.count({ where: { buyerId: userId, createdAt: { gte: since } } });

      case 'vehicles':
        return this.prisma.vehicle.count({ where: { ownerId: userId } });

      case 'driverAccounts':
        return this.prisma.driver.count({ where: { ownerId: userId } });

      case 'managedWorkers':
        return this.prisma.worker.count({ where: { loadercoId: userId } });

      case 'pricedServices':
        return this.prisma.providerService.count({ where: { provider: { userId } } });

      case 'enquiriesPerMonth':
        // Enquiries RECEIVED — the provider is the target of the hire request.
        return this.prisma.hireRequest.count({ where: { targetUserId: userId, createdAt: { gte: since } } });

      case 'hireResponsesPerMonth': {
        // A "response" is either deciding a hire request addressed to you or
        // quoting a transport request. `decidedAt` is the response timestamp;
        // the request's own createdAt would count the wrong month.
        const [decided, quoted] = await Promise.all([
          this.prisma.hireRequest.count({ where: { targetUserId: userId, decidedAt: { gte: since } } }),
          this.prisma.transportQuote.count({ where: { transporterId: userId, createdAt: { gte: since } } }),
        ]);
        return decided + quoted;
      }

      case 'operatingRegions': {
        const profile = await this.prisma.profile.findUnique({ where: { userId }, select: { operatingCities: true } });
        return profile?.operatingCities.length ?? 0;
      }

      case 'serviceAreas': {
        // Service providers keep their areas on ServiceProvider; labour companies
        // keep theirs on Profile. Whichever the account has is the right count.
        const [sp, profile] = await Promise.all([
          this.prisma.serviceProvider.findUnique({ where: { userId }, select: { citiesServed: true } }),
          this.prisma.profile.findUnique({ where: { userId }, select: { operatingCities: true } }),
        ]);
        return sp ? sp.citiesServed.length : (profile?.operatingCities.length ?? 0);
      }

      // Enforced per request against the payload, not by counting rows.
      case 'photosPerListing':
        return null;

      // No underlying feature yet — see the doc comment above.
      case 'savedSearches':
      case 'teamMembers':
        return null;

      default:
        return null;
    }
  }

  /**
   * The quota meters shown in the console: "42 of 50 listings used". Only keys
   * the role's plan actually carries are returned, so a seller does not see a
   * vehicles row.
   */
  async usage(userId: string, role: Role): Promise<UsageRow[]> {
    const ent = await this.forRole(userId, role);
    if (!ent) return [];

    const keys = PLAN_LIMIT_KEYS.filter((k) => k in ent.limits);
    const rows = await Promise.all(
      keys.map(async (key) => {
        const [used, addon] = await Promise.all([this.usageOf(userId, role, key), this.addonSlots(userId, key)]);
        const base = ent.limits[key];
        return {
          key,
          used: used ?? 0,
          limit: base === null || base === undefined ? null : base + addon,
          addon,
          enforced: used !== null,
        };
      }),
    );
    return rows;
  }

  /**
   * The gate. Call BEFORE creating rows, passing how many are about to be
   * created — the bulk endpoints create N at once, and decrementing by one there
   * would make the quota trivially bypassable.
   *
   * Throws 403 with `code: 'QUOTA_EXCEEDED'` and the numbers, so a client can
   * render "you have used 5 of 5 listings — upgrade" instead of a bare error.
   */
  async assertWithin(userId: string, role: Role, key: PlanLimitKey, adding = 1): Promise<void> {
    if (!(await this.quotasArmed())) return;

    const limit = await this.limit(userId, role, key);
    if (limit === null) return; // unlimited

    const used = await this.usageOf(userId, role, key);
    if (used === null) return; // nothing to count against — do not fake a block

    if (used + adding > limit) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'QUOTA_EXCEEDED',
        message: `Your plan allows ${limit} — you are using ${used}. Upgrade for more.`,
        quota: { key, limit, used, adding, role },
      });
    }
  }

  /**
   * Per-request cap rather than a running total: how many photos one listing may
   * carry. Returns the allowed count so callers can trim instead of rejecting
   * where that is kinder.
   */
  async photoLimit(userId: string, role: Role): Promise<number | null> {
    if (!(await this.quotasArmed())) return null;
    return this.limit(userId, role, 'photosPerListing');
  }

  /** Assert a scalar array (service areas, operating regions) fits the plan. */
  async assertArrayWithin(userId: string, role: Role, key: PlanLimitKey, nextLength: number): Promise<void> {
    if (!(await this.quotasArmed())) return;
    const limit = await this.limit(userId, role, key);
    if (limit === null || nextLength <= limit) return;
    throw new ForbiddenException({
      statusCode: 403,
      code: 'QUOTA_EXCEEDED',
      message: `Your plan allows ${limit} — you selected ${nextLength}. Upgrade for more.`,
      quota: { key, limit, used: nextLength, adding: 0, role },
    });
  }
}
