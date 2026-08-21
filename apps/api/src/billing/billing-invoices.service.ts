import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Closing documents for subscription payments.
 *
 * Reuses the existing `Invoice` model rather than adding a parallel one: it
 * already has monotonic numbering, a pdfkit renderer and a token-guarded
 * download route, and business customers need exactly that document at every
 * renewal — otherwise collections becomes a manual job at the worst moment.
 *
 * The one structural difference is the issuer. `Invoice` is peer-to-peer
 * (issuer and recipient are both `User`), and the platform is not a peer, so
 * `BillingSettings.platformUserId` nominates the account these are issued FROM.
 * When it is unset we fall back to the oldest admin account, and if there is no
 * admin at all we skip issuing rather than fail the payment — a customer must
 * never lose a paid subscription because a document could not be numbered.
 */
@Injectable()
export class BillingInvoicesService {
  private readonly logger = new Logger('BillingInvoicesService');

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** The account subscription invoices are issued from. */
  private async platformUserId(): Promise<string | null> {
    const settings = await this.prisma.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    if (settings.platformUserId) {
      const exists = await this.prisma.user.findUnique({ where: { id: settings.platformUserId }, select: { id: true } });
      if (exists) return exists.id;
    }
    const admin = await this.prisma.user.findFirst({
      where: { role: 'admin', active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return admin?.id ?? null;
  }

  /** Same allocator the peer-to-peer invoices use, so numbering stays one series. */
  private async nextNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await tx.counter.upsert({
      where: { key: `invoice-${year}` },
      create: { key: `invoice-${year}`, value: 1 },
      update: { value: { increment: 1 } },
    });
    return `INV-${year}-${String(counter.value).padStart(6, '0')}`;
  }

  /**
   * Issue the closing document for a succeeded subscription payment. Idempotent:
   * a payment that already has an invoice returns the existing one, so a replayed
   * webhook cannot mint a second numbered document.
   */
  async issueForPayment(paymentId: string): Promise<string | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: { include: { plan: true } }, user: { select: { id: true, name: true, locale: true } } },
    });
    if (!payment || payment.status !== 'succeeded' || payment.purpose !== 'subscription') return null;

    const existing = await this.prisma.invoice.findFirst({
      where: { subscriptionId: payment.subscriptionId ?? undefined, recipientId: payment.userId, notes: { contains: payment.id } },
      select: { id: true },
    });
    if (existing) return existing.id;

    const issuerId = await this.platformUserId();
    if (!issuerId) {
      this.logger.warn(`No platform account configured — skipping the invoice for payment ${paymentId}`);
      return null;
    }

    const planName = payment.subscription?.plan.name ?? 'Subscription';
    const period = payment.subscription
      ? `${payment.subscription.currentPeriodStart.toISOString().slice(0, 10)} — ${payment.subscription.currentPeriodEnd.toISOString().slice(0, 10)}`
      : '';

    const invoice = await this.prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(tx);
      return tx.invoice.create({
        data: {
          number,
          kind: 'subscription',
          status: 'paid',
          currency: payment.currency,
          // Prices are VAT-inclusive by policy, so the whole amount is the
          // subtotal and tax is carried at zero rather than invented here.
          subtotalCents: payment.amountMinor,
          taxCents: 0,
          totalCents: payment.amountMinor,
          // The payment id is what makes re-issuing idempotent above.
          notes: `AgroTraders ${planName} · ${period} · payment ${payment.id}`,
          paidAt: payment.paidAt ?? new Date(),
          issuerId,
          recipientId: payment.userId,
          subscriptionId: payment.subscriptionId,
          lines: {
            create: [
              {
                description: `${planName} subscription${period ? ` (${period})` : ''}`,
                qty: 1,
                unitPriceCents: payment.amountMinor,
                amountCents: payment.amountMinor,
                sort: 0,
              },
            ],
          },
        },
        select: { id: true, number: true },
      });
    });

    await this.notifications.create({
      userId: payment.userId,
      system: 'billing',
      type: 'wallet.invoice',
      params: {
        issuer: 'AgroTraders',
        number: invoice.number,
        amount: `${(payment.amountMinor / 100).toLocaleString('ru-RU')} ₽`,
      },
      linkUrl: '/console/invoices',
    });

    return invoice.id;
  }
}
