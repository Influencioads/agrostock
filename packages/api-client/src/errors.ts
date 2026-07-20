/**
 * Decoding for the API's error contract:
 *
 *   { statusCode, message, code?, params?, errors? }
 *
 * `code` is a stable key into the `errors` catalog. Throws that predate the contract
 * only carry `message`, so callers must always be able to fall back to it.
 */

export interface ApiFieldError {
  field: string;
  /** class-validator constraint name — the key into the `validation` catalog. */
  constraint: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  params?: Record<string, string | number>;
  message?: string | string[];
  errors?: ApiFieldError[];
}

interface AxiosLike {
  response?: { data?: ApiErrorBody };
}

/** Pulls the error body out of an axios-style rejection. */
export function apiErrorBody(e: unknown): ApiErrorBody {
  return (e as AxiosLike)?.response?.data ?? {};
}

/** The API's English text, joined when the ValidationPipe returns an array. */
export function apiErrorMessage(e: unknown): string | undefined {
  const msg = apiErrorBody(e).message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

/**
 * Resolves a rejection to display text.
 *
 * Prefers the machine-readable `code` so the copy comes from the active locale, and
 * falls back to the API's English `message` for throws not yet on the contract.
 * `translate` should return `undefined`/the key itself when it has no entry.
 */
export function resolveApiError(
  e: unknown,
  translate: (code: string, params?: Record<string, string | number>) => string | undefined,
  fallback: string,
): string {
  const body = apiErrorBody(e);
  if (body.code) {
    const translated = translate(body.code, body.params);
    if (translated && translated !== body.code) return translated;
  }
  return apiErrorMessage(e) ?? fallback;
}
