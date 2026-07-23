import { describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../src/health.controller';

/** F45: readiness must gate on the database; liveness must not. */
describe('health probes (F45)', () => {
  it('liveness is static and never touches the database', async () => {
    const prisma = { $queryRaw: vi.fn() };
    const ctrl = new HealthController(prisma as never);
    expect(ctrl.health().status).toBe('ok');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('readiness reports ready when the database answers', async () => {
    const prisma = { $queryRaw: vi.fn(async () => [{ '?column?': 1 }]) };
    const ctrl = new HealthController(prisma as never);
    const out = await ctrl.ready();
    expect(out.status).toBe('ready');
    expect(out.checks.database).toBe('ok');
  });

  it('readiness returns 503 when the database is unreachable', async () => {
    const prisma = { $queryRaw: vi.fn(async () => { throw new Error('P1001'); }) };
    const ctrl = new HealthController(prisma as never);
    await expect(ctrl.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
