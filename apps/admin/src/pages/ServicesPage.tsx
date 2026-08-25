import { useQuery } from '@tanstack/react-query';
import type { ApiServiceProvider } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { useI18n } from '../i18n';
import { HiresPage } from './HiresPage';

export function ServicesPage() {
  const { t } = useI18n();
  const { data = [] } = useQuery<ApiServiceProvider[]>({
    queryKey: ['admin-services'],
    queryFn: () => api.services.providers(),
  });

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">{t('svcAdmin.title')}</h2>
      <p className="mt-1 text-ink-soft">{t('svcAdmin.sub')}</p>
      <div className="mt-5 overflow-x-auto rounded-xl border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-bg">
            <tr>
              <th className="p-3">{t('svcAdmin.company')}</th>
              <th className="p-3">{t('svcAdmin.services')}</th>
              <th className="p-3">{t('svcAdmin.cities')}</th>
              <th className="p-3">{t('svcAdmin.enquiries')}</th>
              <th className="p-3">{t('svcAdmin.status')}</th>
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
                  <span className="rounded-full bg-brand-surface px-3 py-1 text-xs font-bold text-brand">
                    {t('svcAdmin.listed')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Service enquiries were reachable from no admin page at all: the hire feed
          is only mounted under /transport and /loaders, both filtered to their own
          target types. A dispute over a quoted service had nothing to read. */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-extrabold">{t('svcAdmin.hiresTitle')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('svcAdmin.hiresSub')}</p>
        <div className="mt-4">
          <HiresPage filter={['service_provider']} embedded />
        </div>
      </div>
    </div>
  );
}
