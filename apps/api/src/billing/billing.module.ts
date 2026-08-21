import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Global,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { PaymentProviderKey, Role } from '@prisma/client';
import { ADDON_SPECS, PAYMENT_PROVIDERS } from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit.service';
import { seedBilling } from './plan-defaults';
import { GatewaysService } from './gateways.service';
import { PlansService } from './plans.service';
import { EntitlementsService } from './entitlements.service';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from './subscriptions.service';
import { BillingInvoicesService } from './billing-invoices.service';
import { RevenueService } from './revenue.service';
import { FxModule } from '../fx/fx.module';
import { apiBaseUrl, webBaseUrl } from './billing-urls';
import {
  BuyAddonDto,
  CancelSubscriptionDto,
  CreatePlanDto,
  GrantSubscriptionDto,
  SetDiscountDto,
  SetPlanPriceDto,
  SubscribeDto,
  TopupIntentDto,
  UpdateBillingSettingsDto,
  UpdateGatewayDto,
  UpdatePlanDto,
} from './dto';

function assertProvider(value: string): PaymentProviderKey {
  if (!(PAYMENT_PROVIDERS as readonly string[]).includes(value)) throw new BadRequestException('Unknown payment provider');
  return value as PaymentProviderKey;
}

/* ── public ─────────────────────────────────────────────────────── */

@ApiTags('billing')
@Controller('billing')
export class BillingPublicController {
  constructor(
    private plans: PlansService,
    private gateways: GatewaysService,
    private payments: PaymentsService,
  ) {}

  /** The pricing page. Public and unauthenticated by design — a price behind a login does not get sold. */
  @Get('plans')
  @ApiOperation({ summary: 'Published plan catalogue with prices, quotas and features' })
  plansList(@Query('role') role?: string, @Query('locale') locale?: string) {
    return this.plans.list({ role: role as Role | undefined, locale });
  }

  /** The add-on price list (pay-as-you-go, available to free accounts too). */
  @Get('addons')
  addons() {
    return Object.values(ADDON_SPECS);
  }

  /** Which acquirers the checkout may offer. Never includes credentials. */
  @Get('gateways')
  gatewayList() {
    return this.gateways.publicList();
  }

  /**
   * Provider callback. Public and throttle-exempt: acquirers retry aggressively
   * and a rate-limited webhook is a lost payment. Authentication is the
   * provider's own signature, checked inside `handleWebhook`.
   */
  @SkipThrottle()
  @Post('webhook/:provider')
  async webhook(@Param('provider') provider: string, @Req() req: Request, @Res() res: Response) {
    const key = assertProvider(provider);
    // Form-encoded (Robokassa) and JSON (YooKassa, T-Bank) both land in req.body;
    // query params cover Robokassa's GET-style ResultURL configuration.
    const body = { ...(req.query as Record<string, unknown>), ...((req.body ?? {}) as Record<string, unknown>) };
    const ack = await this.payments.handleWebhook(key, body);
    if (ack === null) {
      res.status(400).send('rejected');
      return;
    }
    res.status(200).send(ack);
  }

  /**
   * Where the acquirer sends the browser back. Deliberately does nothing but
   * redirect: the payment state comes from the verified webhook, never from the
   * user landing on a URL they could have typed themselves.
   */
  @Get('return')
  back(@Query('payment') payment: string | undefined, @Res() res: Response) {
    const target = `${webBaseUrl()}/billing/return${payment ? `?payment=${encodeURIComponent(payment)}` : ''}`;
    res.redirect(302, target);
  }
}

/* ── the signed-in customer ─────────────────────────────────────── */

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/billing')
export class MeBillingController {
  constructor(
    private prisma: PrismaService,
    private plans: PlansService,
    private entitlements: EntitlementsService,
    private payments: PaymentsService,
    private subscriptions: SubscriptionsService,
  ) {}

  /** Everything the console's Billing section renders: plan, meters, history. */
  @Get()
  async overview(@CurrentUser() user: AuthUser, @Query('locale') locale?: string) {
    const ent = await this.entitlements.resolve(user.id);
    const roles = Object.keys(ent.roles) as Role[];

    const [usage, addons, history, subs] = await Promise.all([
      Promise.all(roles.map(async (role) => ({ role, rows: await this.entitlements.usage(user.id, role) }))),
      this.prisma.addonPurchase.findMany({
        where: { userId: user.id, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: { createdAt: 'desc' },
      }),
      this.payments.history(user.id),
      this.subscriptions.listFor(user.id),
    ]);

    // Plan names are admin-authored English; localize them like any other
    // admin-authored copy rather than shipping them untranslated.
    const catalogue = await this.plans.list({ locale });

    return {
      entitlements: ent.roles,
      usage: Object.fromEntries(usage.map((u) => [u.role, u.rows])),
      subscriptions: subs.map((s) => ({
        id: s.id,
        role: s.role,
        planId: s.planId,
        planCode: s.plan.code,
        planName: catalogue.find((p) => p.id === s.planId)?.name ?? s.plan.name,
        cycle: s.cycle,
        status: s.status,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        discountPercent: s.discountPercent,
        discountUntil: s.discountUntil,
        provider: s.provider,
        hasSavedCard: Boolean(s.providerToken),
      })),
      addons,
      payments: history.map((p) => ({
        id: p.id,
        provider: p.provider,
        purpose: p.purpose,
        status: p.status,
        amountMinor: p.amountMinor,
        currency: p.currency,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        confirmationUrl: p.status === 'pending' ? p.confirmationUrl : null,
      })),
    };
  }

  /** Start a subscription checkout. Returns where to send the browser. */
  @Post('subscribe')
  async subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    const plan = await this.plans.byId(dto.planId);
    // The role guard: you may only buy a plan for a role you actually hold.
    if (!user.roles.includes(plan.role) && user.role !== plan.role) {
      throw new BadRequestException('Your account does not hold that role. Request it first, then subscribe.');
    }
    return this.payments.subscriptionIntent({
      userId: user.id,
      role: plan.role,
      planId: dto.planId,
      cycle: dto.cycle,
      provider: dto.provider,
      idempotencyKey: dto.idempotencyKey ? `sub:${user.id}:${dto.idempotencyKey}` : undefined,
    });
  }

  @Post('cancel')
  cancel(@CurrentUser() user: AuthUser, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptions.cancel(user.id, dto.role as Role, dto.immediately ?? false);
  }

  @Post('resume')
  resume(@CurrentUser() user: AuthUser, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptions.resume(user.id, dto.role as Role);
  }

  @Post('addons')
  addon(@CurrentUser() user: AuthUser, @Body() dto: BuyAddonDto) {
    return this.payments.addonIntent({
      userId: user.id,
      kind: dto.kind,
      targetId: dto.targetId,
      provider: dto.provider,
      idempotencyKey: dto.idempotencyKey ? `addon:${user.id}:${dto.idempotencyKey}` : undefined,
    });
  }

  /** Poll target for the return page: has the webhook landed yet? */
  @Get('payments/:id')
  async paymentStatus(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const p = await this.payments.byId(user.id, id);
    return { id: p.id, status: p.status, purpose: p.purpose, amountMinor: p.amountMinor, currency: p.currency, paidAt: p.paidAt, failureReason: p.failureReason };
  }
}

/* ── wallet top-up (real money, replacing the mock) ─────────────── */

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/wallet')
export class WalletTopupController {
  constructor(private payments: PaymentsService) {}

  /**
   * Open a gateway-backed top-up. The existing `POST /me/wallet/topup` is a mock
   * that `assertLegacyFinancialWritesEnabled` blocks in production; this is the
   * real path, and it is what makes escrow fundable there at all.
   */
  @Post('topup-intent')
  topup(@CurrentUser() user: AuthUser, @Body() dto: TopupIntentDto) {
    return this.payments.topupIntent({
      userId: user.id,
      amountMinor: dto.amountMinor,
      currency: dto.currency ?? 'RUB',
      provider: dto.provider,
      idempotencyKey: dto.idempotencyKey ? `topup:${user.id}:${dto.idempotencyKey}` : undefined,
    });
  }
}

/* ── admin ──────────────────────────────────────────────────────── */

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('billing_manage')
@Controller('admin/billing')
export class AdminBillingController {
  constructor(
    private prisma: PrismaService,
    private plans: PlansService,
    private gateways: GatewaysService,
    private subscriptions: SubscriptionsService,
    private revenue: RevenueService,
    private audit: AuditService,
  ) {}

  /* plans */

  @Get('plans')
  listPlans() {
    return this.plans.list({ includeInactive: true });
  }

  @Post('plans')
  async createPlan(@CurrentUser() admin: AuthUser, @Body() dto: CreatePlanDto) {
    const plan = await this.plans.create({ ...dto, role: dto.role as Role });
    await this.audit.log({ actorId: admin.id, action: 'plan.create', entityType: 'Plan', entityId: plan.id, meta: { code: plan.code } });
    return plan;
  }

  @Patch('plans/:id')
  async updatePlan(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    const plan = await this.plans.update(id, dto);
    await this.audit.log({ actorId: admin.id, action: 'plan.update', entityType: 'Plan', entityId: id, meta: { ...dto } });
    return plan;
  }

  @Post('plans/:id/price')
  async setPrice(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: SetPlanPriceDto) {
    const plan = await this.plans.setPrice(id, dto.cycle, dto.amountMinor ?? null, dto.currency ?? 'RUB');
    await this.audit.log({
      actorId: admin.id,
      action: 'plan.price',
      entityType: 'Plan',
      entityId: id,
      meta: { cycle: dto.cycle, amountMinor: dto.amountMinor ?? null },
    });
    return plan;
  }

  @Post('plans/:id/deactivate')
  async deactivatePlan(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    const plan = await this.plans.deactivate(id);
    await this.audit.log({ actorId: admin.id, action: 'plan.deactivate', entityType: 'Plan', entityId: id });
    return plan;
  }

  /**
   * Reset the catalogue to the published commercial plan. Destructive to price
   * edits by design — it is the "undo my experiment" button — so it is audited.
   */
  @Post('plans/restore-defaults')
  async restoreDefaults(@CurrentUser() admin: AuthUser) {
    const result = await seedBilling(this.prisma, true);
    await this.audit.log({ actorId: admin.id, action: 'plan.restore_defaults', entityType: 'Plan', entityId: 'all', meta: { ...result } });
    return result;
  }

  /* gateways */

  @Get('gateways')
  listGateways() {
    return this.gateways.adminList(apiBaseUrl());
  }

  @Patch('gateways/:provider')
  async updateGateway(@CurrentUser() admin: AuthUser, @Param('provider') provider: string, @Body() dto: UpdateGatewayDto) {
    const key = assertProvider(provider);
    await this.gateways.update(key, dto);
    // Log WHICH credential fields changed, never their values.
    await this.audit.log({
      actorId: admin.id,
      action: 'gateway.update',
      entityType: 'PaymentGatewayConfig',
      entityId: key,
      meta: { enabled: dto.enabled, testMode: dto.testMode, credentialFields: Object.keys(dto.credentials ?? {}) },
    });
    return this.gateways.adminList(apiBaseUrl());
  }

  @Post('gateways/:provider/test')
  test(@Param('provider') provider: string) {
    return this.gateways.test(assertProvider(provider));
  }

  /* settings */

  @Get('settings')
  settings() {
    return this.prisma.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  }

  @Patch('settings')
  async updateSettings(@CurrentUser() admin: AuthUser, @Body() dto: UpdateBillingSettingsDto) {
    const row = await this.prisma.billingSettings.upsert({ where: { id: 1 }, update: { ...dto }, create: { id: 1, ...dto } });
    await this.audit.log({ actorId: admin.id, action: 'billing.settings', entityType: 'BillingSettings', entityId: '1', meta: { ...dto } });
    return row;
  }

  /* subscriptions */

  @Get('subscriptions')
  listSubscriptions(@Query('status') status?: string, @Query('role') role?: string, @Query('q') q?: string) {
    return this.revenue.listSubscriptions({ status, role, q });
  }

  @Post('subscriptions/grant')
  async grant(@CurrentUser() admin: AuthUser, @Body() dto: GrantSubscriptionDto) {
    const sub = await this.subscriptions.grant(dto);
    await this.audit.log({
      actorId: admin.id,
      action: 'subscription.grant',
      entityType: 'Subscription',
      entityId: sub.id,
      meta: { userId: dto.userId, planId: dto.planId, cycle: dto.cycle },
    });
    return sub;
  }

  @Post('subscriptions/:id/discount')
  async discount(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: SetDiscountDto) {
    const sub = await this.subscriptions.setDiscount(id, dto.discountPercent, dto.discountUntil ? new Date(dto.discountUntil) : null);
    await this.audit.log({
      actorId: admin.id,
      action: 'subscription.discount',
      entityType: 'Subscription',
      entityId: id,
      meta: { discountPercent: dto.discountPercent, discountUntil: dto.discountUntil ?? null },
    });
    return sub;
  }

  @Post('subscriptions/:id/cancel')
  async cancelSub(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    const sub = await this.prisma.subscription.findUniqueOrThrow({ where: { id } });
    const result = await this.subscriptions.cancel(sub.userId, sub.role, false);
    await this.audit.log({ actorId: admin.id, action: 'subscription.cancel', entityType: 'Subscription', entityId: id });
    return result;
  }

  /** Run the renewal for one subscription now, instead of waiting for the cron. */
  @Post('subscriptions/:id/renew')
  async renewNow(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    const outcome = await this.subscriptions.renewOne(id);
    await this.audit.log({ actorId: admin.id, action: 'subscription.renew', entityType: 'Subscription', entityId: id, meta: { outcome } });
    return { outcome };
  }

  /* revenue */

  @Get('revenue')
  revenueSummary() {
    return this.revenue.summary();
  }

  @Get('payments')
  paymentsList(@Query('status') status?: string, @Query('provider') provider?: string) {
    return this.revenue.listPayments({ status, provider });
  }
}

/**
 * Global so `EntitlementsService` can be injected by the domain modules that
 * enforce quotas (products, buyer-bids, transport, loaders, services, workforce)
 * without each of them importing BillingModule and risking a cycle.
 */
@Global()
@Module({
  // FxModule is not global: a ruble top-up has to be converted into the USD-cents
  // wallet ledger, and that is the only conversion in the billing path.
  imports: [FxModule],
  controllers: [BillingPublicController, MeBillingController, WalletTopupController, AdminBillingController],
  providers: [
    PlansService,
    GatewaysService,
    EntitlementsService,
    PaymentsService,
    SubscriptionsService,
    BillingInvoicesService,
    RevenueService,
  ],
  exports: [EntitlementsService, PlansService, GatewaysService, PaymentsService, SubscriptionsService],
})
export class BillingModule {}
