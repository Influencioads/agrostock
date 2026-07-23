export function assertDemoSeedAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv?.trim().toLowerCase() === 'production') {
    throw new Error('Demo seed data must not be loaded in production');
  }
}
