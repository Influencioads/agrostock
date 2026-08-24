import { resolveApiError } from '@agrotraders/api-client';

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Display text for a rejection from an auth form.
 *
 * 429 and "no response at all" never reach the API's error contract (the
 * throttler and the network answer before Nest does), so they are resolved
 * locally; everything else goes through the `code` catalog. Shared so the pages
 * that mail something — /login, /otp-login, /forgot-password — cannot silently
 * drop a throttled request and leave the visitor staring at an unchanged form.
 */
export function authErrorText(e: unknown, t: Translate): string {
  // Admins are blocked from the public site (AuthContext) — surface that as-is.
  if (e instanceof Error && e.message.includes('admin.agrotraders.org')) return e.message;
  const status = (e as { response?: { status?: number } })?.response?.status;
  if (status === 429) return t('errors:net.rate_limited');
  if (status === undefined) return t('errors:net.offline');
  return resolveApiError(e, (code) => t(`errors:${code}`, { defaultValue: '' }) || undefined, t('errors:unknown'));
}
