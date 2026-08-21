import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AddonKind, BillingCycle, Payment, PaymentProviderKey, Prisma, Role } from '@prisma/client';
import { ADDON_SPECS, applyDiscount, CYCLE_MONTHS, type AddonKind as AddonKindT } from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret } from '../common/crypto';
import { WalletService } from '../wallet/wallet.service';
import { FxService } from '../fx/fx.module';
import { NotificationsService } from '../notifications/notifications.service';
import { GatewaysService } from './gateways.service';
import { PlansService } from './plans.service';
import { EntitlementsService } from './entitlements.service';
import { BillingInvoicesService } from './billing-invoices.service';
import { returnUrl, webhookUrl } from './billing-urls';
import type { VerifiedEvent } from './providers/provider';

export interface IntentResult {
  paymentId: string;
  /** Where to send the user. Null only when a provider settles inline. */
  confirmationUrl: string | null;
  amountMinor: number;
  currency: string;
  provider: PaymentProviderKey;
}

/** Add the right number of months without landing on the 31st of February. */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // setMonth rolls over when the target month is shorter (Jan 31 + 1 → Mar 3);
  // clamp back to the last day of the intended month instead.
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/**
 * Everything that turns money into entitlement.
 *
 * The single invariant: a `Payment` only becomes `succeeded` from a VERIFIED
 * provider callback. The browser returning to the success URL proves nothing —
 * it is a URL the user can type — so the return page only ever polls.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private prisma: PrismaService,
    private gateways: GatewaysService,
    private plans: PlansService,
    private entitlements: EntitlementsService,
    private wallet: WalletService,
    private fx: FxService,
    private notifications: NotificationsService,
    private invoices: BillingInvoicesService,
  ) {}

  /* ── creating intents ─────────────────────────────────────────── */

  /**
   * Open a payment with the provider and record our side of it. The `Payment`
   * row is written FIRST so a provider callback can always find something to
   * attach to, even if the create call times out after the acquirer accepted it.
   */
  private async open(input: {
    userId: string;
    provider: PaymentProviderKey;
    purpose: 'subscription' | 'addon' | 'wallet_topup';
    amountMinor: number;
    currency: string;
    description: string;
    bindCard?: boolean;
    subscriptionId?: string;
    planId?: string;
    cycle?: BillingCycle;
    addonKind?: AddonKind;
    addonTargetId?: string;
    idempotencyKey: string;
  }): Promise<IntentResult> {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new BadRequestException('Payment amount must be a positive whole number of minor units.');
    }

    // A repeated idempotency key returns the original intent rather than opening
    // a second charge — this is what makes a double-tapped Pay button safe.
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing && existing.status === 'pending' && existing.confirmationUrl) {
      return {
        paymentId: existing.id,
        confirmationUrl: existing.confirmationUrl,
        amountMinor: existing.amountMinor,
        currency: existing.currency,
        provider: existing.provider,
      };
    }
    if (existing) throw new BadRequestException('This payment has already been processed.');

    const { creds, testMode, adapter } = await this.gateways.credentialsFor(input.provider);

    const payment = await this.prisma.payment.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        purpose: input.purpose,
        amountMinor: input.amountMinor,
        currency: input.currency,
        subscriptionId: input.subscriptionId ?? null,
        planId: input.planId ?? null,
        cycle: input.cycle ?? null,
        addonKind: input.addonKind ?? null,
        addonTargetId: input.addonTargetId ?? null,
        idempotencyKey: input.idempotencyKey,
      },
    });

    try {
      const created = await adapter.create(
        {
          paymentId: payment.id,
          invId: payment.invId,
          amountMinor: input.amountMinor,
          currency: input.currency,
          description: input.description,
          returnUrl: returnUrl(payment.id),
          notifyUrl: webhookUrl(input.provider),
          bindCard: input.bindCard,
          customerKey: input.userId,
          idempotencyKey: payment.id,
          testMode,
        },
        creds,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerRef: created.providerRef, confirmationUrl: created.confirmationUrl },
      });
      return {
        paymentId: payment.id,
        confirmationUrl: created.confirmationUrl,
        amountMinor: input.amountMinor,
        currency: input.currency,
        provider: input.provider,
      };
    } catch (e) {
      // Mark it failed rather than leaving a pending row nothing will ever settle.
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', failureReason: (e as Error).message.slice(0, 400) },
      });
      throw e;
    }
  }

  /** Start a subscription purchase (or an upgrade). */
  async subscriptionIntent(input: {
    userId: string;
    role: Role;
    planId: string;
    cycle: BillingCycle;
    provider: PaymentProviderKey;
    idempotencyKey?: string;
  }): Promise<IntentResult> {
    const plan = await this.plans.byId(input.planId);
    if (!plan.active) throw new BadRequestException('That plan is no longer available.');
    if (plan.role !== input.role) throw new BadRequestException('That plan does not apply to this role.');

    const price = await this.plans.priceFor(plan.id, input.cycle);
    if (!price || !price.active) throw new BadRequestException('That billing cycle is not offered for this plan.');
    if (price.amountMinor <= 0) throw new BadRequestException('That plan is free — no payment is needed.');

    // Any standing discount (grandfathering) applies to the checkout price too,
    // not just to renewals, or the early-adopter offer would only start biting
    // a month later.
    const sub = await this.prisma.subscription.findUnique({ where: { userId_role: { userId: input.userId, role: input.role } } });
    const amountMinor = this.discounted(price.amountMinor, sub);

    return this.open({
      userId: input.userId,
      provider: input.provider,
      purpose: 'subscription',
      amountMinor,
      currency: price.currency,
      description: `AgroTraders ${plan.name} (${input.cycle})`,
      // Bind the card so renewals can be charged without the customer present.
      bindCard: true,
      planId: plan.id,
      cycle: input.cycle,
      subscriptionId: sub?.id,
      idempotencyKey: input.idempotencyKey ?? `sub:${input.userId}:${plan.id}:${input.cycle}:${Date.now()}`,
    });
  }

  /** Apply a live grandfathering discount, if any. */
  private discounted(amountMinor: number, sub: { discountPercent: number; discountUntil: Date | null } | null): number {
    if (!sub || sub.discountPercent <= 0) return amountMinor;
    if (sub.discountUntil && sub.discountUntil.getTime() < Date.now()) return amountMinor;
    return applyDiscount(amountMinor, sub.discountPercent);
  }

  /** Start a pay-as-you-go add-on purchase. */
  async addonIntent(input: {
    userId: string;
    kind: AddonKindT;
    targetId?: string;
    provider: PaymentProviderKey;
    idempotencyKey?: string;
  }): Promise<IntentResult> {
    const spec = ADDON_SPECS[input.kind];
    if (!spec) throw new BadRequestException('Unknown add-on.');

    if (spec.target === 'product') {
      if (!input.targetId) throw new BadRequestException('Choose which listing to promote.');
      const product = await this.prisma.product.findFirst({
        where: { id: input.targetId, sellerId: input.userId },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Listing not found.');
    }
    if (spec.target === 'category') {
      if (!input.targetId) throw new BadRequestException('Choose which category to advertise in.');
      const category = await this.prisma.category.findUnique({ where: { id: input.targetId }, select: { id: true } });
      if (!category) throw new NotFoundException('Category not found.');
    }
    if (input.kind === 'kyc_badge') {
      const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { kycStatus: true } });
      if (user?.kycStatus === 'verified') throw new BadRequestException('This account is already verified.');
    }

    return this.open({
      userId: input.userId,
      provider: input.provider,
      purpose: 'addon',
      amountMinor: spec.amountMinor,
      currency: 'RUB',
      description: `AgroTraders add-on: ${input.kind.replace(/_/g, ' ')}`,
      addonKind: input.kind as AddonKind,
      addonTargetId: input.targetId,
      idempotencyKey: input.idempotencyKey ?? `addon:${input.userId}:${input.kind}:${input.targetId ?? 'none'}:${Date.now()}`,
    });
  }

  /**
   * Real, gateway-backed wallet top-up. This replaces the mock credit that
   * `assertLegacyFinancialWritesEnabled` blocks in production — until now no
   * money could enter the ledger there at all.
   */
  async topupIntent(input: {
    userId: string;
    amountMinor: number;
    currency: string;
    provider: PaymentProviderKey;
    idempotencyKey?: string;
  }): Promise<IntentResult> {
    // A ceiling, not a business rule: it bounds the damage from a fat-fingered
    // or scripted amount before it reaches an acquirer.
    if (input.amountMinor > 100_000_00 * 100) throw new BadRequestException('That top-up amount is too large.');
    return this.open({
      userId: input.userId,
      provider: input.provider,
      purpose: 'wallet_topup',
      amountMinor: input.amountMinor,
      currency: input.currency,
      description: 'AgroTraders wallet top-up',
      idempotencyKey: input.idempotencyKey ?? `topup:${input.userId}:${input.amountMinor}:${Date.now()}`,
    });
  }

  /* ── callbacks ────────────────────────────────────────────────── */

  /**
   * Handle a provider callback. Returns the exact body the provider expects, or
   * null when the payload failed verification — the controller answers 400 then,
   * without saying which check failed.
   */
  async handleWebhook(provider: PaymentProviderKey, body: Record<string, unknown>): Promise<string | null> {
    const config = await this.gateways.credentialsForCallback(provider);
    if (!config) {
      this.logger.warn(`Callback for ${provider} but it has no usable credentials`);
      return null;
    }

    const event = await config.adapter.verify(body, config.creds, config.testMode);
    if (!event) {
      this.logger.warn(`Rejected an unverified ${provider} callback`);
      return null;
    }

    const payment = await this.findPayment(provider, event);
    if (!payment) {
      this.logger.warn(`Verified ${provider} callback for an unknown payment (ref ${event.providerRef})`);
      // Verified but unknown: acknowledge so the provider stops retrying, and
      // leave the warning for reconciliation. Refusing would loop forever.
      return config.adapter.ack(event);
    }

    await this.apply(payment, event);
    return config.adapter.ack(event);
  }

  /** Locate our row from whatever identifier the provider echoed back. */
  private async findPayment(provider: PaymentProviderKey, event: VerifiedEvent): Promise<Payment | null> {
    if (event.paymentId) {
      const byId = await this.prisma.payment.findUnique({ where: { id: event.paymentId } });
      if (byId) return byId;
    }
    if (event.invId !== undefined) {
      const byInv = await this.prisma.payment.findUnique({ where: { invId: event.invId } });
      if (byInv) return byInv;
    }
    return this.prisma.payment.findFirst({ where: { provider, providerRef: event.providerRef } });
  }

  /**
   * Move a payment to its final state and grant whatever it bought.
   *
   * Guarded by a conditional `pending → status` update: two callbacks arriving
   * at once (providers retry aggressively) cannot both grant the entitlement.
   */
  async apply(payment: Payment, event: VerifiedEvent): Promise<void> {
    if (payment.status !== 'pending') return; // already settled

    // Never trust a callback that says a different amount was paid than we asked
    // for. Under-payment must not activate a plan.
    if (event.status === 'succeeded' && event.amountMinor !== undefined && event.amountMinor < payment.amountMinor) {
      this.logger.error(
        `Payment ${payment.id} reported ${event.amountMinor} but ${payment.amountMinor} was due — refusing to activate`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', failureReason: 'Amount paid was less than the amount due', raw: event as unknown as Prisma.InputJsonValue },
      });
      return;
    }

    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: {
        status: event.status,
        providerRef: event.providerRef,
        failureReason: event.failureReason ?? null,
        paidAt: event.status === 'succeeded' ? new Date() : null,
        raw: event as unknown as Prisma.InputJsonValue,
      },
    });
    if (claimed.count === 0) return; // a concurrent callback won

    if (event.status !== 'succeeded') return;

    const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    switch (fresh.purpose) {
      case 'subscription':
        await this.activateSubscription(fresh, event.bindingToken);
        break;
      case 'addon':
        await this.activateAddon(fresh);
        break;
      case 'wallet_topup':
        await this.creditWallet(fresh);
        break;
    }
    this.entitlements.invalidate(fresh.userId);
  }

  /* ── granting what was bought ─────────────────────────────────── */

  /**
   * Start or extend a subscription. Extends from the later of "now" and the
   * current period end, so paying early adds time instead of throwing it away.
   */
  private async activateSubscription(payment: Payment, bindingToken?: string): Promise<void> {
    if (!payment.planId || !payment.cycle) {
      this.logger.error(`Subscription payment ${payment.id} has no plan or cycle`);
      return;
    }
    const plan = await this.prisma.plan.findUnique({ where: { id: payment.planId } });
    if (!plan) return;

    const existing = await this.prisma.subscription.findUnique({
      where: { userId_role: { userId: payment.userId, role: plan.role } },
    });
    const now = new Date();
    const anchor = existing && existing.currentPeriodEnd > now && existing.planId === plan.id ? existing.currentPeriodEnd : now;
    const periodEnd = addMonths(anchor, CYCLE_MONTHS[payment.cycle]);

    const subscription = await this.prisma.subscription.upsert({
      where: { userId_role: { userId: payment.userId, role: plan.role } },
      create: {
        userId: payment.userId,
        role: plan.role,
        planId: plan.id,
        cycle: payment.cycle,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        provider: payment.provider,
        providerToken: bindingToken ? this.encryptBinding(bindingToken) : null,
        lastPaymentAt: now,
      },
      update: {
        planId: plan.id,
        cycle: payment.cycle,
        status: 'active',
        currentPeriodStart: existing?.currentPeriodEnd && existing.currentPeriodEnd > now ? existing.currentPeriodStart : now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        dunningAttempts: 0,
        provider: payment.provider,
        // Keep the existing binding when this charge did not produce a new one.
        ...(bindingToken ? { providerToken: this.encryptBinding(bindingToken) } : {}),
        lastPaymentAt: now,
      },
    });

    await this.prisma.payment.update({ where: { id: payment.id }, data: { subscriptionId: subscription.id } });

    // Business customers need the closing document on the FIRST payment too, not
    // only at renewal. Best-effort: a document that cannot be numbered must never
    // cost the customer the subscription they just paid for.
    await this.invoices
      .issueForPayment(payment.id)
      .catch((e) => this.logger.warn(`Subscription invoice failed for ${payment.id}: ${(e as Error).message}`));

    await this.notifications.create({
      userId: payment.userId,
      system: 'billing',
      type: 'billing.activated',
      params: { plan: plan.name, until: periodEnd.toISOString().slice(0, 10) },
      data: { subscriptionId: subscription.id, planCode: plan.code },
      linkUrl: '/console/billing',
    });
  }

  /** Card bindings are credentials; they never sit in the database in the clear. */
  private encryptBinding(token: string): string {
    return encryptSecret(token);
  }

  /** Grant an add-on and apply its side effect (promotion slot, KYC badge…). */
  private async activateAddon(payment: Payment): Promise<void> {
    if (!payment.addonKind) return;
    const spec = ADDON_SPECS[payment.addonKind as AddonKindT];
    const now = new Date();
    const expiresAt = spec.durationDays === null ? null : new Date(now.getTime() + spec.durationDays * 864e5);

    await this.prisma.addonPurchase.create({
      data: {
        userId: payment.userId,
        kind: payment.addonKind,
        productId: spec.target === 'product' ? payment.addonTargetId : null,
        categoryId: spec.target === 'category' ? payment.addonTargetId : null,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        paymentId: payment.id,
        startsAt: now,
        expiresAt,
      },
    });

    // Promotion writes the slot straight onto the product, so listing sort reads
    // one column and a lapsed promotion needs no sweeper job.
    if ((payment.addonKind === 'promote_category' || payment.addonKind === 'promote_home') && payment.addonTargetId) {
      await this.prisma.product.update({
        where: { id: payment.addonTargetId },
        data: {
          promotedUntil: expiresAt,
          promotedSlot: payment.addonKind === 'promote_home' ? 'home' : 'category',
        },
      });
    }

    // The paid badge buys a fast-tracked review, not an automatic pass: marking
    // an unchecked account "verified" would make the badge meaningless.
    if (payment.addonKind === 'kyc_badge') {
      await this.prisma.user.update({ where: { id: payment.userId }, data: { kycStatus: 'pending' } });
    }

    await this.notifications.create({
      userId: payment.userId,
      system: 'billing',
      type: 'billing.addon_active',
      params: {
        addon: payment.addonKind.replace(/_/g, ' '),
        detail: expiresAt ? ` until ${expiresAt.toISOString().slice(0, 10)}` : '',
      },
      data: { addonKind: payment.addonKind },
      linkUrl: '/console/billing',
    });
  }

  /**
   * Credit the wallet. The ledger is denominated in USD cents while acquirers
   * charge rubles, so the paid amount is converted at today's rate — the
   * conversion happens once, here, and the ledger stays single-currency.
   */
  private async creditWallet(payment: Payment): Promise<void> {
    const usdCents = await this.fx.toUsdCents(payment.amountMinor / 100, payment.currency);
    await this.wallet.credit(
      payment.userId,
      usdCents,
      'topup',
      `Top up via ${payment.provider}`,
      undefined,
      // Keyed on our payment id: a replayed callback cannot double-credit.
      `topup:payment:${payment.id}`,
    );
  }

  /* ── reads ────────────────────────────────────────────────────── */

  async byId(userId: string, paymentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, userId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async history(userId: string, take = 25): Promise<Payment[]> {
    return this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take });
  }
}
