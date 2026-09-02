import { Injectable, Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Which competitive-bidding take rate applies, and therefore who owes it. */
export type DealCommissionKind = 'auction' | 'buyer_bid';

/** Accepts the request-scoped client or a transaction client interchangeably. */
type Db = PrismaService | Prisma.TransactionClient;

/**
 * Platform take on competitive bidding — the auction seller's 1% and the buyer
 * bid's 0.5% — charged ON AWARD and RECORDED AS OWED.
 *
 * Deliberately NOT `CommissionService`. That one is a deduction: it splits a
 * settlement into net + fee and its callers immediately credit a platform wallet,
 * which means it needs `platformUserId` and it needs money to actually be moving.
 * Neither holds here. Escrow is settled off-platform by an agent for now, so this
 * service writes a `CommissionCharge` row and moves nothing — the agent collects
 * and marks it collected. Keeping the two apart also keeps the buyer's 0.5%
 * honest: it is ADDED ON TOP of the goods total, not carved out of it, and a
 * deduction model has no way to express that.
 *
 * Rates live on the BillingSettings singleton so an admin can change them without
 * a deploy. A rate of 0 switches one off — there is no separate enable flag, and
 * `commissionEnabled` is not consulted because that flag gates the wallet
 * deduction on orders and hires, which this path never performs.
 */
@Injectable()
export class DealCommissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * The fee on a goods value, rounded DOWN so it can never exceed the base by a
   * rounding cent, and floored at zero.
   */
  static fee(baseCents: number, bps: number): number {
    if (baseCents <= 0 || bps <= 0) return 0;
    return Math.min(baseCents, Math.floor((baseCents * bps) / 10_000));
  }

  /** Both rates, read fresh so an admin change takes effect on the next deal. */
  async rates(): Promise<{ auctionBps: number; buyerBidBps: number }> {
    const s = await this.prisma.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    return { auctionBps: s.auctionCommissionBps, buyerBidBps: s.buyerBidCommissionBps };
  }

  /**
   * Record what a won deal owes. No money moves.
   *
   * `ref` is the idempotency key: a settlement that retries — a manual close
   * racing the 5-minute cron, an award replayed — collides on the unique index
   * and is swallowed here rather than charging the same deal twice. `rateBps`
   * and `baseCents` are snapshotted so a later rate change never restates an
   * old charge.
   *
   * Returns the amount recorded, or 0 when the rate is off or the charge already
   * existed.
   */
  async record(
    db: Db,
    params: {
      kind: DealCommissionKind;
      /** Stable per-deal key, e.g. `auction:<productId>` or `buyer_bid:<bidId>`. */
      ref: string;
      /** Who owes it: the seller on an auction, the buyer on a buyer bid. */
      payerId: string;
      baseCents: number;
      rateBps: number;
      amountCents: number;
      orderId?: string | null;
      productId?: string | null;
      buyerBidId?: string | null;
      note?: string;
    },
  ): Promise<number> {
    if (params.amountCents <= 0) return 0;
    try {
      await db.commissionCharge.create({
        data: {
          ref: params.ref,
          kind: params.kind,
          payerId: params.payerId,
          baseCents: params.baseCents,
          rateBps: params.rateBps,
          amountCents: params.amountCents,
          orderId: params.orderId ?? null,
          productId: params.productId ?? null,
          buyerBidId: params.buyerBidId ?? null,
          note: params.note ?? null,
        },
      });
      return params.amountCents;
    } catch (e) {
      // Already charged for this deal — the settlement ran twice, which is the
      // exact case `ref` exists to make safe.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return 0;
      throw e;
    }
  }
}

@Module({ providers: [DealCommissionService], exports: [DealCommissionService] })
export class DealCommissionModule {}
