import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Role, Subscription } from '@prisma/client';
import { applyDiscount, CYCLE_MONTHS } from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from '../common/crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { GatewaysService } from './gateways.service';
import { PlansService } from './plans.service';
import { EntitlementsService } from './entitlements.service';
import { addMonths, PaymentsService } from './payments.service';
import { webhookUrl } from './billing-urls';
import { BillingInvoicesService } from './billing-invoices.service';

/**
 * Subscription lifecycle: switching plans, cancelling, and the unattended
 * renewal + dunning loop.
 *
 * The dunning policy comes straight from the commercial plan: retry a failed
 * card three times over about a week, then **downgrade to free — never suspend**.
 * A suspended account stops producing the listings that make the marketplace
 * worth joining, so suspension costs more than the unpaid invoice.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger('SubscriptionsService');

  constructor(
    private prisma: PrismaService,
    private plans: PlansService,
    private payments: PaymentsService,
    private gateways: GatewaysService,
    private entitlements: EntitlementsService,
    private invoices: BillingInvoicesService,
    private notifications: NotificationsService,
  ) {}

  private async settings() {
    return this.prisma.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  }

  /** Every subscription the account holds, with its plan. */
  async listFor(userId: string) {
    return this.prisma.subscription.findMany({ where: { userId }, include: { plan: true }, orderBy: { role: 'asc' } });
  }

  /**
   * Move to the free tier for a role. Free plans need no payment, so this is the
   * one path that writes a subscription without money changing hands — used for
   * an explicit downgrade and by dunning when retries run out.
   */
  async moveToFree(userId: string, role: Role, reason: 'downgrade' | 'dunning' | 'expired'): Promise<void> {
    const free = await this.plans.freePlanFor(role);
    const existing = await this.prisma.subscription.findUnique({
      where: { userId_role: { userId, role } },
      include: { plan: true },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: 'expired',
          cancelAtPeriodEnd: false,
          // Drop the card binding: we have no mandate to charge a card for a
          // subscription that is no longer running.
          providerToken: null,
          ...(free ? { planId: free.id } : {}),
          currentPeriodEnd: new Date(),
        },
      });
    }
    this.entitlements.invalidate(userId);

    if (existing && reason !== 'downgrade') {
      await this.notifications.create({
        userId,
        system: 'billing',
        type: 'billing.downgraded',
        params: { plan: existing.plan.name },
        linkUrl: '/console/billing',
      });
    }
  }

  /**
   * Self-serve cancellation. Runs to the end of the paid period rather than
   * cutting service the customer already paid for — and retention won by making
   * cancellation difficult is not retention, it is a chargeback.
   */
  async cancel(userId: string, role: Role, immediately = false): Promise<Subscription> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId_role: { userId, role } }, include: { plan: true } });
    if (!sub) throw new NotFoundException('No subscription to cancel for this role.');
    if (sub.status === 'expired') throw new BadRequestException('That subscription has already ended.');

    if (immediately) {
      await this.moveToFree(userId, role, 'downgrade');
      return this.prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } });
    }

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true, status: 'canceled', canceledAt: new Date() },
    });
    this.entitlements.invalidate(userId);

    await this.notifications.create({
      userId,
      system: 'billing',
      type: 'billing.canceled',
      params: { plan: sub.plan.name, until: sub.currentPeriodEnd.toISOString().slice(0, 10) },
      linkUrl: '/console/billing',
    });
    return updated;
  }

  /** Undo a pending cancellation while the period is still running. */
  async resume(userId: string, role: Role): Promise<Subscription> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId_role: { userId, role } } });
    if (!sub) throw new NotFoundException('No subscription for this role.');
    if (sub.currentPeriodEnd.getTime() < Date.now()) throw new BadRequestException('That period has already ended — subscribe again.');
    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: false, status: 'active', canceledAt: null },
    });
    this.entitlements.invalidate(userId);
    return updated;
  }

  /**
   * Admin grant: put an account on a plan without a payment. Used for
   * grandfathering, sales deals and support fixes. Audited by the caller.
   */
  async grant(input: { userId: string; planId: string; cycle: 'monthly' | 'quarterly' | 'yearly'; months?: number }): Promise<Subscription> {
    const plan = await this.plans.byId(input.planId);
    const now = new Date();
    const periodEnd = addMonths(now, input.months ?? CYCLE_MONTHS[input.cycle]);

    const sub = await this.prisma.subscription.upsert({
      where: { userId_role: { userId: input.userId, role: plan.role } },
      create: {
        userId: input.userId,
        role: plan.role,
        planId: plan.id,
        cycle: input.cycle,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: plan.id,
        cycle: input.cycle,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        dunningAttempts: 0,
      },
    });
    this.entitlements.invalidate(input.userId);
    return sub;
  }

  /** Set or clear a grandfathering discount on one subscription. */
  async setDiscount(subscriptionId: string, discountPercent: number, discountUntil: Date | null): Promise<Subscription> {
    if (discountPercent < 0 || discountPercent > 100) throw new BadRequestException('Discount must be between 0 and 100 percent.');
    const sub = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { discountPercent, discountUntil },
    });
    this.entitlements.invalidate(sub.userId);
    return sub;
  }

  /* ── renewal + dunning ────────────────────────────────────────── */

  /**
   * Hourly sweep of subscriptions whose period has ended.
   *
   * Single-instance today, like the auction auto-closer; a multi-replica
   * deployment would need a leader lock so a renewal fires once across the fleet.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'billing-renewals' })
  async renewDue(): Promise<{ renewed: number; dunned: number; expired: number }> {
    const now = new Date();
    const due = await this.prisma.subscription.findMany({
      where: { status: { in: ['active', 'past_due', 'canceled'] }, currentPeriodEnd: { lte: now } },
      include: { plan: true },
      take: 200,
    });

    const result = { renewed: 0, dunned: 0, expired: 0 };
    for (const sub of due) {
      try {
        const outcome = await this.renewOne(sub.id);
        result[outcome]++;
      } catch (e) {
        // One bad subscription must not stop the sweep for everyone else.
        this.logger.error(`Renewal failed for subscription ${sub.id}: ${(e as Error).message}`);
      }
    }
    if (due.length) this.logger.log(`Billing sweep: ${result.renewed} renewed, ${result.dunned} retrying, ${result.expired} moved to free`);
    return result;
  }

  /** Renew (or fail) exactly one subscription. Exported for admin/manual runs. */
  async renewOne(subscriptionId: string): Promise<'renewed' | 'dunned' | 'expired'> {
    const sub = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    const settings = await this.settings();

    // A cancellation that has reached its period end simply lapses.
    if (sub.cancelAtPeriodEnd || sub.status === 'canceled') {
      await this.moveToFree(sub.userId, sub.role, 'expired');
      return 'expired';
    }

    // Free tiers never renew — there is nothing to charge.
    const price = await this.plans.priceFor(sub.planId, sub.cycle);
    if (!price || price.amountMinor <= 0) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { currentPeriodStart: new Date(), currentPeriodEnd: addMonths(new Date(), CYCLE_MONTHS[sub.cycle]) },
      });
      return 'renewed';
    }

    const amountMinor = this.liveDiscount(price.amountMinor, sub);

    // No stored card (or the gateway lost recurring support) → straight to dunning
    // with a pay-link, rather than pretending a charge was attempted.
    if (!sub.provider || !sub.providerToken) {
      return this.dun(sub.id, settings.dunningRetries, sub.plan.name, 'No saved payment method');
    }

    const config = await this.gateways.credentialsForCallback(sub.provider);
    if (!config || !config.adapter.supportsRecurring) {
      return this.dun(sub.id, settings.dunningRetries, sub.plan.name, 'Payment provider unavailable');
    }

    let binding: string;
    try {
      binding = decryptSecret(sub.providerToken);
    } catch {
      // An unreadable binding is a binding we must not use.
      return this.dun(sub.id, settings.dunningRetries, sub.plan.name, 'Saved payment method could not be read');
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId: sub.userId,
        provider: sub.provider,
        purpose: 'subscription',
        amountMinor,
        currency: price.currency,
        subscriptionId: sub.id,
        planId: sub.planId,
        cycle: sub.cycle,
        // Keyed by period end so a re-run of the sweep in the same hour cannot
        // open a second charge for the same period.
        idempotencyKey: `renew:${sub.id}:${sub.currentPeriodEnd.toISOString()}`,
      },
    });

    let charge;
    try {
      charge = await config.adapter.charge(
        {
          paymentId: payment.id,
          invId: payment.invId,
          amountMinor,
          currency: price.currency,
          description: `AgroTraders ${sub.plan.name} renewal`,
          notifyUrl: webhookUrl(sub.provider),
          bindingToken: binding,
          customerKey: sub.userId,
          idempotencyKey: payment.id,
          testMode: config.testMode,
        },
        config.creds,
      );
    } catch (e) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', failureReason: (e as Error).message.slice(0, 400) },
      });
      return this.dun(sub.id, settings.dunningRetries, sub.plan.name, (e as Error).message);
    }

    if (charge.status === 'failed' || charge.status === 'canceled') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: charge.status, providerRef: charge.providerRef, failureReason: charge.failureReason ?? null },
      });
      return this.dun(sub.id, settings.dunningRetries, sub.plan.name, charge.failureReason ?? 'Card declined');
    }

    if (charge.status === 'pending') {
      // Accepted but not settled (Robokassa's recurring path). Push the period
      // out by a grace day so the customer is not cut off while it clears; the
      // webhook does the real renewal.
      await this.prisma.payment.update({ where: { id: payment.id }, data: { providerRef: charge.providerRef } });
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { currentPeriodEnd: new Date(Date.now() + 864e5) },
      });
      return 'dunned';
    }

    // Settled inline (YooKassa / T-Bank). Advance the period from the OLD end,
    // not from now, so a late sweep does not shorten the customer's month.
    const periodStart = sub.currentPeriodEnd;
    const periodEnd = addMonths(periodStart, CYCLE_MONTHS[sub.cycle]);
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'succeeded', providerRef: charge.providerRef, paidAt: new Date() },
      }),
      this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          dunningAttempts: 0,
          lastPaymentAt: new Date(),
          ...(charge.bindingToken ? { providerToken: this.reencrypt(charge.bindingToken) } : {}),
        },
      }),
    ]);
    this.entitlements.invalidate(sub.userId);

    // Business customers need a closing document at every renewal, or collections
    // becomes a manual job at exactly the wrong moment.
    await this.invoices.issueForPayment(payment.id).catch((e) => this.logger.warn(`Renewal invoice failed: ${(e as Error).message}`));

    await this.notifications.create({
      userId: sub.userId,
      system: 'billing',
      type: 'billing.renewed',
      params: { plan: sub.plan.name, amount: `${(amountMinor / 100).toLocaleString('ru-RU')} ₽`, until: periodEnd.toISOString().slice(0, 10) },
      linkUrl: '/console/billing',
    });
    return 'renewed';
  }

  /** A provider that rotates the binding per charge hands us a new one to store. */
  private reencrypt(token: string): string {
    return encryptSecret(token);
  }

  private liveDiscount(amountMinor: number, sub: { discountPercent: number; discountUntil: Date | null }): number {
    if (sub.discountPercent <= 0) return amountMinor;
    if (sub.discountUntil && sub.discountUntil.getTime() < Date.now()) return amountMinor;
    return applyDiscount(amountMinor, sub.discountPercent);
  }

  /**
   * Record a failed renewal. Extends the period by the retry interval so the
   * customer keeps their entitlements while we retry; once the attempts are
   * exhausted, the account drops to free.
   */
  private async dun(subscriptionId: string, maxRetries: number, planName: string, reason: string): Promise<'dunned' | 'expired'> {
    const sub = await this.prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
    const settings = await this.settings();
    const attempt = sub.dunningAttempts + 1;

    if (attempt > maxRetries) {
      await this.moveToFree(sub.userId, sub.role, 'dunning');
      return 'expired';
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'past_due',
        dunningAttempts: attempt,
        // Push the next attempt out; entitlements survive in the meantime.
        currentPeriodEnd: new Date(Date.now() + settings.dunningIntervalHours * 3600e3),
      },
    });
    this.entitlements.invalidate(sub.userId);

    await this.notifications.create({
      userId: sub.userId,
      system: 'billing',
      type: attempt === 1 ? 'billing.payment_failed' : 'billing.past_due',
      params: { plan: planName, attempt, max: maxRetries },
      data: { reason: reason.slice(0, 200) },
      linkUrl: '/console/billing',
    });
    this.logger.warn(`Dunning ${sub.id} attempt ${attempt}/${maxRetries}: ${reason}`);
    return 'dunned';
  }
}
