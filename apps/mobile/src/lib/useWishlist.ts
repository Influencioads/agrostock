import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuth } from '../auth/AuthProvider';

/**
 * F02: shared wishlist state for the mobile client — mirrors the web hook.
 * Exposes the saved product-id set and an idempotent optimistic toggle so the
 * product-card heart is a real add/remove control. Wishlist is per-user, so it
 * is only fetched when signed in.
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
