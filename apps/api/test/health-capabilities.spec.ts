import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/health.controller';

describe('HealthController', () => {
  it('reports mobile compatibility capabilities used by release checks', () => {
    const health = new HealthController().health();

    expect(health.capabilities).toMatchObject({
      uploads: true,
      directory: true,
      workers: true,
      roles: ['buyer', 'seller', 'transporter', 'loaderco', 'worker'],
    });
  });
});
