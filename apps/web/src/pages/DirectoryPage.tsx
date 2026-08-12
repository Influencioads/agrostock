import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Icon } from '@agrotraders/ui';
import { ALL_COUNTRIES, countryLabel } from '@agrotraders/geo';
import type { ApiDirectoryEntry, ApiMarket, ApiWorkerEntry } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { HireModal, type HireTarget } from '../components/site/HireModal';
import { CityTagInput } from '../components/GeoInputs';
import {
  ActiveFilterChips,
  FilterCheckbox,
  FilterGroup,
  FilterOptionList,
  FilterPanel,
  type FilterChip,
  type FilterOption,
} from '../components/site/FilterPanel';
import { useFilterParams } from '../lib/filterParams';
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

/** Worker availability — a checkbox group, so several states OR together. */
const WORKER_STATUSES = ['available', 'on_site', 'off'] as const;

type Entry = (ApiDirectoryEntry | ApiWorkerEntry) & { userId?: string };

function locationLabel(city: string | null | undefined, country: string | null | undefined): string {
  const place = city?.trim();
  const nation = country?.trim();
  if (place && nation && place.toLocaleLowerCase().includes(nation.toLocaleLowerCase())) return place;
  return [place, nation].filter(Boolean).join(', ') || '—';
}

function normalize(type: DirectoryType, raw: (ApiDirectoryEntry | ApiWorkerEntry)[]): Entry[] {
  if (type !== 'workers') return raw as Entry[];
  return (raw as ApiWorkerEntry[]).map((w) => ({ ...w, userId: w.user?.id }));
}

/**
 * The provider directories — sellers, transporters (their fleets), loader crews
 * and individual workers.
 *
 * Shares the marketplace's left-hand checkbox panel: the filters here were a
 * row of single-choice `<select>`s, so "transporters operating in India OR
 * Turkey" — the ordinary question when you are sourcing a route — could not be
 * asked at all. Every facet is now multi-select, chipped and instant.
 */
export function DirectoryPage({ type }: { type: DirectoryType }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { values, value, has, toggle, setValues, setValue, clearAll, activeCount } = useFilterParams();
  const [hire, setHire] = useState<HireTarget | null>(null);
  const icon = ICON[type];

  const countries = values('country');
  const marketSlugs = values('market');
  const statuses = values('status');
  const operatingCountries = values('operatingCountry');
  const operatingCities = values('operatingCity');
  const supplyingCountries = values('supplyingCountry');
  const verified = has('verified', 'true');
  const search = value('search');
  const minDistanceKm = value('minDistanceKm');
  const minWorkHours = value('minWorkHours');
  const minLoaders = value('minLoaders');

  const { data: markets = [] } = useQuery<ApiMarket[]>({ queryKey: ['markets'], queryFn: () => api.markets.list(), staleTime: 3600e3 });

  const num = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);

  const { data: raw = [], isLoading } = useQuery<(ApiDirectoryEntry | ApiWorkerEntry)[]>({
    queryKey: [
      'directory', type, countries, marketSlugs, verified, search, statuses,
      operatingCountries, operatingCities, supplyingCountries, minDistanceKm, minWorkHours, minLoaders,
    ],
    queryFn: async () => {
      const q = {
        country: countries.length ? countries : undefined,
        market: marketSlugs.length ? marketSlugs : undefined,
        verified: verified || undefined,
        search: search || undefined,
        operatingCountry: operatingCountries.length ? operatingCountries : undefined,
        operatingCity: operatingCities.length ? operatingCities : undefined,
        supplyingCountry: supplyingCountries.length ? supplyingCountries : undefined,
        minWorkHours: num(minWorkHours),
      };
      if (type === 'sellers') return api.directory.sellers(q);
      if (type === 'transporters') return api.directory.transporters({ ...q, minDistanceKm: num(minDistanceKm) });
      if (type === 'loaders') return api.directory.loaders({ ...q, minLoaders: num(minLoaders) });
      return api.directory.workers({ ...q, status: statuses.length ? statuses : undefined });
    },
  });
  const entries = useMemo(() => normalize(type, raw as (ApiDirectoryEntry | ApiWorkerEntry)[]), [type, raw]);

  // Every country, not just the ones the current results happen to cover —
  // an empty result set used to leave the filter with nothing to pick.
  const countryOptions: FilterOption[] = useMemo(
    () => ALL_COUNTRIES.map((c) => ({ value: c.name, label: countryLabel(c.name, lang), emoji: c.flag })),
    [lang],
  );
  const marketOptions: FilterOption[] = useMemo(
    () => markets.map((m) => ({ value: m.slug, label: m.name, emoji: m.flag ?? undefined, hint: m.city ?? undefined })),
    [markets],
  );
  const statusLabel = (v: string) =>
    v === 'available' ? t('page.directory.availableNow') : v === 'on_site' ? t('page.directory.onSite') : t('page.directory.workerOff');
  const marketName = (slug: string) => markets.find((m) => m.slug === slug)?.name ?? slug;

  const chips: FilterChip[] = useMemo(() => {
    const out: FilterChip[] = [];
    const pushAll = (key: string, selected: string[], tone: FilterChip['tone'], label: (v: string) => string) => {
      for (const v of selected) out.push({ key: `${key}:${v}`, label: label(v), tone, onRemove: () => toggle(key, v) });
    };
    if (search.trim()) {
      out.push({ key: 'search', label: `“${search.trim()}”`, tone: 'slate', onRemove: () => setValue('search', null) });
    }
    pushAll('country', countries, 'mango', (c) => countryLabel(c, lang));
    pushAll('market', marketSlugs, 'mango', marketName);
    pushAll('status', statuses, 'green', statusLabel);
    pushAll('operatingCountry', operatingCountries, 'slate', (c) => t('page.directory.operatesIn', { areas: countryLabel(c, lang) }));
    pushAll('operatingCity', operatingCities, 'slate', (c) => t('page.directory.operatesIn', { areas: c }));
    pushAll('supplyingCountry', supplyingCountries, 'slate', (c) => t('page.directory.suppliesTo', { areas: countryLabel(c, lang) }));
    if (minDistanceKm) {
      out.push({ key: 'minDistanceKm', label: t('page.directory.minDistanceBadge', { km: minDistanceKm }), tone: 'mango', onRemove: () => setValue('minDistanceKm', null) });
    }
    if (minWorkHours) {
      out.push({ key: 'minWorkHours', label: t('page.directory.minHoursBadge', { hours: minWorkHours }), tone: 'mango', onRemove: () => setValue('minWorkHours', null) });
    }
    if (minLoaders) {
      out.push({ key: 'minLoaders', label: t('page.directory.minLoadersBadge', { count: Number(minLoaders) || 0 }), tone: 'mango', onRemove: () => setValue('minLoaders', null) });
    }
    if (verified) {
      out.push({ key: 'verified', label: t('page.directory.kycVerified'), tone: 'green', onRemove: () => setValue('verified', null) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, countries, marketSlugs, markets, statuses, operatingCountries, operatingCities, supplyingCountries, minDistanceKm, minWorkHours, minLoaders, verified, lang, t, toggle, setValue]);

  const chatWith = (userId: string | undefined, name: string) => {
    if (!userId) return;
    chatBus.openCommunityDm(userId, name);
  };

  const numberFieldCls = 'h-9 w-full rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink outline-none placeholder:text-ink-soft';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-cta">
          <Icon name={icon} size={24} />
        </span>
        <div className="min-w-0">
          <h1 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t(`page.directory.${type}.title`)}</h1>
          <p className="text-ink-soft">{t(`page.directory.${type}.sub`)} · {t('page.directory.listed', { count: entries.length })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <FilterPanel id="directory-filters" activeCount={activeCount} onClearAll={clearAll}>
          <label className="mb-3 flex items-center gap-2 rounded-md border border-surface-border px-2.5">
            <Icon name="search" size={15} className="shrink-0 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setValue('search', e.target.value || null)}
              placeholder={t('page.directory.searchName')}
              aria-label={t('page.directory.searchLabel')}
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft"
            />
          </label>

          <FilterGroup title={t('page.directory.country')} selectedCount={countries.length}>
            <FilterOptionList
              options={countryOptions}
              selected={countries}
              onToggle={(c) => toggle('country', c)}
              searchable
              searchPlaceholder={t('page.market.searchCountries')}
            />
          </FilterGroup>

          {type === 'sellers' && (
            <FilterGroup title={t('page.directory.marketLabel')} selectedCount={marketSlugs.length} defaultOpen={false}>
              <FilterOptionList
                options={marketOptions}
                selected={marketSlugs}
                onToggle={(slug) => toggle('market', slug)}
                searchable={marketOptions.length > 8}
                searchPlaceholder={t('page.market.searchMarkets')}
              />
            </FilterGroup>
          )}

          {type === 'workers' && (
            <FilterGroup title={t('page.directory.availability')} selectedCount={statuses.length}>
              {WORKER_STATUSES.map((s) => (
                <FilterCheckbox
                  key={s}
                  checked={statuses.includes(s)}
                  onChange={() => toggle('status', s)}
                  label={statusLabel(s)}
                />
              ))}
            </FilterGroup>
          )}

          {/* Operational reach — where a provider actually works, as opposed to
              where it is registered. This is the question a buyer sourcing a
              route asks, and it needed both legs at once. */}
          {type !== 'sellers' && (
            <FilterGroup title={t('page.directory.operatingArea')} selectedCount={operatingCountries.length + operatingCities.length} defaultOpen={false}>
              <FilterOptionList
                options={countryOptions}
                selected={operatingCountries}
                onToggle={(c) => toggle('operatingCountry', c)}
                searchable
                searchPlaceholder={t('page.market.searchCountries')}
              />
              <div className="mt-3">
                {/* Scoped by the operating-country picks above when there is
                    exactly one; unscoped it searches every country, so the
                    filter still works on its own. */}
                <CityTagInput
                  label={t('page.directory.operatingCity')}
                  value={operatingCities}
                  onChange={(next) => setValues('operatingCity', next)}
                  country={operatingCountries.length === 1 ? operatingCountries[0] : null}
                  placeholder={t('page.directory.operatingCity')}
                />
              </div>
            </FilterGroup>
          )}

          {(type === 'transporters' || type === 'loaders') && (
            <FilterGroup title={t('page.directory.suppliesToLabel')} selectedCount={supplyingCountries.length} defaultOpen={false}>
              <FilterOptionList
                options={countryOptions}
                selected={supplyingCountries}
                onToggle={(c) => toggle('supplyingCountry', c)}
                searchable
                searchPlaceholder={t('page.market.searchCountries')}
              />
            </FilterGroup>
          )}

          {type === 'transporters' && (
            <FilterGroup title={t('page.directory.minDistanceLabel')} selectedCount={minDistanceKm ? 1 : 0}>
              <input
                type="text"
                inputMode="decimal"
                value={minDistanceKm}
                onChange={(e) => setValue('minDistanceKm', e.target.value || null)}
                placeholder={t('page.directory.minDistanceKm')}
                aria-label={t('page.directory.minDistanceLabel')}
                className={numberFieldCls}
              />
            </FilterGroup>
          )}

          {(type === 'loaders' || type === 'workers') && (
            <FilterGroup title={t('page.directory.minHoursLabel')} selectedCount={minWorkHours ? 1 : 0}>
              <input
                type="text"
                inputMode="decimal"
                value={minWorkHours}
                onChange={(e) => setValue('minWorkHours', e.target.value || null)}
                placeholder={t('page.directory.minWorkHours')}
                aria-label={t('page.directory.minHoursLabel')}
                className={numberFieldCls}
              />
            </FilterGroup>
          )}

          {type === 'loaders' && (
            <FilterGroup title={t('page.directory.crewSize')} selectedCount={minLoaders ? 1 : 0}>
              <input
                type="text"
                inputMode="decimal"
                value={minLoaders}
                onChange={(e) => setValue('minLoaders', e.target.value || null)}
                placeholder={t('page.directory.minLoaders')}
                aria-label={t('page.directory.crewSize')}
                className={numberFieldCls}
              />
            </FilterGroup>
          )}

          {type !== 'workers' && (
            <FilterGroup title={t('page.directory.verification')} selectedCount={verified ? 1 : 0}>
              <FilterCheckbox
                checked={verified}
                onChange={() => setValue('verified', verified ? null : 'true')}
                label={t('page.directory.kycVerified')}
              />
            </FilterGroup>
          )}
        </FilterPanel>

        <div>
          {chips.length > 0 && (
            <div className="mb-4">
              <ActiveFilterChips chips={chips} onClearAll={clearAll} />
            </div>
          )}

          {isLoading ? (
            <div className="rounded-lg border border-dashed border-surface-border p-16 text-center text-ink-soft">{t('common:loading')}</div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-ink-soft sm:p-16">
              <p>{t('page.directory.noMatch')}</p>
              {activeCount > 0 && (
                <Button variant="outline" size="sm" className="mt-3" onClick={clearAll}>
                  {t('page.market.clearAll')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {entries.map((e) => {
                const isWorker = type === 'workers';
                const w = e as ApiWorkerEntry;
                const d = e as ApiDirectoryEntry;
                const profile = isWorker ? w.user?.profile : d.profile;
                const entryCountry = isWorker ? w.user?.country : d.country;
                const entryCity = isWorker
                  ? w.originCity ?? profile?.originCity ?? profile?.location
                  : profile?.originCity ?? profile?.location;
                const locationCountry = isWorker
                  ? w.originCountry ?? profile?.originCountry ?? entryCountry
                  : profile?.originCountry ?? entryCountry;
                const entryLocation = locationLabel(entryCity, locationCountry);
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
                        <div className="flex items-center gap-1 text-xs text-ink-soft">
                          <Icon name="mapPin" size={11} /> {entryLocation}
                        </div>
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
        </div>
      </div>

      {hire && <HireModal target={hire} onClose={() => setHire(null)} />}
    </div>
  );
}
