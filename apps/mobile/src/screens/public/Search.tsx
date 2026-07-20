import { useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { EmptyState, Loading, Screen, SearchBar } from '../../ui';
import { ProductCard } from '../components';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SearchRoute = RouteProp<RootStackParamList, 'Search'>;

export function Search() {
  const nav = useNavigation<Nav>();
  const route = useRoute<SearchRoute>();
  const { t } = useI18n();
  const [q, setQ] = useState(route.params?.q ?? '');
  const category = route.params?.category;
  const { data: results = [], isLoading } = useQuery<ApiProduct[]>({
    queryKey: ['products', 'search', q, category],
    queryFn: () => api.products.list({ search: q, category }),
    enabled: q.length > 1 || !!category,
  });

  return (
    <Screen>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('pubX.search.placeholder')} />
      {q.length <= 1 && !category ? (
        <EmptyState icon="search-outline" title={t('pubX.search.emptyTitle')} body={t('pubX.search.emptyBody')} />
      ) : isLoading ? (
        <Loading />
      ) : results.length === 0 ? (
        <EmptyState icon="search-outline" title={t('pubX.search.noMatchTitle')} body={t('pubX.search.noMatchBody', { q })} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {results.map((p) => (
            <View key={p.id} style={{ width: '47.5%' }}>
              <ProductCard product={p} onPress={() => nav.navigate('ProductDetail', { slug: p.slug })} />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
