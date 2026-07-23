import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const baseUser = {
  id: 'u1',
  email: 'user@example.test',
  name: 'User',
  role: 'buyer',
  roles: [],
  adminPermissions: [],
  country: null,
  kycStatus: 'pending',
  emailVerifiedAt: null,
};

/**
 * Builds an AuthService whose token tables enforce conditional consumption the
 * way PostgreSQL does: `updateMany({ where: { usedAt: null } })` returns
 * `count: 1` for the first caller and `count: 0` for every later one.
 */
function build(opts: { token: string }) {
  let used = false;
  const record = {
    id: 't1',
    userId: 'u1',
    tokenHash: sha256(opts.token),
    codeHash: sha256(opts.token),
    attempts: 0,
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { ...baseUser },
  };
  const consume = vi.fn(async ({ where }: { where: { usedAt: null } }) => {
    void where;
    if (used) return { count: 0 };
    used = true;
    return { count: 1 };
  });
  const tokenTable = {
    findUnique: vi.fn(async () => ({ ...record })),
    findFirst: vi.fn(async () => ({ ...record })),
    update: vi.fn(async () => ({ ...record })),
    updateMany: consume,
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };
  const prisma = {
    emailVerificationToken: tokenTable,
    passwordResetToken: tokenTable,
    loginOtpToken: tokenTable,
    user: {
      findUnique: vi.fn(async () => ({ ...baseUser })),
      update: vi.fn(async () => ({ ...baseUser, emailVerifiedAt: new Date() })),
    },
  };
  const jwt = { signAsync: vi.fn(async () => 'signed'), verifyAsync: vi.fn() };
  const config = { get: vi.fn(() => undefined) };
  const mail = { enabled: true, sendWelcome: vi.fn(), sendVerificationEmail: vi.fn() };
  const svc = new AuthService(prisma as never, jwt as never, config as never, mail as never);
  return { svc, consume };
}

describe('one-shot token consumption (F23)', () => {
  it('verifyEmail: exactly one of two racing requests wins', async () => {
    const { svc, consume } = build({ token: 'tok-verify' });
    const first = await svc.verifyEmail('tok-verify');
    expect(first.user.id).toBe('u1');
    await expect(svc.verifyEmail('tok-verify')).rejects.toThrow();
    expect(consume).toHaveBeenCalledTimes(2);
    // The winning consume was conditional on the token being unused.
    expect(consume.mock.calls[0][0].where).toMatchObject({ id: 't1', usedAt: null });
  });

  it('resetPassword: a replayed reset link loses', async () => {
    const { svc } = build({ token: 'tok-reset' });
    await svc.resetPassword('tok-reset', 'new-password-123');
    await expect(svc.resetPassword('tok-reset', 'other-password-456')).rejects.toThrow();
  });

  it('verifyLoginOtp: the same code from two devices signs in once', async () => {
    const { svc } = build({ token: '123456' });
    const first = await svc.verifyLoginOtp('user@example.test', '123456');
    expect(first.user.id).toBe('u1');
    await expect(svc.verifyLoginOtp('user@example.test', '123456')).rejects.toThrow();
  });
});
