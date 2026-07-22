import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/**
 * City suggestions for a country, searched server-side (`GET /geo/cities`).
 *
 * The dataset is ~134k cities, so it lives on the API rather than in the bundle;
 * the endpoint is public because the signup form needs it before an account
 * exists. Results are cached for the session — city lists do not change.
 */
export function useCityOptions(country?: string | null, q?: string) {
  const { data, isFetching } = useQuery({
    queryKey: ['geo-cities', country ?? '', q ?? ''],
    queryFn: () => api.geo.cities(country!, q || undefined),
    enabled: Boolean(country),
    staleTime: 3600e3,
    retry: 1,
  });
  return { cities: data ?? [], loading: isFetching };
}
