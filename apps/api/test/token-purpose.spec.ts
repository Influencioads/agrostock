import { describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { WsAuthService } from '../src/realtime/ws-auth.service';
import { purposeSecret } from '../src/auth/token-purpose';

const BASE_SECRET = 'unit-test-base-secret-that-is-long-enough-123456';

const activeUser = {
  id: 'u1',
  email: 'user@example.test',
  role: 'buyer',
  roles: [],
  active: true,
  adminPermissions: [],
};

function prismaWith(user: typeof activeUser | null) {
  return { user: { findUnique: vi.fn(async () => user) } };
}

function strategy(prisma = prismaWith(activeUser)) {
  const config = { get: (key: string) => (key === 'JWT_SECRET' ? BASE_SECRET : undefined) };
  return new JwtStrategy(config as never, prisma as never);
}

describe('token purpose separation (F16)', () => {
  it('derives a distinct key per download purpose, never equal to the base secret', () => {
    const keys = (['invoice_download', 'kyc_download', 'statement_download'] as const).map((p) =>
      purposeSecret(BASE_SECRET, p),
    );
    expect(new Set(keys).size).toBe(3);
    for (const key of keys) expect(key).not.toBe(BASE_SECRET);
  });

  it('accepts an access-purpose payload', async () => {
    const result = await strategy().validate({ sub: 'u1', email: activeUser.email, role: 'buyer', typ: 'access' });
    expect(result.id).toBe('u1');
  });

  it('rejects payloads without an access purpose (legacy and download shapes)', async () => {
    const s = strategy();
    // Legacy access token minted before purposes existed.
    await expect(s.validate({ sub: 'u1', email: activeUser.email, role: 'buyer' })).rejects.toThrow(
      UnauthorizedException,
    );
    // Old-style download token payload (pre-fix these passed as Bearer tokens).
    await expect(
      s.validate({ sub: 'u1', email: activeUser.email, role: 'buyer', typ: 'invoice_download' }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      s.validate({ sub: 'u1', email: activeUser.email, role: 'buyer', typ: 'refresh' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a download token on the WebSocket handshake', async () => {
    // SEC-02: the access secret now comes from process.env (via jwtAccessSecret),
    // not a per-service ConfigService read, so sign+verify against the same value.
    const prevSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = BASE_SECRET;
    try {
      const jwt = new JwtService({});
      const config = { get: (key: string) => (key === 'JWT_SECRET' ? BASE_SECRET : undefined) };
      const ws = new WsAuthService(jwt, config as never, prismaWith(activeUser) as never);

      const access = await jwt.signAsync({ sub: 'u1', email: activeUser.email, role: 'buyer', typ: 'access' }, {
        secret: BASE_SECRET,
        expiresIn: '5m',
      });
      await expect(ws.verify(`Bearer ${access}`)).resolves.toMatchObject({ id: 'u1' });

      // A download token signed with the OLD shared secret must no longer work.
      const oldDownload = await jwt.signAsync({ inv: 'i1', sub: 'u1' }, { secret: BASE_SECRET, expiresIn: '5m' });
      await expect(ws.verify(`Bearer ${oldDownload}`)).rejects.toThrow(UnauthorizedException);
    } finally {
      if (prevSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prevSecret;
    }
  });

  it('rejects a purpose-keyed download token against the access secret entirely', async () => {
    const jwt = new JwtService({});
    const download = await jwt.signAsync(
      { inv: 'i1', sub: 'u1', typ: 'invoice_download' },
      { secret: purposeSecret(BASE_SECRET, 'invoice_download'), expiresIn: '5m' },
    );
    // Signature verification itself fails: the signing keys are disjoint.
    await expect(jwt.verifyAsync(download, { secret: BASE_SECRET })).rejects.toThrow();
  });
});
