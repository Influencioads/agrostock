import { Injectable } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { CYCLE_MONTHS } from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';

export interface RevenueSummary {
  /** Monthly recurring revenue in minor units, normalized across cycles. */
  mrrMinor: number;
  arrMinor: number;
  currency: string;
  paidAccounts: number;
  freeAccounts: number;
  pastDue: number;
  /** Add-on revenue collected in the last 30 days. */
  addonMinor30d: number;
  /** Subscription revenue actually collected in the last 30 days. */
  collectedMinor30d: number;
  /** Cancelled or expired in the last 30 days, over the paid base — a rough logo churn. */
  churnPercent30d: number;
  byRole: { role: Role; paid: number; mrrMinor: number }[];
  byPlan: { planCode: string; planName: string; paid: number; mrrMinor: number }[];
}

/**
 * MRR / ARR / churn for the admin console.
 *
 * Without this none of the revenue projections can be checked against reality —
 * which is the point of building it at the same time as the billing itself
 * rather than after the first quarter of guessing.
 *
 * MRR is computed from live subscriptions and their CURRENT plan price, not from
 * cash collected: a yearly plan paid once contributes one twelfth per month, and
 * that is the number the projections are stated in.
 */
@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  async summary(): Promise<RevenueSummary> {
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 864e5);

    const [live, pastDue, freeCount, addonAgg, collectedAgg, churned] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { status: { in: ['active', 'past_due', 'canceled'] }, currentPeriodEnd: { gt: now }, plan: { tier: { gt: 0 } } },
        include: { plan: { include: { prices: true } } },
      }),
      this.prisma.subscription.count({ where: { status: 'past_due' } }),
      this.prisma.subscription.count({ where: { plan: { tier: 0 } } }),
      this.prisma.payment.aggregate({
        where: { purpose: 'addon', status: 'succeeded', paidAt: { gte: since } },
        _sum: { amountMinor: true },
      }),
      this.prisma.payment.aggregate({
        where: { purpose: 'subscription', status: 'succeeded', paidAt: { gte: since } },
        _sum: { amountMinor: true },
      }),
      this.prisma.subscription.count({ where: { status: 'expired', updatedAt: { gte: since } } }),
    ]);

    let mrrMinor = 0;
    let currency = 'RUB';
    const byRole = new Map<Role, { paid: number; mrrMinor: number }>();
    const byPlan = new Map<string, { planName: string; paid: number; mrrMinor: number }>();

    for (const sub of live) {
      const price = sub.plan.prices.find((p) => p.cycle === sub.cycle && p.active);
      if (!price) continue;
      currency = price.currency;
      // Normalize every cycle to a per-month figure, and apply a live discount so
      // a grandfathered cohort does not inflate the number.
      const discounted =
        sub.discountPercent > 0 && (!sub.discountUntil || sub.discountUntil > now)
          ? Math.round(price.amountMinor * (1 - sub.discountPercent / 100))
          : price.amountMinor;
      const monthly = Math.round(discounted / CYCLE_MONTHS[sub.cycle]);
      mrrMinor += monthly;

      const role = byRole.get(sub.role) ?? { paid: 0, mrrMinor: 0 };
      byRole.set(sub.role, { paid: role.paid + 1, mrrMinor: role.mrrMinor + monthly });

      const plan = byPlan.get(sub.plan.code) ?? { planName: sub.plan.name, paid: 0, mrrMinor: 0 };
      byPlan.set(sub.plan.code, { planName: sub.plan.name, paid: plan.paid + 1, mrrMinor: plan.mrrMinor + monthly });
    }

    const paidAccounts = live.length;
    return {
      mrrMinor,
      arrMinor: mrrMinor * 12,
      currency,
      paidAccounts,
      freeAccounts: freeCount,
      pastDue,
      addonMinor30d: addonAgg._sum.amountMinor ?? 0,
      collectedMinor30d: collectedAgg._sum.amountMinor ?? 0,
      // Denominator is the base at the START of the window (survivors + churned),
      // otherwise a shrinking base flatters the rate.
      churnPercent30d: paidAccounts + churned > 0 ? Math.round((churned / (paidAccounts + churned)) * 1000) / 10 : 0,
      byRole: [...byRole.entries()].map(([role, v]) => ({ role, ...v })).sort((a, b) => b.mrrMinor - a.mrrMinor),
      byPlan: [...byPlan.entries()].map(([planCode, v]) => ({ planCode, ...v })).sort((a, b) => b.mrrMinor - a.mrrMinor),
    };
  }

  /** Subscription list for the admin table, with the account it belongs to. */
  async listSubscriptions(filter: { status?: string; role?: string; q?: string }) {
    const rows = await this.prisma.subscription.findMany({
      where: {
        ...(filter.status ? { status: filter.status as never } : {}),
        ...(filter.role ? { role: filter.role as Role } : {}),
        ...(filter.q
          ? {
              user: {
                OR: [
                  { email: { contains: filter.q, mode: 'insensitive' as const } },
                  { name: { contains: filter.q, mode: 'insensitive' as const } },
                ],
              },
            }
          : {}),
      },
      include: { plan: { include: { prices: true } }, user: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    return rows.map((s) => ({
      id: s.id,
      user: s.user,
      role: s.role,
      planCode: s.plan.code,
      planName: s.plan.name,
      tier: s.plan.tier,
      cycle: s.cycle,
      status: s.status,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      discountPercent: s.discountPercent,
      discountUntil: s.discountUntil,
      dunningAttempts: s.dunningAttempts,
      provider: s.provider,
      hasSavedCard: Boolean(s.providerToken),
      amountMinor: s.plan.prices.find((p) => p.cycle === s.cycle)?.amountMinor ?? 0,
      currency: s.plan.prices.find((p) => p.cycle === s.cycle)?.currency ?? 'RUB',
    }));
  }

  /** Recent gateway payments, for reconciliation. */
  async listPayments(filter: { status?: string; provider?: string }) {
    const rows = await this.prisma.payment.findMany({
      where: {
        ...(filter.status ? { status: filter.status as never } : {}),
        ...(filter.provider ? { provider: filter.provider as never } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((p) => ({
      id: p.id,
      invId: p.invId,
      user: p.user,
      provider: p.provider,
      purpose: p.purpose,
      status: p.status,
      amountMinor: p.amountMinor,
      currency: p.currency,
      providerRef: p.providerRef,
      failureReason: p.failureReason,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
    }));
  }
}
