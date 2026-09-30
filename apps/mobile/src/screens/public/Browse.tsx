import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { SYMBOLS, type ApiCategory, type ApiMarket, type ApiProduct } from '@agrotraders/api-client';
import { countryLabel } from '@agrotraders/geo';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { AppBar, FilterBar, SearchBar } from '../../ui';
import { AppliedFilters } from '../../ui/FilterBar';
import { useFabClearance } from '../../ui/fab';
import { C, space, type } from '../../theme/tokens';
import { ProductGrid, SimilarProducts } from '../components/ProductGrid';
import { FilterSheet, SortSheet } from '../components/FilterSheet';
import {
  ATTR_PREFIX,
  EMPTY_FILTERS,
  FLAG_IDS,
  SORTS,
  LIST_GROUPS,
  clearGroup,
  countActive,
  filtersFromParams,
  toQuery,
  toggleValue,
  type Filters,
  type ListGroup,
} from '../components/filterState';
import { useI18n } from '../../i18n';
import { useBasketAction } from '../../basket/useBasketAction';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
/** The shop tab mounts this too, as `Browse`, with no params. */
type ProductsRoute = RouteProp<RootStackParamList, 'Products'>;

/** A deep link (agrotraders.org/market?...) carries only strings in web's param names, never a Filters object. */
const paramFilters = (p: ProductsRoute['params']): Filters =>
  p?.filters && typeof p.filters === 'object' ? p.filters : p ? filtersFromParams(p) : EMPTY_FILTERS;
/** Web's /market calls the search text `search`. */
const paramQ = (p: ProductsRoute['params']) => p?.q ?? p?.search ?? '';

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
  const route = useRoute<ProductsRoute>();
  const params = route.params;
  const { t, lang } = useI18n();
  const { rate, displayCurrency } = useCurrency();
  // `typed` is the box; `search` is the settled term the query runs on, so a
  // word typed is one fetch rather than one per keystroke.
  const [typed, setTyped] = useState(paramQ(params));
  const [search, setSearch] = useState(typed);
  const [sort, setSort] = useState(params?.sort ?? 'relevance');
  const [filters, setFilters] = useState<Filters>(paramFilters(params));
  const [filterSheet, setFilterSheet] = useState(false);
  const [sortSheet, setSortSheet] = useState(false);
  const basketAction = useBasketAction();
  const fabClearance = useFabClearance();

  // The home hero can navigate here again with new params while this screen is
  // still mounted, and a `useState` initialiser only runs once. The shop tab
  // passes none, so its own state is left alone.
  useEffect(() => {
    if (!params) return;
    setFilters(paramFilters(params));
    setTyped(paramQ(params));
    setSearch(paramQ(params));
    setSort(params.sort ?? 'relevance');
  }, [params]);

  useEffect(() => {
    const id = setTimeout(() => setSearch(typed), 300);
    return () => clearTimeout(id);
  }, [typed]);

  const query = useMemo(() => toQuery(filters, search, sort, rate), [filters, search, sort, rate]);

  // The whole committed query is the cache key, so a repeated filter
  // combination is served from cache; `keepPreviousData` stops the grid
  // flashing empty between refetches. F31: paginate the full catalog with an
  // infinite query rather than showing only the first page of results.
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['products', 'browse', query],
    queryFn: ({ pageParam }) => api.products.listPaged({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const products: ApiProduct[] = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const firstPage = data?.pages[0];
  const total = firstPage?.total ?? 0;

  // Fetch the next page when the grid scrolls within ~600px of the bottom.
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceToEnd = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceToEnd < 600 && hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const { data: cats = [], isError: catsError, refetch: refetchCats } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 3600e3,
  });

  // Only for the market chips' names; the sheet itself lists markets from facets.
  const { data: markets = [] } = useQuery<ApiMarket[]>({
    queryKey: ['markets'],
    queryFn: () => api.markets.list(),
    staleTime: 3600e3,
    enabled: filters.market.length > 0,
  });

  const activeCount = countActive(filters);
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setTyped('');
    setSearch('');
  };
  // The picker carries the resolved, localized field definitions, so a facet
  // chip can show the field's real label instead of guessing it from the key.
  const attrLabel = useCallback(
    (key: string) => filters.selection.attrFields.find((f) => f.key === key)?.label ?? key,
    [filters.selection.attrFields],
  );

  /** One removable chip per applied filter, per value for the lists, as on web. */
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
    for (const [key, values] of Object.entries(filters.attrs)) {
      if (values.length) {
        out.push({ key: ATTR_PREFIX + key, label: `${attrLabel(key)} · ${values.length}`, onRemove: drop(ATTR_PREFIX + key) });
      }
    }
    // Chips carry names, not stored values: a market slug or an English
    // country name reads as a bug to a Russian buyer.
    const valueLabel: Record<ListGroup, (v: string) => string> = {
      grade: (v) => v,
      country: (v) => countryLabel(v, lang),
      city: (v) => v,
      market: (v) => markets.find((m) => m.slug === v)?.name ?? v,
      supplyCountry: (v) => `${t('pubX.filter.groups.supplyCountry')}: ${countryLabel(v, lang)}`,
    };
    for (const g of LIST_GROUPS) {
      for (const v of filters[g]) {
        out.push({ key: `${g}:${v}`, label: valueLabel[g](v), onRemove: () => setFilters((f) => toggleValue(f, g, v)) });
      }
    }
    if (filters.minPrice || filters.maxPrice) {
      const unit = SYMBOLS[displayCurrency] ?? displayCurrency;
      out.push({ key: 'price', label: `${unit}${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`, onRemove: drop('price') });
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
    return out;
  }, [filters, t, lang, attrLabel, markets, displayCurrency]);

  // No 'top' edge: AppBar applies the status-bar inset itself. Adding it here
  // too would leave an empty band above the header.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      <AppBar
        title={t('pubX.browse.title')}
        actions={[basketAction]}
        // Pushed over the tabs as `Products` it needs a way back; as a tab it is the root.
        onBack={route.name === 'Products' ? () => nav.goBack() : undefined}
      >
        <View style={{ paddingHorizontal: space.lg }}>
          <SearchBar value={typed} onChangeText={setTyped} placeholder={t('pubX.browse.searchPlaceholder')} />
        </View>
      </AppBar>

      <ScrollView
        contentContainerStyle={{ paddingBottom: fabClearance }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
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
          error={isError}
          onRetry={() => refetch()}
          onOpen={(p) => nav.navigate('ProductDetail', { slug: p.slug })}
          empty={{
            title: t('pubX.browse.emptyTitle'),
            body: t('pubX.browse.emptyBody'),
            // A search term alone can empty the grid too, so it counts as something to clear.
            action: activeCount || search ? t('pubX.plp.clearFilters') : undefined,
            onAction: clearAll,
          }}
        />
        {products.length === 0 && !isLoading && !isError ? (
          <SimilarProducts result={firstPage} onOpen={(p) => nav.navigate('ProductDetail', { slug: p.slug })} />
        ) : null}

        {isFetchingNextPage ? (
          <View style={{ paddingVertical: space.lg }}>
            <ActivityIndicator color={C.green} />
          </View>
        ) : null}
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
        search={search}
        categories={cats}
        categoriesError={catsError}
        onRetryCategories={() => void refetchCats()}
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
