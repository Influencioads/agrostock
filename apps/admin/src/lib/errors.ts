/**
 * Pull a human-readable message out of an axios-style API error.
 * `fallback` is the localized generic message — pass `t('genericError')`
 * from the render site so no English is baked in at module scope.
 */
export function errMessage(e: unknown, fallback: string): string {
  const anyErr = e as { response?: { data?: { message?: string | string[] } } };
  const msg = anyErr?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}
