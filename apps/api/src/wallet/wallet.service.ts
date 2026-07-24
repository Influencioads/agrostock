import { BadRequestException, Global, Injectable, Module } from '@nestjs/common';
import { Prisma, TxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Either the root client or a `$transaction` client — so callers can compose. */
type Db = PrismaService | Prisma.TransactionClient;

/** Wallet credit types leave the balance up; earnings are the subset workers get paid. */
export const EARNING_TYPES: TxType[] = ['payout', 'escrow_release'];

/** Credit types worth a user-facing "money arrived" notification (→ `notification:wallet.<type>`). */
const NOTIFY_CREDIT: Partial<Record<TxType, true>> = {
  topup: true,
  escrow_release: true,
  refund: true,
};

/**
 * Central money mover. Every balance change goes through here so a matching
 * `WalletTx` is always written. Debits are stored as negative `amountCents`
 * (the running history nets to the balance); credits are positive.
 */
@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Ensure a wallet row exists for the user; safe inside a transaction.
   * BL-14: find-then-create is a race — two concurrent first-ever wallet ops both
   * miss and both create. Catch the unique violation and re-read instead of
   * surfacing a spurious 500.
   */
  async ensure(userId: string, db: Db = this.prisma) {
    const existing = await db.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    try {
      return await db.wallet.create({ data: { userId, balanceCents: 0 } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const raced = await db.wallet.findUnique({ where: { userId } });
        if (raced) return raced;
      }
      throw e;
    }
  }

  /**
   * Record the ledger row first (optionally keyed for idempotency). Returns
   * false when a keyed row already exists — the caller must then skip the
   * balance change so a replay is a no-op. A signed `amountCents` (negative for
   * debits) keeps the running history netting to the balance.
   */
  private async writeTx(
    walletId: string,
    signedCents: number,
    type: TxType,
    note: string | undefined,
    idempotencyKey: string | undefined,
    db: Db,
  ): Promise<boolean> {
    try {
      await db.walletTx.create({
        data: { walletId, amountCents: signedCents, type, note, idempotencyKey: idempotencyKey ?? null },
      });
      return true;
    } catch (e) {
      // Unique violation on idempotencyKey → this operation already ran.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
  }

  /**
   * Add money to a wallet: top-ups, earnings (payout / escrow_release), refunds.
   * BL-14: when called standalone (root client) the ledger write and the balance
   * increment run in ONE transaction — otherwise a failure between them left a
   * WalletTx row with no matching balance change. Composed callers pass a tx
   * client and are already atomic within their own transaction.
   */
  async credit(userId: string, cents: number, type: TxType, note?: string, db: Db = this.prisma, idempotencyKey?: string) {
    if (cents <= 0) return;
    const standalone = db === this.prisma;
    const applied = standalone
      ? await this.prisma.$transaction((tx) => this.creditIn(userId, cents, type, note, tx, idempotencyKey))
      : await this.creditIn(userId, cents, type, note, db, idempotencyKey);
    // Only notify for standalone credits — when a caller composes this inside its
    // own `$transaction` (db is a tx client), skip: the row/emit would fire before
    // that transaction commits. Such callers notify explicitly post-commit.
    if (applied && NOTIFY_CREDIT[type] && standalone) {
      await this.notifications.create({
        userId,
        system: 'wallet',
        type: `wallet.${type}`,
        params: { amount: `$${(cents / 100).toLocaleString()}` },
        data: { amountCents: cents, txType: type },
        linkUrl: '/console/wallet',
      });
    }
  }

  /** The credit body. Returns false on an idempotent replay (nothing moved). */
  private async creditIn(userId: string, cents: number, type: TxType, note: string | undefined, db: Db, idempotencyKey?: string) {
    const wallet = await this.ensure(userId, db);
    const fresh = await this.writeTx(wallet.id, cents, type, note, idempotencyKey, db);
    if (!fresh) return false; // idempotent replay — balance already reflects this credit
    await db.wallet.update({ where: { id: wallet.id }, data: { balanceCents: { increment: cents } } });
    return true;
  }

  /**
   * Remove money from a wallet: escrow holds, withdrawals. Overdraft-safe (F09):
   * the balance is decremented with a single conditional UPDATE guarded by
   * `balanceCents >= cents`, so two concurrent debits can never both pass a
   * read-then-write check and drive the balance negative. Rejects when the
   * guarded update matches no row (insufficient funds).
   */
  async debit(userId: string, cents: number, type: TxType, note?: string, db: Db = this.prisma, idempotencyKey?: string) {
    if (cents <= 0) return;
    // BL-14: standalone debits run the guarded decrement and the ledger write in
    // ONE transaction. Previously, a non-P2002 failure in the ledger write (a
    // dropped connection, say) left the balance already decremented with no
    // WalletTx row and nothing to roll it back.
    if (db === this.prisma) {
      await this.prisma.$transaction((tx) => this.debitIn(userId, cents, type, note, tx, idempotencyKey));
      return;
    }
    await this.debitIn(userId, cents, type, note, db, idempotencyKey);
  }

  /** The debit body — overdraft-safe conditional decrement plus the ledger row. */
  private async debitIn(userId: string, cents: number, type: TxType, note: string | undefined, db: Db, idempotencyKey?: string) {
    const wallet = await this.ensure(userId, db);
    // Conditional atomic decrement — the DB enforces the non-negative invariant.
    const applied = await db.wallet.updateMany({
      where: { id: wallet.id, balanceCents: { gte: cents } },
      data: { balanceCents: { decrement: cents } },
    });
    if (applied.count === 0) {
      throw new BadRequestException('Insufficient wallet balance. Add funds to your wallet first.');
    }
    const fresh = await this.writeTx(wallet.id, -cents, type, note, idempotencyKey, db);
    if (!fresh) {
      // Extremely unlikely (the guarded decrement already succeeded), but if the
      // ledger row collides on a replay key, undo the decrement to stay balanced.
      await db.wallet.update({ where: { id: wallet.id }, data: { balanceCents: { increment: cents } } });
    }
  }

  /**
   * Move money between two wallets atomically and balanced — no value created or
   * destroyed. Runs debit+credit in one transaction so a failure rolls back both.
   */
  async transfer(fromUserId: string, toUserId: string, cents: number, type: TxType, note?: string, idempotencyKey?: string) {
    if (cents <= 0) return;
    await this.prisma.$transaction(async (tx) => {
      await this.debit(fromUserId, cents, type, note, tx, idempotencyKey ? `${idempotencyKey}:debit` : undefined);
      await this.credit(toUserId, cents, type, note, tx, idempotencyKey ? `${idempotencyKey}:credit` : undefined);
    });
  }
}

/**
 * F06: ledger-backed escrow. Paying an order debits the buyer into a per-order
 * hold; settlement releases to the seller and/or refunds the buyer FROM that
 * hold. Because the money was debited at hold time, the settlement credits are
 * backed — nothing is minted — and both hold and settlement are idempotent on
 * the unique `orderId`, so retries/double-clicks can't move money twice.
 */
@Injectable()
export class EscrowService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  /** Debit the buyer and open a hold for the order. Idempotent on orderId. */
  async hold(params: { orderId: string; buyerId: string; sellerId?: string | null; amountCents: number; currency?: string }): Promise<void> {
    const { orderId, buyerId, sellerId, amountCents } = params;
    if (amountCents <= 0) return;
    const existing = await this.prisma.escrowHold.findUnique({ where: { orderId } });
    if (existing) return; // already held — idempotent
    await this.prisma.$transaction(async (tx) => {
      // Overdraft-safe debit, keyed so a retry can't double-charge the buyer.
      await this.wallet.debit(buyerId, amountCents, 'escrow_hold', `Escrow hold for order ${orderId}`, tx, `escrow:hold:${orderId}`);
      await tx.escrowHold.create({
        data: { orderId, buyerId, sellerId: sellerId ?? null, amountCents, currency: params.currency ?? 'USD' },
      });
    });
  }

  /**
   * Settle a held order: `releaseCents` to the seller, `refundCents` to the
   * buyer. Must not exceed the held amount. Claims the hold exactly once with a
   * conditional held->settled transition, so a concurrent settlement bails
   * before crediting.
   */
  async settle(params: { orderId: string; refundCents?: number; releaseCents?: number; note?: string }): Promise<void> {
    const { orderId } = params;
    const hold = await this.prisma.escrowHold.findUnique({ where: { orderId } });
    if (!hold) throw new BadRequestException('No escrow hold exists for this order.');
    if (hold.status !== 'held') throw new BadRequestException('This escrow hold was already settled.');

    const refund = Math.max(0, Math.min(params.refundCents ?? 0, hold.amountCents));
    const release = Math.max(0, Math.min(params.releaseCents ?? hold.amountCents - refund, hold.amountCents - refund));
    const status = refund > 0 && release > 0 ? 'split' : refund > 0 ? 'refunded' : 'released';

    await this.prisma.$transaction(async (tx) => {
      // Conditional claim — the transition is the guard against double-settlement.
      const claimed = await tx.escrowHold.updateMany({
        where: { orderId, status: 'held' },
        data: { status, releasedCents: release, refundedCents: refund, settledAt: new Date() },
      });
      if (claimed.count === 0) throw new BadRequestException('This escrow hold was already settled.');
      if (refund > 0) {
        await this.wallet.credit(hold.buyerId, refund, 'refund', params.note ?? `Escrow refund for order ${orderId}`, tx, `escrow:refund:${orderId}`);
      }
      if (release > 0 && hold.sellerId) {
        await this.wallet.credit(hold.sellerId, release, 'escrow_release', params.note ?? `Escrow release for order ${orderId}`, tx, `escrow:release:${orderId}`);
      }
    });
  }
}

@Global()
@Module({ providers: [WalletService, EscrowService], exports: [WalletService, EscrowService] })
export class WalletModule {}
