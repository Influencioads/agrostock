import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function ServicesPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.admin.serviceProviders(),
  });
  const toggle = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api.admin.updateServiceProvider(id, { published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-services'] }),
  });

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">Service providers</h2>
      <p className="mt-1 text-ink-soft">Review listings, categories, coverage and publication status.</p>
      <div className="mt-5 overflow-x-auto rounded-xl border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-bg">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Services</th>
              <th className="p-3">Cities</th>
              <th className="p-3">Enquiries</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((provider) => (
              <tr key={provider.id} className="border-t">
                <td className="p-3 font-semibold">{provider.companyName}</td>
                <td className="p-3">{provider.categories.join(', ')}</td>
                <td className="p-3">{provider.citiesServed.join(', ')}</td>
                <td className="p-3">{provider._count?.enquiries || 0}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggle.mutate({ id: provider.id, published: !provider.published })}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${provider.published ? 'bg-brand-surface text-brand' : 'bg-surface-bg text-ink-soft'}`}
                  >
                    {provider.published ? 'Published' : 'Hidden'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
