import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';

const WINDOW_MS = 15 * 60 * 1000;
const MAX = 5;

interface Row {
  id: string;
  userId: string;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * In-memory token table honouring the count / updateMany / deleteMany / create
 * calls the mailing endpoints make, so we can drive the per-account limiter.
 */
function tokenTable() {
  const rows: Row[] = [];
  return {
    rows,
    count: vi.fn(async ({ where }: { where: { userId: string; createdAt?: { gt: Date } } }) =>
      rows.filter(
        (r) => r.userId === where.userId && (!where.createdAt || r.createdAt > where.createdAt.gt),
      ).length,
    ),
    updateMany: vi.fn(async ({ where, data }: { where: { userId: string; usedAt: null }; data: { usedAt: Date } }) => {
      let count = 0;
      for (const r of rows) {
        if (r.userId === where.userId && r.usedAt === null) {
          r.usedAt = data.usedAt;
          count++;
        }
      }
      return { count };
    }),
    deleteMany: vi.fn(async ({ where }: { where: { userId: string; createdAt?: { lt: Date } } }) => {
      let count = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        if (r.userId === where.userId && (!where.createdAt || r.createdAt < where.createdAt.lt)) {
          rows.splice(i, 1);
          count++;
        }
      }
      return { count };
    }),
    create: vi.fn(async ({ data }: { data: { userId: string } }) => {
      const row: Row = { id: `t${rows.length + 1}`, userId: data.userId, usedAt: null, createdAt: new Date() };
      rows.push(row);
      return row;
    }),
    findFirst: vi.fn(async () => null),
    findUnique: vi.fn(async () => null),
  };
}

function build() {
  const otp = tokenTable();
  const reset = tokenTable();
  const verify = tokenTable();
  const prisma = {
    user: { findUnique: vi.fn(async () => ({ id: 'u1', email: 'v@x.test', name: 'V', emailVerifiedAt: null })) },
    loginOtpToken: otp,
    passwordResetToken: reset,
    emailVerificationToken: verify,
    // $transaction runs the array of already-issued promises (Prisma batch form).
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const jwt = { signAsync: vi.fn(async () => 'signed'), verifyAsync: vi.fn() };
  const config = { get: vi.fn(() => undefined) };
  const mail = {
    enabled: true,
    sendLoginOtp: vi.fn(),
    sendPasswordReset: vi.fn(),
    sendVerificationEmail: vi.fn(),
  };
  const svc = new AuthService(prisma as never, jwt as never, config as never, mail as never);
  return { svc, otp, reset, verify, mail };
}

describe('per-account mail rate limiting (F37)', () => {
  it('login OTP: stops sending after the per-account cap within the window', async () => {
    const { svc, otp, mail } = build();
    for (let i = 0; i < MAX; i++) await svc.requestLoginOtp('v@x.test');
    expect(mail.sendLoginOtp).toHaveBeenCalledTimes(MAX);
    // Over the cap: still resolves ok, but no new code is created or emailed.
    await svc.requestLoginOtp('v@x.test');
    await svc.requestLoginOtp('v@x.test');
    expect(mail.sendLoginOtp).toHaveBeenCalledTimes(MAX);
    // Rows created never exceeds the cap within the window.
    expect(otp.create).toHaveBeenCalledTimes(MAX);
  });

  it('login OTP: only the newest code stays unused (older ones are superseded)', async () => {
    const { svc, otp } = build();
    await svc.requestLoginOtp('v@x.test');
    await svc.requestLoginOtp('v@x.test');
    const unused = otp.rows.filter((r) => r.usedAt === null);
    expect(unused).toHaveLength(1);
  });

  it('password reset: stops sending after the per-account cap', async () => {
    const { svc, mail } = build();
    for (let i = 0; i < MAX + 3; i++) await svc.forgotPassword('v@x.test');
    expect(mail.sendPasswordReset).toHaveBeenCalledTimes(MAX);
  });

  it('verification resend: stops sending after the per-account cap', async () => {
    const { svc, mail } = build();
    for (let i = 0; i < MAX + 3; i++) await svc.resendVerification('v@x.test');
    expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(MAX);
  });

  it('a fresh account (empty window) is always allowed', async () => {
    const { svc, mail } = build();
    await svc.requestLoginOtp('v@x.test');
    expect(mail.sendLoginOtp).toHaveBeenCalledTimes(1);
    void WINDOW_MS;
  });
});
