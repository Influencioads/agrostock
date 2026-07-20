import { resolveApiError } from '@agrotraders/api-client';
import { useI18n } from '../i18n';

/**
 * Turns an API rejection into display text in the active locale.
 *
 * Prefers the response's machine-readable `code` (translated from the `errors` catalog)
 * and falls back to the API's English `message` for throws not yet on the code contract.
 * For non-component code use `errMessage` in `./format`, which never translates.
 */
export function useApiError(): (e: unknown, fallback: string) => string {
  const { t } = useI18n();
  return (e, fallback) =>
    resolveApiError(e, (code, params) => t(`errors:${code}`, { ...params, defaultValue: '' }) || undefined, fallback);
}
