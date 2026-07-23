/**
 * Phase 2 containment (F22): one resolved CORS policy shared by the HTTP app
 * and every WebSocket gateway. Production fails CLOSED — if the allowlist is
 * somehow empty we reflect nothing instead of everything (the production
 * config guard already refuses to boot without CORS_ORIGINS; this is the
 * defense-in-depth layer behind it).
 */
export function resolveCorsOrigins(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string[] | boolean {
  const origins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length) return origins;
  return env.NODE_ENV === 'production' ? false : true;
}
