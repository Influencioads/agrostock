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

  /** Add money to a wallet: top-ups, earnings (payout / escrow_release), refunds. */
  async credit(userId: string, cents: number, type: TxType, note?: string, db: Db = this.prisma) {
    if (cents <= 0) return;
    const wallet = await this.ensure(userId, db);
    await db.walletTx.create({ data: { walletId: wallet.id, amountCents: cents, type, note } });
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

  /** Remove money from a wallet: escrow holds, withdrawals. Rejects overdrafts. */
  async debit(userId: string, cents: number, type: TxType, note?: string, db: Db = this.prisma) {
    if (cents <= 0) return;
    const wallet = await this.ensure(userId, db);
    if (wallet.balanceCents < cents) {
      throw new BadRequestException('Insufficient wallet balance. Add funds to your wallet first.');
    }
    await db.walletTx.create({ data: { walletId: wallet.id, amountCents: -cents, type, note } });
    await db.wallet.update({ where: { id: wallet.id }, data: { balanceCents: { decrement: cents } } });
  }
}

@Global()
@Module({ providers: [WalletService], exports: [WalletService] })
export class WalletModule {}
