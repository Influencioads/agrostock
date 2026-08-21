import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { BillingCycle, Plan, PlanPrice, Prisma, Role } from '@prisma/client';
import {
  isPlanFeatureKey,
  isPlanLimitKey,
  PLAN_FEATURE_OPTIONS,
  perMonthMinor,
  type PlanFeatures,
  type PlanLimits,
} from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';
import { TextTranslationService } from '../translation/text-translation.service';

export interface PlanPriceDto {
  cycle: BillingCycle;
  amountMinor: number;
  /** Convenience for the pricing page: the per-month figure shown alongside. */
  perMonthMinor: number;
  currency: string;
}

export interface PlanDto {
  id: string;
  code: string;
  role: Role;
  tier: number;
  name: string;
  description: string | null;
  active: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
  prices: PlanPriceDto[];
}

type PlanWithPrices = Plan & { prices: PlanPrice[] };

/**
 * The plan catalogue: read for the pricing page, written by the admin console.
 *
 * Validation lives here rather than in DTO decorators because `limits` and
 * `features` are Json — a class-validator rule cannot express "keys must come
 * from PLAN_LIMIT_KEYS and values must be a positive integer or null". Letting
 * an arbitrary key through would create a quota nothing enforces, which is worse
 * than rejecting the write.
 */
@Injectable()
export class PlansService {
  constructor(
    private prisma: PrismaService,
    private text: TextTranslationService,
  ) {}

  /** Coerce and validate an admin-supplied limits object. */
  static parseLimits(raw: unknown): PlanLimits {
    if (raw === undefined || raw === null) return {};
    if (typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('limits must be an object');
    const out: PlanLimits = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!isPlanLimitKey(key)) throw new BadRequestException(`Unknown quota key: ${key}`);
      // null is meaningful and distinct from 0: it means unlimited.
      if (value === null || value === '') {
        out[key] = null;
        continue;
      }
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) throw new BadRequestException(`Quota ${key} must be a non-negative whole number, or null for unlimited`);
      out[key] = n;
    }
    return out;
  }

  /** Coerce and validate an admin-supplied features object. */
  static parseFeatures(raw: unknown): PlanFeatures {
    if (raw === undefined || raw === null) return {};
    if (typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('features must be an object');
    const out: PlanFeatures = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!isPlanFeatureKey(key)) throw new BadRequestException(`Unknown feature key: ${key}`);
      const options = (PLAN_FEATURE_OPTIONS as Record<string, readonly string[]>)[key];
      if (options) {
        if (typeof value !== 'string' || !options.includes(value)) {
          throw new BadRequestException(`Feature ${key} must be one of: ${options.join(', ')}`);
        }
        out[key] = value;
      } else {
        out[key] = Boolean(value);
      }
    }
    return out;
  }

  private toDto(plan: PlanWithPrices, name?: string): PlanDto {
    return {
      id: plan.id,
      code: plan.code,
      role: plan.role,
      tier: plan.tier,
      name: name ?? plan.name,
      description: plan.description,
      active: plan.active,
      limits: (plan.limits ?? {}) as PlanLimits,
      features: (plan.features ?? {}) as PlanFeatures,
      prices: plan.prices
        .filter((p) => p.active)
        .map((p) => ({
          cycle: p.cycle,
          amountMinor: p.amountMinor,
          perMonthMinor: perMonthMinor(p.amountMinor, p.cycle),
          currency: p.currency,
        }))
        .sort((a, b) => a.amountMinor - b.amountMinor),
    };
  }

  /**
   * The public catalogue. Plan names and descriptions are admin-authored English
   * text, so they go through the same machine-translation cache every other piece
   * of admin-authored copy uses.
   */
  async list(opts: { role?: Role; includeInactive?: boolean; locale?: string } = {}): Promise<PlanDto[]> {
    const plans = await this.prisma.plan.findMany({
      where: { ...(opts.role ? { role: opts.role } : {}), ...(opts.includeInactive ? {} : { active: true }) },
      include: { prices: true },
      orderBy: [{ sortOrder: 'asc' }, { tier: 'asc' }],
    });

    if (!opts.locale || opts.locale === 'en') return plans.map((p) => this.toDto(p));

    const names = await this.text.localizeMany(
      plans.map((p) => p.name),
      opts.locale,
    );
    // localizeMany preserves alignment but is typed as nullable — fall back to
    // the English source rather than rendering an empty plan name.
    return plans.map((p, i) => this.toDto(p, names[i] ?? undefined));
  }

  async byId(id: string): Promise<PlanWithPrices> {
    const plan = await this.prisma.plan.findUnique({ where: { id }, include: { prices: true } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  /** The free plan for a role — the entitlement floor everyone falls back to. */
  async freePlanFor(role: Role): Promise<PlanWithPrices | null> {
    return this.prisma.plan.findFirst({
      where: { role, tier: 0, active: true },
      include: { prices: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** The price of one plan on one cycle, or null when that cycle is not offered. */
  async priceFor(planId: string, cycle: BillingCycle): Promise<PlanPrice | null> {
    return this.prisma.planPrice.findUnique({ where: { planId_cycle: { planId, cycle } } });
  }

  async create(input: {
    code: string;
    role: Role;
    tier: number;
    name: string;
    description?: string | null;
    limits?: unknown;
    features?: unknown;
    sortOrder?: number;
  }): Promise<PlanDto> {
    const existing = await this.prisma.plan.findUnique({ where: { code: input.code }, select: { id: true } });
    if (existing) throw new BadRequestException(`A plan with code "${input.code}" already exists.`);

    const plan = await this.prisma.plan.create({
      data: {
        code: input.code,
        role: input.role,
        tier: input.tier,
        name: input.name,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        limits: PlansService.parseLimits(input.limits) as Prisma.InputJsonValue,
        features: PlansService.parseFeatures(input.features) as Prisma.InputJsonValue,
      },
      include: { prices: true },
    });
    return this.toDto(plan);
  }

  async update(
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      tier?: number;
      active?: boolean;
      sortOrder?: number;
      limits?: unknown;
      features?: unknown;
    },
  ): Promise<PlanDto> {
    await this.byId(id);
    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.description === undefined ? {} : { description: patch.description }),
        ...(patch.tier === undefined ? {} : { tier: patch.tier }),
        ...(patch.active === undefined ? {} : { active: patch.active }),
        ...(patch.sortOrder === undefined ? {} : { sortOrder: patch.sortOrder }),
        ...(patch.limits === undefined ? {} : { limits: PlansService.parseLimits(patch.limits) as Prisma.InputJsonValue }),
        ...(patch.features === undefined ? {} : { features: PlansService.parseFeatures(patch.features) as Prisma.InputJsonValue }),
      },
      include: { prices: true },
    });
    return this.toDto(plan);
  }

  /**
   * Set or clear one cycle price. A null amount removes the cycle, which is how
   * an admin stops offering (say) quarterly without deleting the plan.
   */
  async setPrice(planId: string, cycle: BillingCycle, amountMinor: number | null, currency = 'RUB'): Promise<PlanDto> {
    await this.byId(planId);
    if (amountMinor === null) {
      await this.prisma.planPrice.deleteMany({ where: { planId, cycle } });
    } else {
      if (!Number.isInteger(amountMinor) || amountMinor < 0) throw new BadRequestException('Price must be a non-negative whole number of minor units.');
      await this.prisma.planPrice.upsert({
        where: { planId_cycle: { planId, cycle } },
        create: { planId, cycle, amountMinor, currency },
        update: { amountMinor, currency, active: true },
      });
    }
    return this.toDto(await this.byId(planId));
  }

  /**
   * Deactivate rather than delete: subscriptions reference the plan, and a hard
   * delete would either fail on the FK or orphan a paying customer. A deactivated
   * plan disappears from the pricing page but keeps serving its existing subscribers.
   */
  async deactivate(id: string): Promise<PlanDto> {
    const plan = await this.byId(id);
    if (plan.tier === 0) throw new BadRequestException('The free tier cannot be deactivated — it is the entitlement floor.');
    return this.update(id, { active: false });
  }
}
