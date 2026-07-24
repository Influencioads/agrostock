import { randomBytes } from 'crypto';

/**
 * SEC-02: single source of truth for the JWT signing secrets.
 *
 * In production `assertProductionConfig()` (production-config.ts) fails the boot
 * unless `JWT_SECRET` / `JWT_REFRESH_SECRET` are present, strong, and distinct —
 * so the env branch below is always taken there.
 *
 * The old code fell back to the hardcoded string `'change-me-access-secret'`,
 * which shipped in the repo. If a staging/PM2 host ever ran without
 * `NODE_ENV=production` and forgot the env var, every access, refresh, KYC,
 * invoice and statement token was signed with that public string — a total auth
 * bypass with a forgeable token. We replace it with a per-PROCESS random secret:
 * stable within one process (so sign+verify agree in dev/test) but unknown to
 * anyone outside it, and never a value an attacker could read from source.
 */
let devAccessSecret: string | undefined;
let devRefreshSecret: string | undefined;

export function jwtAccessSecret(): string {
  const env = process.env.JWT_SECRET;
  if (env) return env;
  return (devAccessSecret ??= randomBytes(32).toString('hex'));
}

export function jwtRefreshSecret(): string {
  const env = process.env.JWT_REFRESH_SECRET;
  if (env) return env;
  return (devRefreshSecret ??= randomBytes(32).toString('hex'));
}
