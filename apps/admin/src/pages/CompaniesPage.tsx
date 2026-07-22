import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Icon } from '@agrotraders/ui';
import type {
  AdminLoaderCompany,
  AdminLoaderCompanyDetail,
  AdminTransportCompany,
  AdminTransportCompanyDetail,
} from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';
import { HiresPage } from './HiresPage';

type Kind = 'transport' | 'loaders';

// title/subtitle/count labels index i18n keys; translated at render.
const CONFIG = {
  transport: {
    titleKey: 'nav.transport',
    subKey: 'companies.transportSub',
    hiresTitle: 'page.transport.title' as const,
    hiresFilter: ['transporter'] as const,
    countKeys: [
      ['vehicles', 'companies.vehicles'],
      ['routes', 'companies.lanes'],
      ['trips', 'companies.trips'],
      ['drivers', 'companies.drivers'],
    ] as const,
  },
  loaders: {
    titleKey: 'nav.loaders',
    subKey: 'companies.loadersSub',
    hiresTitle: 'page.loaderWorkforce.title' as const,
    hiresFilter: ['loaderco', 'worker'] as const,
    countKeys: [
      ['workers', 'companies.workers'],
      ['teams', 'companies.teams'],
      ['loaderJobsManaged', 'companies.jobs'],
    ] as const,
  },
};

function CompanyDrawer({ kind, id, onClose }: { kind: Kind; id: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery<AdminTransportCompanyDetail | AdminLoaderCompanyDetail>({
    queryKey: ['admin-company', kind, id],
    queryFn: async () => (kind === 'transport' ? await api.admin.transportCompany(id) : await api.admin.loaderCompany(id)),
  });

  const rows = (arr: Record<string, unknown>[] | undefined, render: (r: Record<string, unknown>) => string) =>
    (arr ?? []).slice(0, 30).map((r, i) => (
      <div key={i} className="border-b border-surface-border/60 py-1.5 text-sm text-ink last:border-0">
        {render(r)}
      </div>
    ));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-s border-surface-border bg-surface-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{t('companies.detail')}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x" size={18} />
          </Button>
        </div>
        {isLoading || !data ? (
          <Card className="py-14 text-center text-ink-soft">{t('common:loading')}</Card>
        ) : (
          <div className="space-y-4">
            <Card className="flex items-center gap-3">
              <Avatar name={data.name} size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-ink">{data.name}</div>
                <div className="text-xs text-ink-soft">{data.email}</div>
              </div>
              <Badge tone={data.profile?.listApproved ? 'green' : 'warn'}>
                {data.profile?.listApproved ? t('companies.listed') : t('companies.unlisted')}
              </Badge>
            </Card>

            {kind === 'transport' ? (
              <>
                <Card>
                  <h3 className="mb-2 font-display font-bold text-ink">
                    {t('companies.fleet', { count: (data as AdminTransportCompanyDetail).vehicles.length })}
                  </h3>
                  {rows(
                    (data as AdminTransportCompanyDetail).vehicles,
                    (v) => `${v.plate ?? '—'} · ${v.type ?? ''} · ${v.status ?? ''}`,
                  )}
                </Card>
                <Card>
                  <h3 className="mb-2 font-display font-bold text-ink">
                    {t('companies.lanesN', { count: (data as AdminTransportCompanyDetail).routes.length })}
                  </h3>
                  {rows((data as AdminTransportCompanyDetail).routes, (r) => `${r.name ?? ''}: ${r.fromCity} → ${r.toCity}`)}
                </Card>
                <Card>
                  <h3 className="mb-2 font-display font-bold text-ink">
                    {t('companies.recentTrips', { count: (data as AdminTransportCompanyDetail).trips.length })}
                  </h3>
                  {rows((data as AdminTransportCompanyDetail).trips, (tr) => `${tr.status ?? ''}`)}
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <h3 className="mb-2 font-display font-bold text-ink">
                    {t('companies.crew', { count: (data as AdminLoaderCompanyDetail).workers.length })}
                  </h3>
                  {rows((data as AdminLoaderCompanyDetail).workers, (w) => `${w.name ?? ''} · ${w.skill ?? ''} · ${w.status ?? ''}`)}
                </Card>
                <Card>
                  <h3 className="mb-2 font-display font-bold text-ink">
                    {t('companies.teamsN', { count: (data as AdminLoaderCompanyDetail).teams.length })}
                  </h3>
                  {rows((data as AdminLoaderCompanyDetail).teams, (tm) => `${tm.name ?? ''}`)}
                </Card>
                <Card>
                  <h3 className="mb-2 font-display font-bold text-ink">
                    {t('companies.rateCard', { count: (data as AdminLoaderCompanyDetail).loaderRates.length })}
                  </h3>
                  {rows(
                    (data as AdminLoaderCompanyDetail).loaderRates,
                    (r) => `${r.service ?? ''}: $${((Number(r.rateCents) || 0) / 100).toFixed(2)} / ${r.unit ?? ''}`,
                  )}
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Admin company directory for transport / loaders, with a hire-requests tab. */
export function CompaniesPage({ kind }: { kind: Kind }) {
  const { t } = useI18n();
  const cfg = CONFIG[kind];
  const qc = useQueryClient();
  const [tab, setTab] = useState<'companies' | 'hires'>('companies');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);

  const { data: companies = [], isLoading } = useQuery<(AdminTransportCompany | AdminLoaderCompany)[]>({
    queryKey: ['admin-companies', kind, search],
    queryFn: async () =>
      kind === 'transport' ? await api.admin.transportCompanies(search) : await api.admin.loaderCompanies(search),
    retry: 1,
  });

  const setListing = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      kind === 'transport' ? api.admin.setTransportListing(id, approved) : api.admin.setLoaderListing(id, approved),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-companies', kind] }),
  });

  const counts = (c: AdminTransportCompany | AdminLoaderCompany) => c._count as Record<string, number>;

  return (
    <div>
      <PageHeader title={t(cfg.titleKey)} subtitle={t(cfg.subKey)} action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>} />

      <div className="mb-4 flex gap-2">
        {(['companies', 'hires'] as const).map((tk) => (
          <button
            key={tk}
            onClick={() => setTab(tk)}
            className={
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' +
              (tab === tk ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')
            }
          >
            {tk === 'companies' ? t('companies.tabCompanies') : t('companies.tabHires')}
          </button>
        ))}
      </div>

      {tab === 'hires' ? (
        <HiresPage titleKey={cfg.hiresTitle} filter={[...cfg.hiresFilter]} embedded />
      ) : (
        <Card padded={false}>
          <div className="flex items-center gap-3 border-b border-surface-border p-4">
            <label className="flex items-center gap-2 rounded-md border border-surface-border px-3">
              <Icon name="search" size={16} className="text-ink-soft" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('companies.searchPlaceholder')}
                className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft sm:w-56"
              />
            </label>
          </div>
          {isLoading ? (
            <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('common:loading')}</p>
          ) : companies.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('companies.none')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-3">{t('companies.colCompany')}</th>
                    {cfg.countKeys.map(([, label]) => (
                      <th key={label} className="px-5 py-3">
                        {t(label)}
                      </th>
                    ))}
                    <th className="px-5 py-3">{t('companies.colListing')}</th>
                    <th className="px-5 py-3 text-end">{t('companies.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-b border-surface-border/70 last:border-0 hover:bg-brand-surface/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size={32} />
                          <div>
                            <div className="font-semibold text-ink">{c.name}</div>
                            <div className="text-xs text-ink-soft">{c.country ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      {cfg.countKeys.map(([key]) => (
                        <td key={key} className="px-5 py-3 text-ink-soft">
                          {counts(c)[key] ?? 0}
                        </td>
                      ))}
                      <td className="px-5 py-3">
                        <Badge tone={c.profile?.listApproved ? 'green' : 'warn'}>
                          {c.profile?.listApproved ? t('companies.listed') : t('companies.unlisted')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant={c.profile?.listApproved ? 'outline' : 'primary'}
                            disabled={setListing.isPending}
                            onClick={() => setListing.mutate({ id: c.id, approved: !c.profile?.listApproved })}
                          >
                            {c.profile?.listApproved ? t('companies.unlist') : t('companies.approveListing')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setViewing(c.id)}>
                            {t('bidsAdmin.view')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {viewing && <CompanyDrawer kind={kind} id={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
