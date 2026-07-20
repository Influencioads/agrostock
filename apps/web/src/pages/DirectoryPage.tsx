import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Icon } from '@agrotraders/ui';
import type { ApiDirectoryEntry, ApiMarket, ApiWorkerEntry } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { HireModal, type HireTarget } from '../components/site/HireModal';
import { chatBus } from '../chat/chatBus';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';

export type DirectoryType = 'sellers' | 'transporters' | 'loaders' | 'workers';

// Title/sub are translated at render from `page.directory.<type>`.
const ICON: Record<DirectoryType, 'store' | 'truck' | 'worker' | 'user'> = {
  sellers: 'store',
  transporters: 'truck',
  loaders: 'worker',
  workers: 'user',
};

const HIRE_TYPE: Record<DirectoryType, HireTarget['targetType'] | null> = {
  sellers: null,
  transporters: 'transporter',
  loaders: 'loaderco',
  workers: 'worker',
};

type Entry = (ApiDirectoryEntry | ApiWorkerEntry) & { userId?: string };

function normalize(type: DirectoryType, raw: (ApiDirectoryEntry | ApiWorkerEntry)[]): Entry[] {
  if (type !== 'workers') return raw as Entry[];
  return (raw as ApiWorkerEntry[]).map((w) => ({ ...w, userId: w.user?.id }));
}

export function DirectoryPage({ type }: { type: DirectoryType }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [hire, setHire] = useState<HireTarget | null>(null);
  const icon = ICON[type];

  const country = params.get('country') ?? '';
  const market = params.get('market') ?? '';
  const verified = params.get('verified') === 'true';
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const operatingCountry = params.get('operatingCountry') ?? '';
  const operatingCity = params.get('operatingCity') ?? '';
  const supplyingCountry = params.get('supplyingCountry') ?? '';
  const minDistanceKm = params.get('minDistanceKm') ?? '';
  const minWorkHours = params.get('minWorkHours') ?? '';
  const minLoaders = params.get('minLoaders') ?? '';

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const { data: markets = [] } = useQuery<ApiMarket[]>({ queryKey: ['markets'], queryFn: () => api.markets.list(), staleTime: 3600e3 });

  const num = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);

  const { data: raw = [], isLoading } = useQuery<(ApiDirectoryEntry | ApiWorkerEntry)[]>({
    queryKey: ['directory', type, country, market, verified, search, status, operatingCountry, operatingCity, supplyingCountry, minDistanceKm, minWorkHours, minLoaders],
    queryFn: async () => {
      const q = {
        country: country || undefined,
        market: market || undefined,
        verified: verified || undefined,
        search: search || undefined,
        operatingCountry: operatingCountry || undefined,
        operatingCity: operatingCity || undefined,
        supplyingCountry: supplyingCountry || undefined,
        minWorkHours: num(minWorkHours),
      };
      if (type === 'sellers') return api.directory.sellers(q);
      if (type === 'transporters') return api.directory.transporters({ ...q, minDistanceKm: num(minDistanceKm) });
      if (type === 'loaders') return api.directory.loaders({ ...q, minLoaders: num(minLoaders) });
      return api.directory.workers({ ...q, status: status || undefined });
    },
  });
  const entries = useMemo(() => normalize(type, raw as (ApiDirectoryEntry | ApiWorkerEntry)[]), [type, raw]);

  const countries = useMemo(
    () => Array.from(new Set(entries.map((e) => ('country' in e ? e.country : (e as ApiWorkerEntry).user?.country)).filter(Boolean))) as string[],
    [entries],
  );

  // Distinct tag values across the current results, for the operating/supplying dropdowns.
  const operatingCountryOpts = useMemo(
    () =>
      Array.from(
        new Set(
          entries.flatMap((e) =>
            type === 'workers' ? (e as ApiWorkerEntry).operatingCountries ?? [] : (e as ApiDirectoryEntry).profile?.operatingCountries ?? [],
          ),
        ),
      ).sort(),
    [entries, type],
  );
  const supplyingCountryOpts = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => (e as ApiDirectoryEntry).profile?.supplyingCountries ?? []))).sort(),
    [entries],
  );

  const chatWith = (userId: string | undefined, name: string) => {
    if (!userId) return;
    chatBus.openCommunityDm(userId, name);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-cta">
          <Icon name={icon} size={24} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">{t(`page.directory.${type}.title`)}</h1>
          <p className="text-ink-soft">{t(`page.directory.${type}.sub`)} · {t('page.directory.listed', { count: entries.length })}</p>
        </div>
      </div>

      {/* filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-surface-border bg-white p-3 shadow-card">
        <label className="flex items-center gap-2 rounded-md border border-surface-border px-2.5">
          <Icon name="search" size={15} className="text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setParam('search', e.target.value || null)}
            placeholder={t('page.directory.searchName')}
            className="h-9 w-44 bg-transparent text-sm outline-none placeholder:text-ink-soft"
          />
        </label>
        <select
          value={country}
          onChange={(e) => setParam('country', e.target.value || null)}
          className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
        >
          <option value="">{t('page.directory.allCountries')}</option>
          {countries.map((c) => (
            <option key={c} value={c.replace(/[^\w\s]/g, '').trim()}>{c}</option>
          ))}
        </select>
        {type === 'sellers' && (
          <select
            value={market}
            onChange={(e) => setParam('market', e.target.value || null)}
            className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
          >
            <option value="">{t('page.directory.allMarkets')}</option>
            {markets.map((m) => (
              <option key={m.id} value={m.slug}>{m.flag} {m.name}</option>
            ))}
          </select>
        )}
        {type === 'workers' && (
          <select
            value={status}
            onChange={(e) => setParam('status', e.target.value || null)}
            className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
          >
            <option value="">{t('page.directory.anyAvailability')}</option>
            <option value="available">{t('page.directory.availableNow')}</option>
            <option value="on_site">{t('page.directory.onSite')}</option>
          </select>
        )}

        {/* Operational filters (transporters / loaders / workers). */}
        {type !== 'sellers' && (
          <>
            {operatingCountryOpts.length > 0 && (
              <select
                value={operatingCountry}
                onChange={(e) => setParam('operatingCountry', e.target.value || null)}
                className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
              >
                <option value="">{t('page.directory.anyOperatingCountry')}</option>
                {operatingCountryOpts.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <input
              value={operatingCity}
              onChange={(e) => setParam('operatingCity', e.target.value || null)}
              placeholder={t('page.directory.operatingCity')}
              className="h-9 w-36 rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink outline-none placeholder:text-ink-soft"
            />
          </>
        )}
        {(type === 'transporters' || type === 'loaders') && supplyingCountryOpts.length > 0 && (
          <select
            value={supplyingCountry}
            onChange={(e) => setParam('supplyingCountry', e.target.value || null)}
            className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
          >
            <option value="">{t('page.directory.anySupplyingCountry')}</option>
            {supplyingCountryOpts.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {type === 'transporters' && (
          <input
            type="number"
            min={0}
            value={minDistanceKm}
            onChange={(e) => setParam('minDistanceKm', e.target.value || null)}
            placeholder={t('page.directory.minDistanceKm')}
            className="h-9 w-32 rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink outline-none placeholder:text-ink-soft"
          />
        )}
        {(type === 'loaders' || type === 'workers') && (
          <input
            type="number"
            min={0}
            value={minWorkHours}
            onChange={(e) => setParam('minWorkHours', e.target.value || null)}
            placeholder={t('page.directory.minWorkHours')}
            className="h-9 w-28 rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink outline-none placeholder:text-ink-soft"
          />
        )}
        {type === 'loaders' && (
          <input
            type="number"
            min={0}
            value={minLoaders}
            onChange={(e) => setParam('minLoaders', e.target.value || null)}
            placeholder={t('page.directory.minLoaders')}
            className="h-9 w-28 rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink outline-none placeholder:text-ink-soft"
          />
        )}

        {type !== 'workers' && (
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-surface-border px-3 py-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={verified} onChange={(e) => setParam('verified', e.target.checked ? 'true' : null)} className="accent-[#249653]" />
            {t('page.directory.kycVerified')}
          </label>
        )}
      </div>

      {/* results */}
      {isLoading ? (
        <div className="rounded-lg border border-dashed border-surface-border p-16 text-center text-ink-soft">{t('common:loading')}</div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-16 text-center text-ink-soft">
          {t('page.directory.noMatch')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((e) => {
            const isWorker = type === 'workers';
            const w = e as ApiWorkerEntry;
            const d = e as ApiDirectoryEntry;
            const profile = isWorker ? w.user?.profile : d.profile;
            const entryCountry = isWorker ? w.user?.country : d.country;
            const kyc = isWorker ? w.user?.kycStatus : d.kycStatus;
            const chatUserId = isWorker ? w.user?.id : d.id;
            const hireType = HIRE_TYPE[type];
            const counts = (e._count ?? {}) as Record<string, number>;
            return (
              <div key={e.id} className="flex h-full flex-col rounded-lg border border-surface-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(11,61,46,0.12)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-surface text-2xl">
                    {profile?.avatarEmoji ?? (isWorker ? '👷' : entryCountry?.split(' ')[0] ?? '🏢')}
                  </span>
                  <div className="min-w-0 flex-1">
                    {chatUserId ? (
                      <Link to={`/u/${chatUserId}`} className="block truncate font-display font-bold text-ink hover:text-brand">
                        {e.name}
                      </Link>
                    ) : (
                      <span className="block truncate font-display font-bold text-ink">{e.name}</span>
                    )}
                    <div className="text-xs text-ink-soft">{entryCountry ?? '—'}</div>
                  </div>
                  {kyc === 'verified' && (
                    <Badge tone="green" icon={<Icon name="shield" size={11} />}>{t('page.directory.verified')}</Badge>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  {profile?.market && <Badge tone="mango">{profile.market.flag} {profile.market.name}</Badge>}
                  {profile?.availableFrom && profile?.availableTo && (
                    <Badge tone="slate" icon={<Icon name="clock" size={10} />}>{profile.availableFrom}–{profile.availableTo}</Badge>
                  )}
                  {isWorker && (
                    <>
                      <Badge tone={w.status === 'available' ? 'green' : 'slate'}>{t(`console.dash.workerStatus.${w.status}`, { defaultValue: w.status.replace('_', ' ') })}</Badge>
                      {w.rating && <Badge tone="mango" icon={<Icon name="star" size={10} />}>{w.rating}</Badge>}
                      {w.independent ? <Badge tone="info">{t('page.directory.independent')}</Badge> : w.loaderco && <Badge tone="slate">{w.loaderco.name}</Badge>}
                    </>
                  )}
                </div>

                {profile?.bio && <p className="mt-2 line-clamp-2 text-xs text-ink-soft">{profile.bio}</p>}

                {(() => {
                  const opCountries = isWorker ? w.operatingCountries : d.profile?.operatingCountries;
                  const opCities = isWorker ? w.operatingCities : d.profile?.operatingCities;
                  const supCountries = d.profile?.supplyingCountries;
                  const minHrs = isWorker ? w.minWorkHours : d.profile?.minWorkHours;
                  const minDist = d.profile?.minDistanceKm;
                  const minCrew = d.profile?.minLoaders;
                  const operates = [...(opCities ?? []), ...(opCountries ?? [])];
                  const hasMeta = operates.length || (supCountries?.length ?? 0) || minHrs != null || minDist != null || minCrew != null;
                  if (!hasMeta) return null;
                  return (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      {operates.length > 0 && (
                        <Badge tone="slate" icon={<Icon name="mapPin" size={10} />}>
                          {t('page.directory.operatesIn', { areas: operates.slice(0, 3).join(', ') })}
                        </Badge>
                      )}
                      {(supCountries?.length ?? 0) > 0 && (
                        <Badge tone="info">{t('page.directory.suppliesTo', { areas: supCountries!.slice(0, 3).join(', ') })}</Badge>
                      )}
                      {minDist != null && <Badge tone="mango">{t('page.directory.minDistanceBadge', { km: minDist })}</Badge>}
                      {minHrs != null && <Badge tone="mango">{t('page.directory.minHoursBadge', { hours: minHrs })}</Badge>}
                      {minCrew != null && <Badge tone="mango">{t('page.directory.minLoadersBadge', { count: minCrew })}</Badge>}
                    </div>
                  );
                })()}

                <div className="mt-3 text-xs text-ink-soft">
                  {type === 'sellers' && t('page.directory.sellerStats', { products: counts.products ?? 0, orders: counts.sellerOrders ?? 0 })}
                  {type === 'transporters' && <>{t('page.directory.transporterStats', { vehicles: counts.vehicles ?? 0, trips: counts.trips ?? 0 })}{(d.routes?.length ?? 0) > 0 && <> · {d.routes!.map((r) => r.name).join(', ')}</>}</>}
                  {type === 'loaders' && t('page.directory.loaderStats', { workers: counts.workers ?? 0, teams: counts.teams ?? 0, jobs: counts.loaderJobsManaged ?? 0 })}
                  {type === 'workers' && t('page.directory.workerStats', { jobs: counts.assignments ?? 0 })}
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    leftIcon={<Icon name="message" size={14} />}
                    disabled={!chatUserId || chatUserId === user?.id}
                    onClick={() => chatWith(chatUserId, e.name)}
                  >
                    {t('page.directory.chat')}
                  </Button>
                  {hireType ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      leftIcon={<Icon name="check" size={14} />}
                      disabled={!chatUserId || chatUserId === user?.id}
                      onClick={() => chatUserId && setHire({ targetType: hireType, targetUserId: chatUserId, workerId: isWorker ? w.id : undefined, name: e.name })}
                    >
                      {t('page.directory.hire')}
                    </Button>
                  ) : (
                    chatUserId && (
                      <Link to={`/u/${chatUserId}`} className="flex-1">
                        <Button size="sm" fullWidth leftIcon={<Icon name="bag" size={14} />}>{t('page.directory.products')}</Button>
                      </Link>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hire && <HireModal target={hire} onClose={() => setHire(null)} />}
    </div>
  );
}
