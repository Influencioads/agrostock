import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

function makeService(opts: {
  verify?: () => unknown;
  user?: unknown;
}) {
  const jwt = {
    verifyAsync: vi.fn(async () => {
      if (opts.verify) return opts.verify();
      throw new Error('invalid');
    }),
    signAsync: vi.fn(async () => 'signed.jwt.token'),
  };
  const prisma = { user: { findUnique: vi.fn(async () => opts.user ?? null) } };
  const config = { get: vi.fn(() => undefined) };
  return new AuthService(prisma as never, jwt as never, config as never);
}

describe('AuthService.refresh', () => {
  const validUser = { id: 'u1', email: 'a@b.c', name: 'A', role: 'buyer', country: null, kycStatus: 'pending' };

  it('rejects a token that fails signature verification', async () => {
    const svc = makeService({});
    await expect(svc.refresh('bad')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token that is not a refresh token (wrong typ)', async () => {
    const svc = makeService({ verify: () => ({ sub: 'u1', typ: 'access' }) });
    await expect(svc.refresh('access-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the account no longer exists', async () => {
    const svc = makeService({ verify: () => ({ sub: 'gone', typ: 'refresh' }), user: null });
    await expect(svc.refresh('orphan')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues a fresh token pair for a valid refresh token', async () => {
    const svc = makeService({ verify: () => ({ sub: 'u1', typ: 'refresh' }), user: validUser });
    const out = await svc.refresh('good');
    expect(out.accessToken).toBeTruthy();
    expect(out.refreshToken).toBeTruthy();
    expect(out.user).toMatchObject({ id: 'u1', role: 'buyer' });
    // sanitised user must never leak the password hash
    expect(out.user).not.toHaveProperty('passwordHash');
  });
});
