import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuth } from '../auth/AuthContext';

/**
 * F02: shared wishlist state for the web client. Exposes the set of saved
 * product ids and an idempotent toggle, so the product-card heart is a real
 * add/remove control instead of a dead icon. Wishlist is per-user, so it is
 * only fetched when signed in; the toggle no-ops (returns false) for guests so
 * callers can prompt a sign-in instead.
 */
export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: ids = [] } = useQuery<string[]>({
    queryKey: ['wishlist-ids'],
    queryFn: () => api.wishlist.ids(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const savedIds = new Set(ids);

  const mutation = useMutation({
    mutationFn: ({ id, save }: { id: string; save: boolean }) =>
      save ? api.wishlist.add(id) : api.wishlist.remove(id),
    // Optimistic: flip the id in the cache immediately, roll back on failure.
    onMutate: async ({ id, save }) => {
      await qc.cancelQueries({ queryKey: ['wishlist-ids'] });
      const prev = qc.getQueryData<string[]>(['wishlist-ids']) ?? [];
      qc.setQueryData<string[]>(['wishlist-ids'], save ? [...prev, id] : prev.filter((x) => x !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['wishlist-ids'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['wishlist-ids'] });
      qc.invalidateQueries({ queryKey: ['wishlist-products'] });
    },
  });

  return {
    /** Whether the current user is able to save (i.e. is signed in). */
    canSave: !!user,
    isSaved: (id: string) => savedIds.has(id),
    /** Toggle a product's saved state. Returns false (no-op) for guests. */
    toggle: (id: string) => {
      if (!user) return false;
      mutation.mutate({ id, save: !savedIds.has(id) });
      return true;
    },
  };
}
