import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiCategory, ApiMarket, ApiProduct, ProductQuery } from '@agrotraders/api-client';
import { getFilterFields } from '@agrotraders/types';
import { attrKey } from '@agrotraders/i18n';
import { api } from '../../lib/api';
import { Chip, ChipSelect, EmptyState, Input, Loading, SearchBar, Screen, Txt } from '../../ui';
import { C, radius } from '../../theme/tokens';
import { ProductCard } from '../components';
import { CategorySheet, EMPTY_SELECTION, type CategorySelection } from '../components/CategorySheet';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Display labels come from `pubX.browse.filter.<id>` / `pubX.browse.sort.<id>`. */
const FILTERS: { id: keyof ProductQuery }[] = [
  { id: 'verified' },
  { id: 'safe' },
  { id: 'offer' },
  { id: 'auction' },
];
const SORTS = ['relevance', 'price_asc', 'price_desc', 'rating'];
// The grade chips map to the free-text `grade` values products carry.
const GRADES = ['premium', 'gradeA', 'organic', 'feed', 'milling'] as const;
const GRADE_VALUE: Record<(typeof GRADES)[number], string> = {
  premium: 'Premium',
  gradeA: 'Grade A',
  organic: 'Organic',
  feed: 'Feed',
  milling: 'Milling',
};

export function Browse() {
  const nav = useNavigation<Nav>();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [market, setMarket] = useState('');
  const [sort, setSort] = useState('relevance');
  // One object rather than loose strings: a deep pick needs the id (for branch-
  // inclusive filtering), the trail (for the trigger label) and the attribute
  // source name (level-2 ancestor) all at once.
  const [selection, setSelection] = useState<CategorySelection>(EMPTY_SELECTION);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [grade, setGrade] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  // Category/subcategory-specific attribute picks: field key → selected values.
  const [attrs, setAttrs] = useState<Record<string, string[]>>({});
  const [catSheet, setCatSheet] = useState(false);

  const query: ProductQuery = {
    search: search || undefined,
    sort,
    market: market || undefined,
    categoryId: selection.categoryId || undefined,
    subcategoryId: selection.subcategoryId || undefined,
    city: city || undefined,
    country: country || undefined,
    grade: grade || undefined,
    minPrice: minPrice ? Math.round(Number(minPrice) * 100) : undefined,
    maxPrice: maxPrice ? Math.round(Number(maxPrice) * 100) : undefined,
    attrs: Object.keys(attrs).length ? attrs : undefined,
  };
  FILTERS.forEach((f) => { if (flags[f.id]) (query as Record<string, boolean>)[f.id] = true; });

  const { data: products = [], isLoading } = useQuery<ApiProduct[]>({
    queryKey: ['products', 'browse', query],
    queryFn: () => api.products.list(query),
  });
  const { data: markets = [] } = useQuery<ApiMarket[]>({
    queryKey: ['markets'],
    queryFn: () => api.markets.list(),
    staleTime: 3600e3,
  });
  const { data: cats = [] } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 3600e3,
  });

  const all = { id: '', label: t('pubX.browse.all') };
  // Label + emoji for the current category, shown on the picker trigger.
  const activeCat = useMemo(() => cats.find((c) => c.id === selection.categoryId), [cats, selection.categoryId]);
  const cityOptions = useMemo(() => {
    const list = Array.from(new Set(markets.map((m) => m.city).filter(Boolean))) as string[];
    return list.length ? [all, ...list.map((c) => ({ id: c, label: c }))] : [];
  }, [markets, t]);
  const countryOptions = useMemo(() => {
    const list = Array.from(new Set(markets.map((m) => m.country).filter(Boolean))) as string[];
    return list.length ? [all, ...list.map((c) => ({ id: c, label: c }))] : [];
  }, [markets, t]);
  const gradeOptions = useMemo(
    () => [all, ...GRADES.map((g) => ({ id: GRADE_VALUE[g], label: t(`pubX.browse.grades.${g}`) }))],
    [t],
  );

  // Attribute facets for the chosen subcategory. Picks reset when the (sub)category changes.
  // A deep pick resolves to its nearest schema-bearing ancestor, so facets keep
  // showing past level 2 instead of vanishing.
  const attrFields = useMemo(
    () => getFilterFields(selection.categoryName, selection.attrSource),
    [selection.categoryName, selection.attrSource],
  );
  // Filter facets come from the English schema; only the display is localized —
  // the value sent to the API stays canonical English.
  const aLabel = (s: string) => t(`attrs:label.${attrKey(s)}`, { defaultValue: s });
  const aOpt = (s: string) => t(`attrs:option.${attrKey(s)}`, { defaultValue: s });
  const applyCategory = (next: CategorySelection) => {
    setSelection(next);
    setAttrs({});
  };
  const toggleAttr = (key: string, val: string) => {
    setAttrs((cur) => {
      const have = cur[key] ?? [];
      const nextVals = have.includes(val) ? have.filter((v) => v !== val) : [...have, val];
      const next = { ...cur };
      if (nextVals.length) next[key] = nextVals;
      else delete next[key];
      return next;
    });
  };

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('pubX.browse.title')}</Txt>
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('pubX.browse.searchPlaceholder')} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={t('pubX.browse.filter.' + f.id)} active={!!flags[f.id]} onPress={() => setFlags((x) => ({ ...x, [f.id]: !x[f.id] }))} />
        ))}
      </ScrollView>

      {/* category picker — opens a cascading bottom sheet (Category → Subcategory) */}
      <View style={{ gap: 6 }}>
        <Txt variant="label">{t('pubX.browse.category')}</Txt>
        <Pressable
          onPress={() => setCatSheet(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: selection.categoryId ? C.green : C.border, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 46, paddingVertical: 8 }}
        >
          <Ionicons name="grid-outline" size={18} color={selection.categoryId ? C.green : C.inkSoft} />
          <Txt style={{ flex: 1, fontWeight: '700', color: selection.categoryId ? C.ink : C.inkSoft }} numberOfLines={1}>
            {selection.categoryId
              ? `${activeCat?.emoji ?? ''} ${selection.trail.join('  ›  ')}`.trim()
              : t('pubX.browse.allCategories')}
          </Txt>
          {selection.categoryId ? (
            <Pressable onPress={() => applyCategory(EMPTY_SELECTION)} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={C.inkSoft} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-down" size={18} color={C.inkSoft} />
          )}
        </Pressable>
      </View>

      <CategorySheet
        visible={catSheet}
        onClose={() => setCatSheet(false)}
        categories={cats}
        selection={selection}
        onSelect={applyCategory}
      />

      {/* category/subcategory-specific attribute facets */}
      {attrFields.map((f) => {
        const selected = attrs[f.key] ?? [];
        if (f.type === 'boolean') {
          return (
            <View key={f.key}>
              <Chip label={aLabel(f.label)} active={selected.includes('true')} onPress={() => toggleAttr(f.key, 'true')} />
            </View>
          );
        }
        return (
          <View key={f.key} style={{ gap: 6 }}>
            <Txt variant="label">{aLabel(f.label)}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(f.options ?? []).map((o) => (
                <Chip key={o} label={aOpt(o)} active={selected.includes(o)} onPress={() => toggleAttr(f.key, o)} />
              ))}
            </View>
          </View>
        );
      })}
      {countryOptions.length > 0 && (
        <ChipSelect label={t('pubX.browse.country')} options={countryOptions} value={country} onChange={setCountry} />
      )}
      {cityOptions.length > 0 && (
        <ChipSelect label={t('pubX.browse.city')} options={cityOptions} value={city} onChange={setCity} />
      )}
      <ChipSelect label={t('pubX.browse.grade')} options={gradeOptions} value={grade} onChange={setGrade} />

      {/* price range (whole USD → cents in the query) */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input label={t('pubX.browse.minPrice')} value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label={t('pubX.browse.maxPrice')} value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" placeholder="—" />
        </View>
      </View>

      <ChipSelect label={t('pubX.browse.sortLabel')} options={SORTS.map((sv) => ({ id: sv, label: t('pubX.browse.sort.' + sv) }))} value={sort} onChange={setSort} />

      {/* market filter (sellers pick a market; buyers filter by it) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {markets.map((m) => (
          <Chip
            key={m.id}
            label={`${m.flag ?? ''} ${m.name}`}
            active={market === m.slug}
            onPress={() => setMarket(market === m.slug ? '' : m.slug)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <Loading />
      ) : products.length === 0 ? (
        <EmptyState icon="search-outline" title={t('pubX.browse.emptyTitle')} body={t('pubX.browse.emptyBody')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {products.map((p) => (
            <View key={p.id} style={{ width: '47.5%' }}>
              <ProductCard product={p} onPress={() => nav.navigate('ProductDetail', { slug: p.slug })} />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
