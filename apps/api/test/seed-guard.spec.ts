import { describe, expect, it } from 'vitest';
import { assertDemoSeedAllowed } from '../prisma/seed-guard';

describe('assertDemoSeedAllowed', () => {
  it.each(['production', ' PRODUCTION '])('rejects demo seeding in %s', (nodeEnv) => {
    expect(() => assertDemoSeedAllowed({ nodeEnv, allowDemoSeed: 'true' })).toThrow(
      'Demo seed data must not be loaded in production',
    );
  });

  it.each([undefined, 'staging'])('rejects non-development environments such as %s', (nodeEnv) => {
    expect(() => assertDemoSeedAllowed({ nodeEnv, allowDemoSeed: 'true' })).toThrow(
      'Demo seed data is restricted to development and test environments',
    );
  });

  it.each([undefined, 'false', '1'])('requires explicit opt-in when ALLOW_DEMO_SEED is %s', (allowDemoSeed) => {
    expect(() => assertDemoSeedAllowed({ nodeEnv: 'development', allowDemoSeed })).toThrow(
      'Set ALLOW_DEMO_SEED=true to load demo seed data',
    );
  });

  it.each(['development', 'test'])('allows explicitly opted-in seeding in %s', (nodeEnv) => {
    expect(() => assertDemoSeedAllowed({ nodeEnv, allowDemoSeed: 'true' })).not.toThrow();
  });
});
