import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { EmptyState, Loading, Screen, Txt } from '../../ui';
import { ProductCard } from '../components';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function Offers() {
  const nav = useNavigation<Nav>();
  const { t } = useI18n();
  const { data: offers = [], isLoading } = useQuery<ApiProduct[]>({ queryKey: ['products', 'offer'], queryFn: () => api.products.list({ offer: true }) });
  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('pubX.offers.title')}</Txt>
      <Txt variant="muted">{t('pubX.offers.sub')}</Txt>
      {isLoading ? (
        <Loading />
      ) : offers.length === 0 ? (
        <EmptyState icon="pricetags-outline" title={t('pubX.offers.emptyTitle')} body={t('pubX.offers.emptyBody')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {offers.map((p) => (
            <View key={p.id} style={{ width: '47.5%' }}>
              <ProductCard product={p} onPress={() => nav.navigate('ProductDetail', { slug: p.slug })} />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
