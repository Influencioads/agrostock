import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiCategory, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { storage } from '../../lib/storage';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { ProductGrid } from '../components/ProductGrid';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SearchRoute = RouteProp<RootStackParamList, 'Search'>;

/** SecureStore keys must be alphanumeric + underscore. */
const RECENT_KEY = 'agrotraders_recent_searches';
const RECENT_MAX = 8;

async function loadRecent(): Promise<string[]> {
  const raw = await storage.get(RECENT_KEY).catch(() => null);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function Search() {
  const nav = useNavigation<Nav>();
  const route = useRoute<SearchRoute>();
  const { t } = useI18n();
  const [q, setQ] = useState(route.params?.q ?? '');
  // Typing shouldn't fire a request per keystroke; the query runs on the settled value.
  const [debounced, setDebounced] = useState(q);
  const [recent, setRecent] = useState<string[]>([]);
  const category = route.params?.category;

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    void loadRecent().then(setRecent);
  }, []);

  /** Remembers a term once it actually produced a search, most recent first. */
  const remember = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecent((cur) => {
      const next = [clean, ...cur.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, RECENT_MAX);
      void storage.set(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const active = debounced.trim().length > 1 || !!category;

  const { data: results = [], isLoading } = useQuery<ApiProduct[]>({
    queryKey: ['products', 'search', debounced, category],
    queryFn: async () => {
      const items = await api.products.list({ search: debounced, category });
      remember(debounced);
      return items;
    },
    enabled: active,
    placeholderData: keepPreviousData,
  });

  const { data: cats = [] } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 3600e3,
  });

  const clearRecent = () => {
    setRecent([]);
    void storage.del(RECENT_KEY).catch(() => {});
  };
  const removeRecent = (term: string) => {
    setRecent((cur) => {
      const next = cur.filter((x) => x !== term);
      void storage.set(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
      {/* Header — circular back + a rounded search field with a voice affordance. */}
      <View style={s.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
        <View style={s.searchField}>
          <Ionicons name="search" size={19} color={C.inkMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => setDebounced(q)}
            placeholder={t('pubX.search.placeholder')}
            placeholderTextColor={C.inkMuted}
            autoFocus
            returnKeyType="search"
            style={s.searchInput}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={C.inkMuted} /></Pressable>
          ) : (
            <Ionicons name="mic-outline" size={19} color={C.green} />
          )}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xl }}>
        {active ? (
          <ProductGrid
            products={results}
            loading={isLoading}
            onOpen={(p) => nav.navigate('ProductDetail', { slug: p.slug })}
            empty={{ title: t('pubX.search.noMatchTitle'), body: t('pubX.search.noMatchBody', { q: debounced }) }}
          />
        ) : (
          <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
            {recent.length > 0 ? (
              <>
                <View style={s.sectionHead}>
                  <Text style={[s.sectionTitle, microLabel()]}>{t('pubX.search.recent')}</Text>
                  <Pressable onPress={clearRecent} hitSlop={8}>
                    <Text style={s.clear}>{t('pubX.filter.clearAll')}</Text>
                  </Pressable>
                </View>
                <View style={{ marginBottom: space.xl }}>
                  {recent.map((term) => (
                    <Pressable key={term} onPress={() => setQ(term)} style={s.recentRow}>
                      <Ionicons name="time-outline" size={18} color={C.inkMuted} />
                      <Text numberOfLines={1} style={s.recentText}>{term}</Text>
                      <Pressable onPress={() => removeRecent(term)} hitSlop={10}>
                        <Ionicons name="close" size={18} color={C.inkMuted} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {cats.length > 0 ? (
              <>
                <Text style={[s.sectionTitle, microLabel(), { marginBottom: space.md }]}>{t('pubX.search.trending')}</Text>
                <View style={s.trendWrap}>
                  {cats.slice(0, 8).map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => nav.navigate('Search', { category: c.name, title: c.name })}
                      style={s.trendChip}
                    >
                      <Ionicons name="trending-up" size={15} color={C.green} />
                      <Text numberOfLines={1} style={s.trendText}>{c.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingVertical: space.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  searchField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.green, borderRadius: 24, height: 48, paddingHorizontal: 16 },
  searchInput: { flex: 1, ...type.body, fontSize: 15, color: C.ink, paddingVertical: 0 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  sectionTitle: { ...type.micro, color: C.inkMuted },
  clear: { ...type.title, fontSize: 14, color: C.green },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  recentText: { ...type.body, fontSize: 15, color: C.ink, flex: 1 },
  trendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  trendChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11 },
  trendText: { ...type.title, fontSize: 14, color: C.ink },
});
