interface DemoSeedEnvironment {
  nodeEnv: string | undefined;
  allowDemoSeed: string | undefined;
}

export function assertDemoSeedAllowed({ nodeEnv, allowDemoSeed }: DemoSeedEnvironment): void {
  const normalizedEnv = nodeEnv?.trim().toLowerCase();
  if (normalizedEnv === 'production') {
    throw new Error('Demo seed data must not be loaded in production');
  }
  if (normalizedEnv !== 'development' && normalizedEnv !== 'test') {
    throw new Error('Demo seed data is restricted to development and test environments');
  }
  if (allowDemoSeed !== 'true') {
    throw new Error('Set ALLOW_DEMO_SEED=true to load demo seed data');
  }
}
