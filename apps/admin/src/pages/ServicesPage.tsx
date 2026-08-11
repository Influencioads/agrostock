import { useQuery } from '@tanstack/react-query';
import type { ApiServiceProvider } from '@agrotraders/api-client';
import { api } from '../lib/api';

export function ServicesPage() {
  const { data = [] } = useQuery<ApiServiceProvider[]>({
    queryKey: ['admin-services'],
    queryFn: () => api.services.providers(),
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
                <td className="p-3">—</td>
                <td className="p-3">
                  <span className="rounded-full bg-brand-surface px-3 py-1 text-xs font-bold text-brand">Listed</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
