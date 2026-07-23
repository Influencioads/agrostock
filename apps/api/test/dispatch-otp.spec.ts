import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../src/orders/orders.module';
import type { AuthUser } from '../src/auth/current-user.decorator';

const transporter: AuthUser = { id: 't1', email: 't@x', role: 'transporter', roles: ['transporter'], adminPermissions: [] };

function makeService(order: Record<string, unknown>) {
  const update = vi.fn(async () => ({}));
  const prisma = {
    order: {
      findUnique: vi.fn(async () => order),
      update,
    },
    trip: { update: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ order: { update: vi.fn(async () => ({})) }, trip: { update: vi.fn(async () => ({})) }, orderEvent: { create: vi.fn() } }),
    ),
    orderEvent: { create: vi.fn() },
  };
  const notifications = { create: vi.fn(async () => ({})) };
  const text = {};
  const escrow = { hold: vi.fn(async () => {}), settle: vi.fn(async () => {}) };
  const svc = new OrdersService(prisma as never, notifications as never, text as never, escrow as never);
  return { svc, update };
}

const baseOrder = {
  id: 'o1',
  status: 'dispatched',
  dispatchMode: 'platform',
  buyerId: 'b1',
  sellerId: 's1',
  reference: 'AG-XYZ',
  pickupOtp: '123456',
  pickupOtpAttempts: 0,
  pickupVerifiedAt: null,
  trip: { id: 'tr1', transporterId: 't1' },
};

describe('dispatch OTP metering (F36)', () => {
  it('increments attempts and rejects a wrong pickup code', async () => {
    const { svc, update } = makeService({ ...baseOrder });
    await expect(svc.verifyPickup('o1', transporter, '000000')).rejects.toBeInstanceOf(BadRequestException);
    expect(update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { pickupOtpAttempts: { increment: 1 } } });
  });

  it('locks the code once attempts are exhausted (without comparing the code)', async () => {
    const { svc, update } = makeService({ ...baseOrder, pickupOtpAttempts: 5 });
    await expect(svc.verifyPickup('o1', transporter, '123456')).rejects.toThrow(/Too many incorrect attempts/);
    // No further increment once locked.
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts the correct pickup code', async () => {
    const { svc } = makeService({ ...baseOrder });
    const out = await svc.verifyPickup('o1', transporter, ' 123456 ');
    expect(out).toMatchObject({ ok: true, status: 'in_transit' });
  });

  it('meters the delivery code the same way', async () => {
    const deliveryOrder = {
      ...baseOrder,
      status: 'in_transit',
      deliveryOtp: '654321',
      deliveryOtpAttempts: 5,
      deliveryVerifiedAt: null,
      pickupVerifiedAt: new Date(),
    };
    const { svc } = makeService(deliveryOrder);
    await expect(svc.verifyDelivery('o1', transporter, '654321')).rejects.toThrow(/Too many incorrect attempts/);
  });
});
