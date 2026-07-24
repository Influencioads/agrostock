export type ProductLoadResult<T> =
  | { state: 'loading'; product: null }
  | { state: 'error'; product: null }
  | { state: 'not-found'; product: null }
  | { state: 'ready'; product: T };

/**
 * Transactional product pages render API data only and fail closed otherwise.
 * F28: a request failure (`isError`) is reported as its own `error` state so the
 * page can offer a retry instead of showing the same copy as a genuine 404.
 */
export function resolveProductLoad<T>(
  product: T | undefined,
  isLoading: boolean,
  isError: boolean,
): ProductLoadResult<T> {
  if (product !== undefined) return { state: 'ready', product };
  if (isError) return { state: 'error', product: null };
  if (isLoading) return { state: 'loading', product: null };
  return { state: 'not-found', product: null };
}
