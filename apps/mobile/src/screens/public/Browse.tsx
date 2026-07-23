import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ApiCategory, ApiProduct } from '@agrotraders/api-client';
import { attrKey } from '@agrotraders/i18n';
import { api } from '../../lib/api';
import { AppBar, FilterBar, SearchBar } from '../../ui';
import { AppliedFilters } from '../../ui/FilterBar';
import { C, space, type } from '../../theme/tokens';
import { ProductGrid } from '../components/ProductGrid';
import { FilterSheet, SortSheet } from '../components/FilterSheet';
import {
  EMPTY_FILTERS,
  FLAG_IDS,
  clearGroup,
  countActive,
  toQuery,
  type Filters,
} from '../components/filterState';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Display labels come from `pubX.browse.sort.<id>`. */
const SORTS = ['relevance', 'price_asc', 'price_desc', 'rating'];

/**
 * The product listing page.
 *
 * Structure mirrors what dense marketplace apps converged on: a search bar, a
 * removable chip row for what's currently applied, an edge-to-edge results
 * grid, and a sticky SORT | FILTER bar at the bottom. Everything that used to
 * be stacked inline above the results now lives in the filter sheet.
 */
export function Browse() {
  const nav = useNavigation<Nav>();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevance');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterSheet, setFilterSheet] = useState(false);
  const [sortSheet, setSortSheet] = useState(false);

  const query = useMemo(() => toQuery(filters, search, sort), [filters, search, sort]);

  // The whole committed query is the cache key, so a repeated filter
  // combination is served from cache; `keepPreviousData` stops the grid
  // flashing empty between refetches.
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'browse', query],
    queryFn: () => api.products.listPaged(query),
    placeholderData: keepPreviousData,
  });
  const products: ApiProduct[] = data?.items ?? [];
  const total = data?.total ?? 0;

  const { data: cats = [] } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 3600e3,
  });

  const activeCount = countActive(filters);
  // Memoized so it's a stable dependency of the `chips` memo below.
  const aLabel = useCallback((s: string) => t(`attrs:label.${attrKey(s)}`, { defaultValue: s }), [t]);

  /** One removable chip per applied filter, in the order the sheet lists them. */
  const chips = useMemo(() => {
    const out: { key: string; label: string; onRemove: () => void }[] = [];
    const drop = (group: string) => () => setFilters((f) => clearGroup(f, group));
    if (filters.selection.categoryId) {
      out.push({
        key: 'category',
        label: filters.selection.trail[filters.selection.trail.length - 1] ?? filters.selection.categoryName,
        onRemove: drop('category'),
      });
    }
    for (const id of FLAG_IDS) {
      if (filters.flags[id]) {
        out.push({
          key: id,
          label: t('pubX.browse.filter.' + id),
          onRemove: () => setFilters((f) => ({ ...f, flags: { ...f.flags, [id]: false } })),
        });
      }
    }
    if (filters.minPrice || filters.maxPrice) {
      out.push({ key: 'price', label: `${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`, onRemove: drop('price') });
    }
    if (filters.country) out.push({ key: 'country', label: filters.country, onRemove: drop('country') });
    if (filters.city) out.push({ key: 'city', label: filters.city, onRemove: drop('city') });
    if (filters.grade) out.push({ key: 'grade', label: filters.grade, onRemove: drop('grade') });
    if (filters.market) out.push({ key: 'market', label: filters.market, onRemove: drop('market') });
    for (const [key, values] of Object.entries(filters.attrs)) {
      if (values.length) out.push({ key, label: `${aLabel(key)} · ${values.length}`, onRemove: drop(key) });
    }
    return out;
  }, [filters, t, aLabel]);

  // No 'top' edge: AppBar applies the status-bar inset itself. Adding it here
  // too would leave an empty band above the header.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      <AppBar title={t('pubX.browse.title')}>
        <View style={{ paddingHorizontal: space.lg }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('pubX.browse.searchPlaceholder')} />
        </View>
      </AppBar>

      <ScrollView contentContainerStyle={{ paddingBottom: space.lg }} showsVerticalScrollIndicator={false}>
        <View style={s.summary}>
          <Text style={s.count}>
            {isLoading ? '' : t('pubX.plp.results', { count: total })}
          </Text>
          {filters.selection.trail.length > 0 ? (
            <Text numberOfLines={1} style={s.crumb}>{filters.selection.trail.join('  ›  ')}</Text>
          ) : null}
        </View>

        {chips.length > 0 ? (
          <View style={{ paddingBottom: space.md }}>
            <AppliedFilters
              items={chips}
              onClearAll={() => setFilters(EMPTY_FILTERS)}
              clearLabel={t('pubX.filter.clearAll')}
            />
          </View>
        ) : null}

        <ProductGrid
          products={products}
          loading={isLoading}
          onOpen={(p) => nav.navigate('ProductDetail', { slug: p.slug })}
          empty={{
            title: t('pubX.browse.emptyTitle'),
            body: t('pubX.browse.emptyBody'),
            action: activeCount ? t('pubX.plp.clearFilters') : undefined,
            onAction: () => setFilters(EMPTY_FILTERS),
          }}
        />
      </ScrollView>

      <FilterBar
        sortLabel={t('pubX.plp.sort')}
        filterLabel={t('pubX.plp.filters')}
        activeCount={activeCount}
        onSort={() => setSortSheet(true)}
        onFilter={() => setFilterSheet(true)}
      />

      <FilterSheet
        visible={filterSheet}
        onClose={() => setFilterSheet(false)}
        applied={filters}
        onApply={setFilters}
        categories={cats}
      />
      <SortSheet
        visible={sortSheet}
        onClose={() => setSortSheet(false)}
        options={SORTS.map((sv) => ({ id: sv, label: t('pubX.browse.sort.' + sv) }))}
        value={sort}
        onChange={setSort}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  summary: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: 2 },
  count: { ...type.micro, color: C.inkMuted },
  crumb: { ...type.caption, color: C.ink },
});
