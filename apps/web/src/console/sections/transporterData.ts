import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiDriver } from '@agrotraders/api-client';
import { api } from '../../lib/api';

export type Driver = ApiDriver;

/** Driver roster, persisted server-side per transporter via the /drivers API. */
export function useDrivers() {
  const qc = useQueryClient();
  const { data: drivers = [], isLoading } = useQuery<ApiDriver[]>({
    queryKey: ['my-drivers'],
    queryFn: () => api.drivers.mine(),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-drivers'] });

  const addMut = useMutation({
    mutationFn: (d: { name: string; vehicle?: string; ratingPct?: number; onTimePct?: number }) => api.drivers.create(d),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({ mutationFn: (id: string) => api.drivers.remove(id), onSuccess: invalidate });
  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'off' }) => api.drivers.update(id, { status }),
    onSuccess: invalidate,
  });

  return {
    drivers,
    isLoading,
    add: (d: { name: string; vehicle?: string; ratingPct?: number; onTimePct?: number }) => addMut.mutate(d),
    remove: (id: string) => removeMut.mutate(id),
    toggle: (id: string, status: 'active' | 'off') => toggleMut.mutate({ id, status }),
    pending: addMut.isPending || removeMut.isPending || toggleMut.isPending,
  };
}
