import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

interface SessionRow {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  device: string | null;
  ip: string | null;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
}

/**
 * In-memory RefreshSession store that honours the two conditional writes the
 * service relies on: unique tokenHash rotation and family revocation.
 */
function sessionStore(initial: SessionRow[] = []) {
  const rows = [...initial];
  return {
    rows,
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => rows.find((r) => r.id === id) ?? null),
    create: vi.fn(async ({ data }: { data: Partial<SessionRow> }) => {
      const row: SessionRow = {
        id: `sess_${rows.length + 1}`,
        userId: data.userId!,
        familyId: data.familyId!,
        tokenHash: data.tokenHash!,
        device: data.device ?? null,
        ip: data.ip ?? null,
        expiresAt: data.expiresAt!,
        lastUsedAt: new Date(),
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date(),
      };
      rows.push(row);
      return row;
    }),
    updateMany: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id?: string; familyId?: string; userId?: string; tokenHash?: string; revokedAt?: null };
        data: Partial<SessionRow>;
      }) => {
        let count = 0;
        for (const r of rows) {
          if (where.id && r.id !== where.id) continue;
          if (where.familyId && r.familyId !== where.familyId) continue;
          if (where.userId && r.userId !== where.userId) continue;
          if (where.tokenHash && r.tokenHash !== where.tokenHash) continue;
          if (where.revokedAt === null && r.revokedAt !== null) continue;
          Object.assign(r, data);
          count++;
        }
        return { count };
      },
    ),
    findMany: vi.fn(async () => rows.filter((r) => !r.revokedAt)),
  };
}

function makeService(opts: {
  verify?: () => unknown;
  user?: unknown;
  sessions?: ReturnType<typeof sessionStore>;
}) {
  const store = opts.sessions ?? sessionStore();
  let signCount = 0;
  const jwt = {
    verifyAsync: vi.fn(async () => {
      if (opts.verify) return opts.verify();
      throw new Error('invalid');
    }),
    signAsync: vi.fn(async () => `signed.${signCount++}`),
  };
  const prisma = {
    user: { findUnique: vi.fn(async () => opts.user ?? null) },
    refreshSession: store,
  };
  const config = { get: vi.fn(() => undefined) };
  const svc = new AuthService(prisma as never, jwt as never, config as never);
  return { svc, store, jwt };
}

const validUser = { id: 'u1', email: 'a@b.c', name: 'A', role: 'buyer', active: true, country: null, kycStatus: 'pending' };

function seedSession(jti: string, over: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 'sess_1',
    userId: 'u1',
    familyId: 'fam_1',
    tokenHash: sha256(jti),
    device: null,
    ip: null,
    expiresAt: new Date(Date.now() + 60_000),
    lastUsedAt: new Date(),
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date(),
    ...over,
  };
}

describe('AuthService.refresh (F39 session families)', () => {
  it('rejects a token that fails signature verification', async () => {
    const { svc } = makeService({});
    await expect(svc.refresh('bad')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an access token presented as a refresh token', async () => {
    const { svc } = makeService({ verify: () => ({ sub: 'u1', typ: 'access' }) });
    await expect(svc.refresh('access-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a refresh token with no session id', async () => {
    const { svc } = makeService({ verify: () => ({ sub: 'u1', typ: 'refresh', jti: 'x' }) });
    await expect(svc.refresh('legacy')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the session does not exist', async () => {
    const { svc } = makeService({ verify: () => ({ sub: 'u1', typ: 'refresh', sid: 'nope', jti: 'x' }) });
    await expect(svc.refresh('ghost')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a revoked session', async () => {
    const store = sessionStore([seedSession('jti1', { revokedAt: new Date(), revokedReason: 'logout' })]);
    const { svc } = makeService({ verify: () => ({ sub: 'u1', typ: 'refresh', sid: 'sess_1', jti: 'jti1' }), user: validUser, sessions: store });
    await expect(svc.refresh('revoked')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired session', async () => {
    const store = sessionStore([seedSession('jti1', { expiresAt: new Date(Date.now() - 1000) })]);
    const { svc } = makeService({ verify: () => ({ sub: 'u1', typ: 'refresh', sid: 'sess_1', jti: 'jti1' }), user: validUser, sessions: store });
    await expect(svc.refresh('expired')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates the session and issues a fresh pair for a valid token', async () => {
    const store = sessionStore([seedSession('jti1')]);
    const before = store.rows[0].tokenHash;
    const { svc } = makeService({ verify: () => ({ sub: 'u1', typ: 'refresh', sid: 'sess_1', jti: 'jti1' }), user: validUser, sessions: store });
    const out = await svc.refresh('good');
    expect(out.accessToken).toBeTruthy();
    expect(out.refreshToken).toBeTruthy();
    expect(out.user).not.toHaveProperty('passwordHash');
    // tokenHash rotated to a new value; session still live.
    expect(store.rows[0].tokenHash).not.toBe(before);
    expect(store.rows[0].revokedAt).toBeNull();
  });

  it('treats replay of a superseded token as reuse and revokes the whole family', async () => {
    // Session already rotated to jti2; presenting the old jti1 is a replay.
    const store = sessionStore([
      seedSession('jti2', { id: 'sess_1', familyId: 'fam_1' }),
      seedSession('other', { id: 'sess_2', familyId: 'fam_1', tokenHash: sha256('other') }),
    ]);
    const { svc } = makeService({ verify: () => ({ sub: 'u1', typ: 'refresh', sid: 'sess_1', jti: 'jti1' }), user: validUser, sessions: store });
    await expect(svc.refresh('replayed')).rejects.toBeInstanceOf(UnauthorizedException);
    // Every session in the family is now revoked.
    expect(store.rows.every((r) => r.revokedAt !== null)).toBe(true);
    expect(store.rows.every((r) => r.revokedReason === 'replay_detected')).toBe(true);
  });

  it('rejects refresh for a deactivated account', async () => {
    const store = sessionStore([seedSession('jti1')]);
    const { svc } = makeService({
      verify: () => ({ sub: 'u1', typ: 'refresh', sid: 'sess_1', jti: 'jti1' }),
      user: { ...validUser, active: false },
      sessions: store,
    });
    await expect(svc.refresh('disabled')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService logout / logout-all (F39)', () => {
  it('logout revokes only the presented session', async () => {
    const store = sessionStore([
      seedSession('jti1', { id: 'sess_1' }),
      seedSession('jti2', { id: 'sess_2', tokenHash: sha256('jti2') }),
    ]);
    const { svc } = makeService({ verify: () => ({ typ: 'refresh', sid: 'sess_1' }), sessions: store });
    await svc.logout('tok');
    expect(store.rows.find((r) => r.id === 'sess_1')?.revokedAt).not.toBeNull();
    expect(store.rows.find((r) => r.id === 'sess_2')?.revokedAt).toBeNull();
  });

  it('logout is idempotent for an unparseable token', async () => {
    const { svc } = makeService({});
    await expect(svc.logout('garbage')).resolves.toEqual({ ok: true });
  });

  it('logout-all revokes every live session for the user', async () => {
    const store = sessionStore([
      seedSession('jti1', { id: 'sess_1' }),
      seedSession('jti2', { id: 'sess_2', tokenHash: sha256('jti2') }),
    ]);
    const { svc } = makeService({ sessions: store });
    await svc.logoutAll('u1');
    expect(store.rows.every((r) => r.revokedAt !== null)).toBe(true);
  });
});
