import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { AppBar } from '../../ui';
import { C, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { ProductGrid } from '../components/ProductGrid';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function Offers() {
  const nav = useNavigation<Nav>();
  const { t } = useI18n();
  const { data: offers = [], isLoading, isError, refetch } = useQuery<ApiProduct[]>({
    queryKey: ['products', 'offer'],
    queryFn: () => api.products.list({ offer: true }),
  });

  // AppBar owns the status-bar inset — see Browse.tsx.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      <AppBar title={t('pubX.offers.title')} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        <View style={s.head}>
          <Text style={[s.sub, microLabel()]}>{t('pubX.offers.sub')}</Text>
        </View>
        <ProductGrid
          products={offers}
          loading={isLoading}
          error={isError}
          onRetry={() => refetch()}
          onOpen={(p) => nav.navigate('ProductDetail', { slug: p.slug })}
          empty={{ title: t('pubX.offers.emptyTitle'), body: t('pubX.offers.emptyBody') }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: space.lg, paddingVertical: space.md },
  sub: { ...type.micro, color: C.inkMuted },
});
