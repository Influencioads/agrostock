export type ProductLoadResult<T> =
  | { state: 'loading'; product: null }
  | { state: 'not-found'; product: null }
  | { state: 'ready'; product: T };

/** Transactional product pages render API data only and fail closed otherwise. */
export function resolveProductLoad<T>(
  product: T | undefined,
  isLoading: boolean,
  isError: boolean,
): ProductLoadResult<T> {
  if (product !== undefined) return { state: 'ready', product };
  if (isLoading && !isError) return { state: 'loading', product: null };
  return { state: 'not-found', product: null };
}
