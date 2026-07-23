import { describe, expect, it } from 'vitest';
import { assertDemoSeedAllowed } from '../prisma/seed-guard';

describe('assertDemoSeedAllowed', () => {
  it.each(['production', ' PRODUCTION '])('rejects demo seeding in %s', (nodeEnv) => {
    expect(() => assertDemoSeedAllowed(nodeEnv)).toThrow('Demo seed data must not be loaded in production');
  });

  it.each([undefined, 'development', 'test'])('allows demo seeding in %s', (nodeEnv) => {
    expect(() => assertDemoSeedAllowed(nodeEnv)).not.toThrow();
  });
});
