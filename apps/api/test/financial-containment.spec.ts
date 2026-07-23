import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from '../src/admin/admin.module';
import { InvoicesService } from '../src/invoices/invoices.module';
import { MeService } from '../src/me/me.module';
import { OrdersService } from '../src/orders/orders.module';

const financialWriteDisabled = (error: unknown) =>
  error instanceof ServiceUnavailableException &&
  (error.getResponse() as { code?: string }).code === 'LEGACY_FINANCE_DISABLED';

describe('legacy financial write containment', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.ENABLE_LEGACY_FINANCIAL_WRITES;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_LEGACY_FINANCIAL_WRITES;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFlag === undefined) delete process.env.ENABLE_LEGACY_FINANCIAL_WRITES;
    else process.env.ENABLE_LEGACY_FINANCIAL_WRITES = originalFlag;
  });

  it('blocks mock wallet top-up before crediting a wallet', async () => {
    const wallets = { credit: vi.fn() };
    const service = new MeService({} as never, {} as never, wallets as never, {} as never);

    await expect(service.topup('buyer-1', 500)).rejects.toSatisfy(financialWriteDisabled);
    expect(wallets.credit).not.toHaveBeenCalled();
  });

  it('blocks a buyer from self-attesting an order as paid', async () => {
    const prisma = {
      order: { findUnique: vi.fn(), update: vi.fn() },
      $transaction: vi.fn(),
    };
    const service = new OrdersService(prisma as never, { create: vi.fn() } as never, {} as never);

    await expect(
      service.setStatus('order-1', { id: 'buyer-1', role: 'buyer', roles: ['buyer'] } as never, 'paid'),
    ).rejects.toSatisfy(financialWriteDisabled);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks an admin from self-attesting an order as paid', async () => {
    const prisma = { order: { findUnique: vi.fn() }, $transaction: vi.fn() };
    const service = new AdminService(prisma as never, { log: vi.fn() } as never, {} as never, {} as never);

    await expect(service.setOrderStatus('order-1', 'paid', 'admin-1')).rejects.toSatisfy(financialWriteDisabled);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks unbacked dispute settlement before reading or crediting', async () => {
    const prisma = { order: { findUnique: vi.fn() }, $transaction: vi.fn() };
    const wallet = { credit: vi.fn(), debit: vi.fn() };
    const service = new AdminService(prisma as never, { log: vi.fn() } as never, wallet as never, {} as never);

    await expect(
      service.resolveDispute('order-1', { resolution: 'refund_buyer' } as never, 'admin-1'),
    ).rejects.toSatisfy(financialWriteDisabled);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(wallet.credit).not.toHaveBeenCalled();
  });

  it('blocks manual wallet adjustments before reading or mutating a wallet', async () => {
    const prisma = { user: { findUnique: vi.fn() } };
    const wallet = { credit: vi.fn(), debit: vi.fn() };
    const service = new AdminService(prisma as never, { log: vi.fn() } as never, wallet as never, {} as never);

    await expect(
      service.adjustWallet('user-1', { amountCents: 10_000, type: 'topup' } as never, 'admin-1'),
    ).rejects.toSatisfy(financialWriteDisabled);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(wallet.credit).not.toHaveBeenCalled();
    expect(wallet.debit).not.toHaveBeenCalled();
  });

  it('blocks payout approval before reading or debiting', async () => {
    const prisma = { payoutRequest: { findUnique: vi.fn(), update: vi.fn() } };
    const wallet = { debit: vi.fn() };
    const service = new AdminService(prisma as never, { log: vi.fn() } as never, wallet as never, {} as never);

    await expect(service.decidePayout('payout-1', 'approved', 'admin-1')).rejects.toSatisfy(financialWriteDisabled);
    expect(prisma.payoutRequest.findUnique).not.toHaveBeenCalled();
    expect(wallet.debit).not.toHaveBeenCalled();
  });

  it('blocks issuer-attested invoice payment before reading or updating', async () => {
    const prisma = { invoice: { findUnique: vi.fn(), update: vi.fn() } };
    const service = new InvoicesService(prisma as never, {} as never, {} as never, {} as never, {} as never);

    await expect(
      service.setStatus('invoice-1', { id: 'seller-1', role: 'seller', roles: ['seller'] } as never, 'paid'),
    ).rejects.toSatisfy(financialWriteDisabled);
    expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });
});
