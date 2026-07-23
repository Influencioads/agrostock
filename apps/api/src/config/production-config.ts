type Environment = Readonly<Record<string, string | undefined>>;

const REQUIRED = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_BUCKET',
  'CORS_ORIGINS',
] as const;

const PLACEHOLDERS = new Set([
  'change-me-access-secret',
  'change-me-refresh-secret',
  'agrostock',
  'agrostock-secret',
  'password',
  'secret',
]);

const localHostname = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '0.0.0.0' ||
  hostname === '::1' ||
  hostname === '[::1]' ||
  hostname.startsWith('127.');

/** Fail startup before Nest creates any providers when production is unsafe. */
export function assertProductionConfig(env: Environment = process.env): void {
  if (env.NODE_ENV !== 'production') return;

  const problems: string[] = [];
  for (const name of REQUIRED) {
    if (!env[name]?.trim()) problems.push(`${name} is required`);
  }

  const access = env.JWT_SECRET?.trim();
  const refresh = env.JWT_REFRESH_SECRET?.trim();
  if (access && (access.length < 32 || PLACEHOLDERS.has(access))) problems.push('JWT_SECRET is insecure');
  if (refresh && (refresh.length < 32 || PLACEHOLDERS.has(refresh))) problems.push('JWT_REFRESH_SECRET is insecure');
  if (access && refresh && access === refresh) problems.push('JWT_SECRET and JWT_REFRESH_SECRET must differ');

  for (const name of ['S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const) {
    const value = env[name]?.trim();
    if (value && PLACEHOLDERS.has(value)) problems.push(`${name} is a placeholder`);
  }

  const origins = env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [];
  if (origins.includes('*')) problems.push('CORS_ORIGINS cannot contain a wildcard');
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'https:' || localHostname(parsed.hostname)) {
        problems.push(`CORS_ORIGINS contains an insecure production origin: ${origin}`);
      }
    } catch {
      problems.push(`CORS_ORIGINS contains an invalid origin: ${origin}`);
    }
  }

  if (env.ENABLE_LEGACY_FINANCIAL_WRITES === '1') {
    problems.push('ENABLE_LEGACY_FINANCIAL_WRITES cannot be enabled in production');
  }

  if (problems.length > 0) {
    throw new Error(`Refusing to start with invalid production configuration: ${problems.join('; ')}`);
  }
}
