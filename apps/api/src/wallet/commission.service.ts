import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Which take rate applies. Orders and jobs are priced differently on purpose. */
export type CommissionKind = 'order' | 'escrow';

/**
 * Platform take rate on settlement.
 *
 * Ships **disabled at 0%**. The commercial plan switches commission on around
 * month 12, once escrow settlement is habitual: charged early it suppresses the
 * transaction volume it taxes. Building it now means turning it on is an admin
 * toggle rather than a deployment, and it means the deduction is already
 * exercised by the settlement paths before any real money depends on it.
 *
 * Deliberately a PURE POLICY object: it decides how much the platform keeps and
 * who it is paid to, and moves no money itself. The two settlement paths already
 * hold a wallet and are already inside a transaction, so they do both credits.
 * That also keeps this out of the wallet's own dependency graph — a service that
 * both moved money and was called by the money-mover would be a module cycle.
 */
@Injectable()
export class CommissionService {
  private readonly logger = new Logger('CommissionService');

  constructor(private prisma: PrismaService) {}

  /**
   * How much of `grossCents` the platform keeps. Returns 0 when commission is
   * off, the rate is 0, the recipient is exempt (grandfathered annual
   * subscribers), or there is no platform account to pay it to.
   */
  async rateFor(kind: CommissionKind, recipientId: string | null | undefined): Promise<{ bps: number; platformUserId: string | null }> {
    const settings = await this.prisma.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    if (!settings.commissionEnabled) return { bps: 0, platformUserId: null };

    const bps = kind === 'order' ? settings.orderCommissionBps : settings.escrowCommissionBps;
    if (bps <= 0) return { bps: 0, platformUserId: null };

    if (recipientId) {
      const user = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { commissionExempt: true } });
      if (user?.commissionExempt) return { bps: 0, platformUserId: null };
    }

    const platformUserId = settings.platformUserId
      ? (await this.prisma.user.findUnique({ where: { id: settings.platformUserId }, select: { id: true } }))?.id ?? null
      : null;

    return { bps, platformUserId };
  }

  /**
   * Compute the fee for a gross settlement amount. Rounded DOWN so the fee can
   * never exceed the gross by a rounding cent, and floored at zero.
   */
  static fee(grossCents: number, bps: number): number {
    if (grossCents <= 0 || bps <= 0) return 0;
    return Math.min(grossCents, Math.floor((grossCents * bps) / 10_000));
  }

  /**
   * How a gross settlement splits between the recipient and the platform.
   *
   * The caller credits `net` to the recipient and, when `platformUserId` is set
   * and `fee > 0`, credits `fee` to that account — both inside its own
   * transaction, so the books can never show a fee taken from a payout that did
   * not happen. Use `note` and `idempotencyKey` for the platform credit.
   */
  async split(params: {
    kind: CommissionKind;
    recipientId: string;
    grossCents: number;
    /** Stable reference for the idempotency key, e.g. `order:abc` or `hire:xyz`. */
    ref: string;
  }): Promise<{ net: number; fee: number; platformUserId: string | null; note: string; idempotencyKey: string }> {
    const { kind, recipientId, grossCents, ref } = params;
    const none = {
      net: grossCents,
      fee: 0,
      platformUserId: null,
      note: '',
      idempotencyKey: `commission:${kind}:${ref}`,
    };

    const { bps, platformUserId } = await this.rateFor(kind, recipientId);
    // No platform account configured is not a reason to hold money back — pay
    // the recipient in full and make the misconfiguration loud instead.
    if (bps <= 0 || !platformUserId) {
      if (bps > 0 && !platformUserId) {
        this.logger.warn(`Commission is on at ${bps}bps but no platform account is set — skipping the fee on ${ref}`);
      }
      return none;
    }

    const fee = CommissionService.fee(grossCents, bps);
    if (fee <= 0) return none;

    return {
      net: grossCents - fee,
      fee,
      platformUserId,
      note: `Platform commission (${(bps / 100).toFixed(2)}%) on ${ref}`,
      idempotencyKey: `commission:${kind}:${ref}`,
    };
  }
}
