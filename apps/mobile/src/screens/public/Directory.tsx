import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiDirectoryEntry, ApiMarket, ApiWorkerEntry } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, Chip, EmptyState, Input, Row, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { HireModal, type HireTarget } from '../components/HireModal';
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

export function Directory({ type }: { type: DirectoryType }) {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { t } = useI18n();
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
  const [hire, setHire] = useState<HireTarget | null>(null);

  const num = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);

  const { data: markets = [] } = useQuery<ApiMarket[]>({
    queryKey: ['markets'],
    queryFn: () => api.markets.list(),
    staleTime: 3600e3,
    enabled: type === 'sellers',
  });

  const { data: raw = [], isLoading } = useQuery<(ApiDirectoryEntry | ApiWorkerEntry)[]>({
    queryKey: ['directory', type, search, market, verified, status, operatingCountry, operatingCity, supplyingCountry, minWorkHours, minDistanceKm, minLoaders],
    queryFn: async () => {
      const q = {
        search: search || undefined,
        market: market || undefined,
        verified: verified || undefined,
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

  const entries = useMemo(() => raw, [raw]);

  // Distinct operating/supplying countries across the current results, for the chip filters.
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
        </ScrollView>

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
        {type !== 'sellers' ? (
          <Input placeholder={t('pubX.dir.operatingCity')} value={operatingCity} onChangeText={setOperatingCity} />
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
          const profile = isWorker ? w.user?.profile : d.profile;
          const country = isWorker ? w.user?.country : d.country;
          const kyc = isWorker ? w.user?.kycStatus : d.kycStatus;
          const userId = isWorker ? w.user?.id : d.id;
          const counts = (e._count ?? {}) as Record<string, number>;
          const hireType = HIRE_TYPE[type];
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
                {isWorker ? <Badge label={w.status.replace('_', ' ')} tone={w.status === 'available' ? 'green' : 'slate'} /> : null}
                {isWorker && w.rating ? <Badge label={`★ ${w.rating}`} tone="mango" /> : null}
                {isWorker && w.independent ? <Badge label={t('pubX.dir.independent')} tone="info" /> : null}
              </Row>
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
                      onPress={() => userId && setHire({ targetType: hireType, targetUserId: userId, workerId: isWorker ? w.id : undefined, name: e.name })}
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
