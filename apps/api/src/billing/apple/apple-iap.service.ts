import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  Environment,
  NotificationTypeV2,
  SignedDataVerifier,
  Subtype,
  Type,
  VerificationException,
  VerificationStatus,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';
import { Prisma, type Payment, type Subscription } from '@prisma/client';
import { parseAppleProductId } from '@agrotraders/types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EntitlementsService } from '../entitlements.service';
import { SubscriptionsService } from '../subscriptions.service';
import { appleAccountToken } from './apple-account-token';
import { APPLE_ROOT_CERTS } from './apple-root-certs';

const DAY_MS = 864e5;

/** Notifications that take something away — never on the strength of an older period. */
const LOWERING = new Set<string>([
  NotificationTypeV2.EXPIRED,
  NotificationTypeV2.GRACE_PERIOD_EXPIRED,
  NotificationTypeV2.REVOKE,
  NotificationTypeV2.DID_FAIL_TO_RENEW,
  NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS,
]);

/** Apple's price is in thousandths of the currency's MAJOR unit; ours is minor units. */
function toMinor(price: number | undefined, currency: string): number {
  if (price === undefined) return 0;
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return Math.round((price / 1000) * 10 ** digits);
}

/**
 * iOS plan subscriptions bought with Apple In-App Purchase (StoreKit 2).
 *
 * Apple is the merchant of record here, so none of the card machinery applies:
 * no binding, no renewal charge, no dunning and no platform invoice. The App
 * Store renews on its own and tells us through two channels — the app posting
 * each signed transaction it sees, and App Store Server Notifications — and both
 * funnel into `applyTransaction`, which is idempotent per Apple transaction.
 *
 * Every payload is a JWS verified against Apple's root certificates before a
 * single field of it is trusted.
 */
@Injectable()
export class AppleIapService {
  private readonly logger = new Logger('AppleIapService');
  private readonly verifiers = new Map<Environment, SignedDataVerifier>();

  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService,
    private entitlements: EntitlementsService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Only PRODUCTION and SANDBOX, ever: XCODE and LOCAL_TESTING skip the
   * signature check entirely, which would let anyone mint a purchase.
   */
  private verifier(environment: Environment.PRODUCTION | Environment.SANDBOX): SignedDataVerifier {
    let v = this.verifiers.get(environment);
    if (!v) {
      v = new SignedDataVerifier(
        APPLE_ROOT_CERTS,
        true,
        environment,
        process.env.APPLE_IAP_BUNDLE_ID || 'com.agrotraders.org',
        Number(process.env.APPLE_IAP_APP_APPLE_ID || 6810728039),
      );
      this.verifiers.set(environment, v);
    }
    return v;
  }

  /**
   * Try production first, then sandbox. App Review and TestFlight buy in the
   * sandbox against the production API, and the library refuses a payload whose
   * environment differs from the verifier's — only after the signature checked out.
   * Sandbox notifications carry no appAppleId, so production fails those on the
   * app identifier instead; the sandbox verifier re-checks everything either way.
   */
  private async verify<T>(decode: (v: SignedDataVerifier) => Promise<T>): Promise<{ value: T; verifier: SignedDataVerifier }> {
    const prod = this.verifier(Environment.PRODUCTION);
    try {
      return { value: await decode(prod), verifier: prod };
    } catch (e) {
      const retry = e instanceof VerificationException &&
        (e.status === VerificationStatus.INVALID_ENVIRONMENT || e.status === VerificationStatus.INVALID_APP_IDENTIFIER);
      if (!retry) throw e;
      const sandbox = this.verifier(Environment.SANDBOX);
      return { value: await decode(sandbox), verifier: sandbox };
    }
  }

  /** A transaction the app saw (purchase, renewal, restore), posted by the signed-in user. */
  async submitTransaction(userId: string, signedTransaction: string): Promise<{ ok: true }> {
    let tx: JWSTransactionDecodedPayload;
    try {
      tx = (await this.verify((v) => v.verifyAndDecodeTransaction(signedTransaction))).value;
    } catch (e) {
      this.logger.warn(`Rejected an App Store transaction from ${userId}: ${e instanceof VerificationException ? VerificationStatus[e.status] : (e as Error).message}`);
      throw new BadRequestException('Could not verify the App Store purchase.');
    }
    // The token is bound at purchase time, so a restore on a device signed into
    // another account cannot hand that account someone else's plan.
    if (tx.appAccountToken?.toLowerCase() !== appleAccountToken(userId)) {
      throw new BadRequestException('This App Store purchase belongs to a different AgroTraders account.');
    }
    if (tx.type !== Type.AUTO_RENEWABLE_SUBSCRIPTION) {
      throw new BadRequestException('Only plan subscriptions are sold through the App Store.');
    }
    await this.applyTransaction(userId, tx);
    return { ok: true };
  }

  /**
   * Record one Apple transaction and bring the account's subscription in line
   * with it. Safe to call any number of times with the same transaction.
   *
   * Never refuses on an inactive plan or a role the account no longer holds:
   * Apple has already taken the money, so the only wrong answer is not granting.
   */
  async applyTransaction(userId: string, tx: JWSTransactionDecodedPayload): Promise<void> {
    const product = tx.productId ? parseAppleProductId(tx.productId) : null;
    const plan = product ? await this.prisma.plan.findUnique({ where: { code: product.planCode } }) : null;
    if (!product || !plan) throw new BadRequestException('Unknown App Store product.');
    if (!tx.transactionId || !tx.originalTransactionId || !tx.purchaseDate || !tx.expiresDate) {
      throw new BadRequestException('Incomplete App Store transaction.');
    }

    const existing = await this.prisma.subscription.findUnique({ where: { userId_role: { userId, role: plan.role } } });
    const isThis = existing?.appleOriginalTransactionId === tx.originalTransactionId;
    const purchasedAt = new Date(tx.purchaseDate);
    const expiresAt = new Date(tx.expiresDate);
    const now = new Date();

    // One Payment per Apple transaction, keyed so a replay (the app re-posting,
    // a notification for the same renewal) records nothing new.
    const idempotencyKey = `apple:${tx.transactionId}`;
    const currency = tx.currency ?? 'RUB';
    let payment: Payment | null = null;
    try {
      payment = await this.prisma.payment.create({
        data: {
          userId,
          provider: 'apple',
          purpose: 'subscription',
          status: 'succeeded',
          amountMinor: toMinor(tx.price, currency),
          currency,
          providerRef: tx.transactionId,
          planId: plan.id,
          cycle: product.cycle,
          paidAt: purchasedAt,
          idempotencyKey,
          raw: {
            transactionId: tx.transactionId,
            originalTransactionId: tx.originalTransactionId,
            productId: tx.productId,
            environment: tx.environment,
            purchaseDate: tx.purchaseDate,
            expiresDate: tx.expiresDate,
            revocationDate: tx.revocationDate ?? null,
            price: tx.price ?? null,
            currency,
            storefront: tx.storefront ?? null,
          },
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      // A refund stands: replaying the JWS the app saw before it must not grant
      // the plan back. REFUND_REVERSED reopens the payment before it lands here.
      const prior = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
      if (prior?.status === 'canceled' && !tx.revocationDate) return;
    }

    // Refunded or revoked (REFUND notifications land here too).
    if (tx.revocationDate) {
      await this.prisma.payment.updateMany({ where: { idempotencyKey }, data: { status: 'canceled', failureReason: 'refunded' } });
      if (isThis && !tx.isUpgraded && this.coversCurrentPeriod(existing, tx)) await this.lapse(existing);
      return;
    }

    // An upgraded-away transaction is superseded by the upgrade's own one;
    // applying it would put the account back on the old plan.
    if (tx.isUpgraded) return;

    // Already applied, or older than what is on the row: never regress a period.
    // Ordered by purchase, not expiry: Apple applies an upgrade at once under the
    // same originalTransactionId, and yearly Standard → monthly Pro ends sooner.
    if (isThis) {
      const start = existing.currentPeriodStart.getTime();
      if (purchasedAt.getTime() < start || (purchasedAt.getTime() === start && expiresAt <= existing.currentPeriodEnd)) return;
    }

    if (expiresAt <= now) {
      if (isThis) await this.lapse(existing);
      return;
    }

    const wasActive =
      existing?.planId === plan.id && existing.status !== 'expired' && existing.currentPeriodEnd > now;
    const data = {
      planId: plan.id,
      cycle: product.cycle,
      status: 'active' as const,
      // Apple's period, not one computed here: the App Store decides when it renews.
      currentPeriodStart: purchasedAt,
      currentPeriodEnd: expiresAt,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      provider: 'apple' as const,
      // No card to charge: a gateway binding left here would bill the customer twice.
      providerToken: null,
      dunningAttempts: 0,
      lastPaymentAt: purchasedAt,
      appleOriginalTransactionId: tx.originalTransactionId,
    };
    // Apple reuses the originalTransactionId for everything one Apple ID buys in
    // a group, so a second AgroTraders account on the same Apple ID takes the
    // subscription over: the account that held it drops to free and lets go.
    // A holder since moved to a card gateway paid for its plan itself and keeps
    // it; it only lets go of the stale id (the updateMany below).
    const holder = isThis
      ? null
      : await this.prisma.subscription.findUnique({ where: { appleOriginalTransactionId: tx.originalTransactionId } });
    if (holder && holder.userId !== userId && holder.provider === 'apple') await this.lapse(holder);
    const [, subscription] = await this.prisma.$transaction([
      this.prisma.subscription.updateMany({
        where: { appleOriginalTransactionId: tx.originalTransactionId, userId: { not: userId } },
        data: { appleOriginalTransactionId: null },
      }),
      this.prisma.subscription.upsert({
        where: { userId_role: { userId, role: plan.role } },
        create: { userId, role: plan.role, ...data },
        update: data,
      }),
    ]);
    if (payment) await this.prisma.payment.update({ where: { id: payment.id }, data: { subscriptionId: subscription.id } });
    this.entitlements.invalidate(userId);

    // No platform invoice: Apple is the merchant of record and issues the receipt.
    if (payment && !wasActive) {
      await this.notifications.create({
        userId,
        system: 'billing',
        type: 'billing.activated',
        params: { plan: plan.name, until: expiresAt.toISOString().slice(0, 10) },
        data: { subscriptionId: subscription.id, planCode: plan.code },
        linkUrl: '/console/billing',
      });
    }
  }

  /**
   * An App Store Server Notification (V2). Throws BadRequest when the payload
   * does not verify, so the controller answers 400 and Apple retries.
   */
  async handleNotification(signedPayload: string): Promise<void> {
    let notification: ResponseBodyV2DecodedPayload;
    let tx: JWSTransactionDecodedPayload | undefined;
    let gracePeriodExpiresDate: number | undefined;
    try {
      const { value, verifier } = await this.verify((v) => v.verifyAndDecodeNotification(signedPayload));
      notification = value;
      // The nested payloads come from the same environment as the envelope.
      if (value.data?.signedTransactionInfo) tx = await verifier.verifyAndDecodeTransaction(value.data.signedTransactionInfo);
      if (value.data?.signedRenewalInfo) {
        gracePeriodExpiresDate = (await verifier.verifyAndDecodeRenewalInfo(value.data.signedRenewalInfo)).gracePeriodExpiresDate;
      }
    } catch (e) {
      this.logger.warn(`Rejected an App Store notification: ${e instanceof VerificationException ? VerificationStatus[e.status] : (e as Error).message}`);
      throw new BadRequestException('Could not verify the App Store notification.');
    }

    const { notificationType: type, subtype } = notification;
    if (!tx?.originalTransactionId) return; // TEST and the other non-subscription events
    const row = await this.prisma.subscription.findUnique({ where: { appleOriginalTransactionId: tx.originalTransactionId } });
    if (!row || row.provider !== 'apple') {
      // The app posts its own transactions; a notification that beats it (or one
      // for a row since moved to a card gateway) has nothing to act on.
      this.logger.log(`App Store ${type} for unknown original transaction ${tx.originalTransactionId}`);
      return;
    }
    // Same Apple ID, another AgroTraders account: that account's own post moves
    // the row over (applyTransaction); until then this row is not the buyer's.
    if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== appleAccountToken(row.userId)) {
      this.logger.log(`App Store ${type} for ${tx.originalTransactionId} is bound to another account than ${row.userId}`);
      return;
    }
    // A retried or out-of-order notice about an earlier period must not undo
    // the renewal or upgrade that has landed since.
    if (type && LOWERING.has(type) && (tx.purchaseDate ?? 0) < row.currentPeriodStart.getTime()) return;

    switch (type) {
      case NotificationTypeV2.SUBSCRIBED:
      case NotificationTypeV2.DID_RENEW:
      case NotificationTypeV2.OFFER_REDEEMED:
      case NotificationTypeV2.RENEWAL_EXTENDED:
      // Carries the refunded transaction with its revocationDate set.
      case NotificationTypeV2.REFUND:
        return this.applyTransaction(row.userId, tx);
      case NotificationTypeV2.REFUND_REVERSED:
        // Reopen the refunded payment first, or applyTransaction's replay guard skips it.
        await this.prisma.payment.updateMany({
          where: { idempotencyKey: `apple:${tx.transactionId}` },
          data: { status: 'succeeded', failureReason: null },
        });
        return this.applyTransaction(row.userId, tx);
      case NotificationTypeV2.DID_CHANGE_RENEWAL_PREF:
        // A downgrade takes effect at the next renewal, which DID_RENEW carries.
        if (subtype === Subtype.UPGRADE) await this.applyTransaction(row.userId, tx);
        return;
      case NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS:
        if (row.status === 'expired') return;
        if (subtype === Subtype.AUTO_RENEW_DISABLED) {
          await this.prisma.subscription.update({
            where: { id: row.id },
            data: { cancelAtPeriodEnd: true, status: 'canceled', canceledAt: new Date() },
          });
        } else if (subtype === Subtype.AUTO_RENEW_ENABLED) {
          await this.prisma.subscription.update({
            where: { id: row.id },
            data: { cancelAtPeriodEnd: false, status: 'active', canceledAt: null },
          });
        }
        break;
      case NotificationTypeV2.DID_FAIL_TO_RENEW:
        if (row.status === 'expired') return;
        // Apple retries the card itself; in a grace period the customer keeps access.
        await this.prisma.subscription.update({
          where: { id: row.id },
          data: {
            status: 'past_due',
            ...(subtype === Subtype.GRACE_PERIOD && gracePeriodExpiresDate ? { currentPeriodEnd: new Date(gracePeriodExpiresDate) } : {}),
          },
        });
        break;
      case NotificationTypeV2.GRACE_PERIOD_EXPIRED:
        if (row.status === 'expired') return;
        // Access ends, the subscription does not: Apple keeps retrying for up to
        // 60 days and a recovery renews it. Lapsing would open card checkout.
        await this.prisma.subscription.update({ where: { id: row.id }, data: { status: 'past_due', currentPeriodEnd: new Date() } });
        break;
      case NotificationTypeV2.EXPIRED:
      case NotificationTypeV2.REVOKE:
        return this.lapse(row);
      default:
        return; // PRICE_INCREASE, CONSUMPTION_REQUEST, DOWNGRADE prefs… nothing to change
    }
    this.entitlements.invalidate(row.userId);
  }

  /** Whether a transaction paid for the period the row is in now (a day of slack for clock skew). */
  private coversCurrentPeriod(row: Subscription, tx: JWSTransactionDecodedPayload): boolean {
    return (tx.expiresDate ?? 0) >= row.currentPeriodEnd.getTime() - DAY_MS;
  }

  /** Drop to free, once — a replayed expiry must not send a second "downgraded" notice. */
  private async lapse(row: Subscription): Promise<void> {
    if (row.status !== 'expired') await this.subscriptions.moveToFree(row.userId, row.role, 'expired');
  }
}
