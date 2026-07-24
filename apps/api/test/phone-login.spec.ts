import { describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/auth/auth.service';

/**
 * SEC-06: phone login must match the FULL normalized number, never a substring,
 * and must refuse to resolve when two accounts share a number (never a guess).
 */
function build(rowsByTable: Record<string, { userId: string | null }[]>, user?: unknown) {
  const $queryRawUnsafe = vi.fn(async (sql: string) => {
    const table = sql.includes('"Profile"') ? 'Profile' : 'Worker';
    return rowsByTable[table] ?? [];
  });
  const prisma = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) =>
        where.id && user ? user : null, // email lookup misses; id lookup returns the resolved user
      ),
    },
    $queryRawUnsafe,
  };
  const svc = new AuthService(prisma as never, {} as never, { get: () => undefined } as never);
  return { svc, prisma, $queryRawUnsafe };
}

describe('phone login resolution (SEC-06)', () => {
  it('queries an exact digit match (regexp_replace = $1), not a substring contains', async () => {
    const { svc, $queryRawUnsafe } = build({ Profile: [] });
    await expect(svc.login({ email: '+1 (234) 567-8900', password: 'x' })).rejects.toThrow();
    // Reaches the phone path with normalized digits and an exact-match query.
    const [sql, digits] = $queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('regexp_replace');
    expect(sql).not.toContain('contains');
    expect(digits).toBe('12345678900');
  });

  it('refuses to resolve when two accounts share a normalized number (ambiguous → invalid)', async () => {
    const { svc, prisma } = build({ Profile: [{ userId: 'a' }, { userId: 'b' }] });
    await expect(svc.login({ email: '2345678', password: 'x' })).rejects.toThrow();
    // Ambiguous → resolveLoginUser returns null, so the user is never loaded.
    expect((prisma.user.findUnique as ReturnType<typeof vi.fn>).mock.calls.every(([c]: [{ where: { id?: string } }]) => !c.where.id)).toBe(true);
  });

  it('resolves a unique phone to exactly one user before the password check', async () => {
    const passwordHash = await bcrypt.hash('right', 10);
    const { svc, prisma } = build({ Profile: [{ userId: 'u1' }] }, { id: 'u1', passwordHash, emailVerifiedAt: null });
    // Wrong password still fails, but the user WAS loaded by id → phone resolved to one.
    await expect(svc.login({ email: '2345678', password: 'wrong' })).rejects.toThrow();
    expect((prisma.user.findUnique as ReturnType<typeof vi.fn>).mock.calls.some(([c]: [{ where: { id?: string } }]) => c.where.id === 'u1')).toBe(true);
  });
});
