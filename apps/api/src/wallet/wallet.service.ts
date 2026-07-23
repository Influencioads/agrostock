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

  /** Ensure a wallet row exists for the user; safe inside a transaction. */
  async ensure(userId: string, db: Db = this.prisma) {
    const existing = await db.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return db.wallet.create({ data: { userId, balanceCents: 0 } });
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

  /** Add money to a wallet: top-ups, earnings (payout / escrow_release), refunds. */
  async credit(userId: string, cents: number, type: TxType, note?: string, db: Db = this.prisma, idempotencyKey?: string) {
    if (cents <= 0) return;
    const wallet = await this.ensure(userId, db);
    const fresh = await this.writeTx(wallet.id, cents, type, note, idempotencyKey, db);
    if (!fresh) return; // idempotent replay — balance already reflects this credit
    await db.wallet.update({ where: { id: wallet.id }, data: { balanceCents: { increment: cents } } });
    // Only notify for standalone credits — when a caller composes this inside its
    // own `$transaction` (db is a tx client), skip: the row/emit would fire before
    // that transaction commits. Such callers notify explicitly post-commit.
    if (NOTIFY_CREDIT[type] && db === this.prisma) {
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

  /**
   * Remove money from a wallet: escrow holds, withdrawals. Overdraft-safe (F09):
   * the balance is decremented with a single conditional UPDATE guarded by
   * `balanceCents >= cents`, so two concurrent debits can never both pass a
   * read-then-write check and drive the balance negative. Rejects when the
   * guarded update matches no row (insufficient funds).
   */
  async debit(userId: string, cents: number, type: TxType, note?: string, db: Db = this.prisma, idempotencyKey?: string) {
    if (cents <= 0) return;
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

@Global()
@Module({ providers: [WalletService], exports: [WalletService] })
export class WalletModule {}
