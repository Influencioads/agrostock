import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  LABOUR_ON_REQUEST,
  type ApiDirectoryEntry,
  type ApiMarket,
  type ApiWorkerEntry,
  type ApiWorkerOffering,
  type ApiWorkerType,
} from '@agrotraders/api-client';
import { hireTargetForRoles } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Button, Card, Chip, EmptyState, Input, Row, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { HireModal, type HireTarget } from '../components/HireModal';
import { CityField } from '../components/GeoFields';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

export type DirectoryType = 'sellers' | 'transporters' | 'loaders' | 'workers';
type Nav = NativeStackNavigationProp<RootStackParamList>;

const HIRE_TYPE: Record<DirectoryType, HireTarget['targetType'] | null> = {
  sellers: null,
  transporters: 'transporter',
  loaders: 'loaderco',
  workers: 'worker',
};

/**
 * The lowest published rate a provider offers, for the card's headline figure.
 *
 * "On request" rows carry no number and are skipped rather than sorted as zero —
 * a provider whose cheapest quotable job is $6/hr must not advertise "from $0"
 * because one of their types is quote-only.
 */
function cheapestRate(
  offerings: ApiWorkerOffering[],
  t: (k: string, o?: Record<string, unknown>) => string,
  fmtCents: (c: number | null | undefined) => string,
): string {
  const priced = offerings.filter((o) => o.rateBasis !== LABOUR_ON_REQUEST && o.rateMinCents != null);
  if (!priced.length) return t('labour.onRequest');
  const best = priced.reduce((a, b) => (b.rateMinCents! < a.rateMinCents! ? b : a));
  const basis = t(`enums:labourRateBasis.${best.rateBasis}`, { defaultValue: best.rateBasis });
  return `${fmtCents(best.rateMinCents)} ${basis}`;
}

export function Directory({ type }: { type: DirectoryType }) {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState('');
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState('');
  const [operatingCountry, setOperatingCountry] = useState('');
  const [operatingCity, setOperatingCity] = useState('');
  const [supplyingCountry, setSupplyingCountry] = useState('');
  const [minWorkHours, setMinWorkHours] = useState('');
  const [minDistanceKm, setMinDistanceKm] = useState('');
  const [minLoaders, setMinLoaders] = useState('');
  const [workerTypes, setWorkerTypes] = useState<string[]>([]);
  const [providerKind, setProviderKind] = useState<'company' | 'individual' | ''>('');
  const [hire, setHire] = useState<HireTarget | null>(null);

  const num = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const toggleWorkerType = (slug: string) =>
    setWorkerTypes((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const { data: markets = [] } = useQuery<ApiMarket[]>({
    queryKey: ['markets'],
    queryFn: () => api.markets.list(),
    staleTime: 3600e3,
    enabled: type === 'sellers',
  });

  // The worker-type list is the taxonomy, not a facet: small, fixed and shared by
  // both labour directories, so it is fetched once and cached rather than derived
  // from the current results the way the country chips are.
  const { data: labourTypes = [] } = useQuery<ApiWorkerType[]>({
    queryKey: ['labour-types'],
    queryFn: () => api.labour.types(),
    staleTime: 5 * 60_000,
    enabled: type === 'workers' || type === 'loaders',
  });
  const labourTypeOpts = useMemo(
    () => labourTypes.filter((wt) => wt.providerCount > 0 || workerTypes.includes(wt.slug)),
    [labourTypes, workerTypes],
  );

  const { data: raw = [], isLoading } = useQuery<(ApiDirectoryEntry | ApiWorkerEntry)[]>({
    queryKey: ['directory', type, search, market, verified, status, operatingCountry, operatingCity, supplyingCountry, minWorkHours, minDistanceKm, minLoaders, workerTypes, providerKind],
    queryFn: async () => {
      const q = {
        search: search || undefined,
        market: market || undefined,
        verified: verified || undefined,
        operatingCountry: operatingCountry || undefined,
        operatingCity: operatingCity || undefined,
        supplyingCountry: supplyingCountry || undefined,
        minWorkHours: num(minWorkHours),
        workerType: workerTypes.length ? workerTypes : undefined,
      };
      if (type === 'sellers') return api.directory.sellers(q);
      if (type === 'transporters') return api.directory.transporters({ ...q, minDistanceKm: num(minDistanceKm) });
      if (type === 'loaders') return api.directory.loaders({ ...q, minLoaders: num(minLoaders) });
      return api.directory.workers({ ...q, status: status || undefined, providerKind: providerKind || undefined });
    },
  });

  const entries = useMemo(() => raw, [raw]);

  // Distinct operating/supplying countries across the current results, for the chip filters.
  const operatingCountryOpts = useMemo(
    () =>
      Array.from(
        new Set(
          // Workers now carry their areas on `profile` like every other entry
          // does, so both directory shapes read from the same place.
          entries.flatMap((e) => e.profile?.operatingCountries ?? []),
        ),
      ).sort(),
    [entries],
  );
  const supplyingCountryOpts = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => (e as ApiDirectoryEntry).profile?.supplyingCountries ?? []))).sort(),
    [entries],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: space.lg, gap: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Txt variant="muted">{t('pubX.dir.sub.' + type)} · {t('pubX.dir.listed', { count: entries.length })}</Txt>
        <Input placeholder={t('pubX.dir.searchByName')} value={search} onChangeText={setSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {type !== 'workers' && <Chip label={t('pubX.dir.kycVerified')} active={verified} onPress={() => setVerified((v) => !v)} />}
          {type === 'workers' && (
            <>
              <Chip label={t('pubX.dir.availableNow')} active={status === 'available'} onPress={() => setStatus(status === 'available' ? '' : 'available')} />
              <Chip label={t('pubX.dir.onSite')} active={status === 'on_site'} onPress={() => setStatus(status === 'on_site' ? '' : 'on_site')} />
            </>
          )}
          {type === 'sellers' &&
            markets.map((m) => (
              <Chip key={m.id} label={`${m.flag} ${m.name}`} active={market === m.slug} onPress={() => setMarket(market === m.slug ? '' : m.slug)} />
            ))}
          {/* Worker COMPANIES and individuals share this directory; loading
              companies have their own, because they supply only loading crew. */}
          {type === 'workers' && (
            <>
              <Chip
                label={t('labour.company')}
                active={providerKind === 'company'}
                onPress={() => setProviderKind(providerKind === 'company' ? '' : 'company')}
              />
              <Chip
                label={t('labour.individual')}
                active={providerKind === 'individual'}
                onPress={() => setProviderKind(providerKind === 'individual' ? '' : 'individual')}
              />
            </>
          )}
        </ScrollView>

        {/* Which KIND of worker is on offer — the question that replaced browsing
            a loading company's individual staff. Counts come from the taxonomy,
            so a type nobody supplies reads as zero rather than vanishing. */}
        {labourTypeOpts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {labourTypeOpts.map((wt) => (
              <Chip
                key={wt.slug}
                label={wt.name}
                count={wt.providerCount}
                active={workerTypes.includes(wt.slug)}
                onPress={() => toggleWorkerType(wt.slug)}
              />
            ))}
          </ScrollView>
        ) : null}

        {/* Operational filters (transporters / loaders / workers). */}
        {type !== 'sellers' && operatingCountryOpts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {operatingCountryOpts.map((c) => (
              <Chip key={c} label={c} active={operatingCountry === c} onPress={() => setOperatingCountry(operatingCountry === c ? '' : c)} />
            ))}
          </ScrollView>
        ) : null}
        {(type === 'transporters' || type === 'loaders') && supplyingCountryOpts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {supplyingCountryOpts.map((c) => (
              <Chip key={`s-${c}`} label={`→ ${c}`} active={supplyingCountry === c} onPress={() => setSupplyingCountry(supplyingCountry === c ? '' : c)} />
            ))}
          </ScrollView>
        ) : null}
        {/* Scoped by the operating-country chips above; unscoped it searches
            every country, so the filter still works on its own. */}
        {type !== 'sellers' ? (
          <CityField label={t('pubX.dir.operatingCity')} country={operatingCountry || undefined} value={operatingCity} onChange={setOperatingCity} />
        ) : null}
        <Row gap={8}>
          {type === 'transporters' ? (
            <View style={{ flex: 1 }}>
              <Input placeholder={t('pubX.dir.minDistanceKm')} keyboardType="number-pad" value={minDistanceKm} onChangeText={setMinDistanceKm} />
            </View>
          ) : null}
          {type === 'loaders' || type === 'workers' ? (
            <View style={{ flex: 1 }}>
              <Input placeholder={t('pubX.dir.minWorkHours')} keyboardType="number-pad" value={minWorkHours} onChangeText={setMinWorkHours} />
            </View>
          ) : null}
          {type === 'loaders' ? (
            <View style={{ flex: 1 }}>
              <Input placeholder={t('pubX.dir.minLoaders')} keyboardType="number-pad" value={minLoaders} onChangeText={setMinLoaders} />
            </View>
          ) : null}
        </Row>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: space.lg, gap: 12 }}
        ListEmptyComponent={isLoading ? <SkeletonRows /> : <EmptyState icon="search-outline" title={t('pubX.dir.emptyFilters')} />}
        renderItem={({ item: e }) => {
          const isWorker = type === 'workers';
          const w = e as ApiWorkerEntry;
          const d = e as ApiDirectoryEntry;
          const profile = isWorker ? w.profile : d.profile;
          const country = isWorker ? w.country : d.country;
          const kyc = isWorker ? w.kycStatus : d.kycStatus;
          const userId = e.id;
          const counts = (e._count ?? {}) as Record<string, number>;
          // A worker COMPANY and an individual share this directory, so the flow
          // comes from the account's own roles: hired as `worker`, a company's
          // job is minted with no company attached and never reaches its board.
          // The other directories are single-role by construction.
          const hireType = isWorker
            ? hireTargetForRoles([w.role, ...(w.roles ?? [])]) ?? 'worker'
            : HIRE_TYPE[type];
          const statLine =
            type === 'sellers'
              ? `${t('pubX.dir.products', { count: counts.products ?? 0 })} · ${t('pubX.dir.orders', { count: counts.sellerOrders ?? 0 })}`
              : type === 'transporters'
                ? `${t('pubX.dir.vehicles', { count: counts.vehicles ?? 0 })} · ${t('pubX.dir.trips', { count: counts.trips ?? 0 })}`
                : type === 'loaders'
                  ? `${t('pubX.dir.workers', { count: counts.workers ?? 0 })} · ${t('pubX.dir.teams', { count: counts.teams ?? 0 })}`
                  : t('pubX.dir.jobs', { count: counts.assignments ?? 0 });
          return (
            <Card onPress={userId ? () => nav.navigate('PublicProfile', { userId }) : undefined} style={{ gap: 10 }}>
              <Row gap={10}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 22 }}>{profile?.avatarEmoji ?? (isWorker ? '👷' : '🏢')}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="title" numberOfLines={1}>{e.name}</Txt>
                  <Txt variant="muted">{country ?? '—'}</Txt>
                </View>
                {kyc === 'verified' ? <Badge label={t('enums:kyc.verified')} tone="green" /> : null}
              </Row>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {profile?.market ? <Badge label={`${profile.market.flag} ${profile.market.name}`} tone="mango" /> : null}
                {profile?.availableFrom && profile?.availableTo ? <Badge label={`${profile.availableFrom}–${profile.availableTo}`} tone="slate" /> : null}
                {isWorker && w.workerProfile ? <Badge label={w.workerProfile.status.replace('_', ' ')} tone={w.workerProfile.status === 'available' ? 'green' : 'slate'} /> : null}
                {isWorker && w.workerProfile?.rating ? <Badge label={`★ ${w.workerProfile.rating}`} tone="mango" /> : null}
                {/* Everyone listed here answers for themselves, so `independent`
                    is true for a company too — the useful distinction is which
                    of the two it is. */}
                {isWorker ? (
                  <Badge
                    label={w.providerKind === 'company' ? t('labour.company') : t('pubX.dir.independent')}
                    tone="info"
                  />
                ) : null}
              </Row>
              {/* Which KINDS of worker this provider supplies, and the cheapest
                  rate. For a loading company this is what replaced browsing its
                  individual crew. */}
              {(e.workerOfferings?.length ?? 0) > 0 ? (
                <View style={{ gap: 6 }}>
                  <Row gap={6} style={{ flexWrap: 'wrap' }}>
                    {e.workerOfferings!.slice(0, 3).map((o) => (
                      <Badge key={o.id} label={o.workerType.name} tone="green" />
                    ))}
                    {e.workerOfferings!.length > 3 ? (
                      <Badge label={`+${e.workerOfferings!.length - 3}`} tone="slate" />
                    ) : null}
                  </Row>
                  <Txt variant="title">{t('labour.ratesFrom')}: {cheapestRate(e.workerOfferings!, t, fmtCents)}</Txt>
                </View>
              ) : null}
              {(() => {
                const opCountries = isWorker ? w.profile?.operatingCountries : d.profile?.operatingCountries;
                const opCities = isWorker ? w.profile?.operatingCities : d.profile?.operatingCities;
                const supCountries = d.profile?.supplyingCountries;
                const minHrs = isWorker ? w.workerProfile?.minWorkHours : d.profile?.minWorkHours;
                const minDist = d.profile?.minDistanceKm;
                const minCrew = d.profile?.minLoaders;
                const operates = [...(opCities ?? []), ...(opCountries ?? [])];
                const hasMeta = operates.length || (supCountries?.length ?? 0) || minHrs != null || minDist != null || minCrew != null;
                if (!hasMeta) return null;
                return (
                  <Row gap={6} style={{ flexWrap: 'wrap' }}>
                    {operates.length > 0 ? <Badge label={t('pubX.dir.operatesIn', { areas: operates.slice(0, 3).join(', ') })} tone="slate" /> : null}
                    {(supCountries?.length ?? 0) > 0 ? <Badge label={t('pubX.dir.suppliesTo', { areas: supCountries!.slice(0, 3).join(', ') })} tone="info" /> : null}
                    {minDist != null ? <Badge label={t('pubX.dir.minDistanceBadge', { km: minDist })} tone="mango" /> : null}
                    {minHrs != null ? <Badge label={t('pubX.dir.minHoursBadge', { hours: minHrs })} tone="mango" /> : null}
                    {minCrew != null ? <Badge label={t('pubX.dir.minLoadersBadge', { count: minCrew })} tone="mango" /> : null}
                  </Row>
                );
              })()}
              <Txt variant="muted">{statLine}</Txt>
              <Row gap={8}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('pubX.dir.chat')}
                    variant="outline"
                    size="sm"
                    icon="chatbubbles-outline"
                    full
                    disabled={!userId || userId === user?.id}
                    onPress={() => userId && nav.navigate('Community', { dmUserId: userId, dmName: e.name })}
                  />
                </View>
                {hireType ? (
                  <View style={{ flex: 1 }}>
                    <Button
                      title={t('pubX.dir.hire')}
                      size="sm"
                      icon="checkmark"
                      full
                      disabled={!userId || userId === user?.id}
                      // `w.id` is the USER id now — the Worker record hangs off
                      // `workerProfile`, and a hire needs both.
                      onPress={() => userId && setHire({ targetType: hireType, targetUserId: userId, workerId: w.workerProfile?.id, name: e.name })}
                    />
                  </View>
                ) : null}
              </Row>
            </Card>
          );
        }}
      />
      {hire && <HireModal target={hire} onClose={() => setHire(null)} />}
    </View>
  );
}

/* Registry/menu wrappers (Section screens receive no props). */
export const DirectorySellers = () => <Directory type="sellers" />;
export const DirectoryTransporters = () => <Directory type="transporters" />;
export const DirectoryLoaders = () => <Directory type="loaders" />;
export const DirectoryWorkers = () => <Directory type="workers" />;

/** Ionicons name for a directory entry (kept for menu callers). */
export const DIRECTORY_ICON: Record<DirectoryType, keyof typeof Ionicons.glyphMap> = {
  sellers: 'storefront-outline',
  transporters: 'car-outline',
  loaders: 'people-outline',
  workers: 'person-outline',
};
