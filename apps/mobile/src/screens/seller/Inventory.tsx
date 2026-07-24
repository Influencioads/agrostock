import { Image, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiProduct } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Row, Screen, SkeletonRows, Txt, QueryError } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { unitSuffix } from '@agrotraders/types';

type SellerProduct = ApiProduct & { _count?: { orders: number } };
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SellerInventory() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: products = [], isLoading, isError, refetch } = useQuery<SellerProduct[]>({ queryKey: ['products', 'mine'], queryFn: () => api.products.mine() as Promise<SellerProduct[]>, enabled: !!user });
  const remove = useMutation({ mutationFn: (id: string) => api.products.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['products', 'mine'] }) });

  return (
    <Screen edges={['top']}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">{t('sellerX.inventory.title')}</Txt>
        <Button title={t('sellerX.inventory.add')} size="sm" icon="add" onPress={() => nav.navigate('Section', { role: 'seller', section: 'add', title: t('sellerX.inventory.addProductTitle') })} />
      </Row>
      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : products.length === 0 ? (
        <EmptyState icon="storefront-outline" title={t('sellerX.inventory.emptyTitle')} body={t('sellerX.inventory.emptyBody')} />
      ) : (
        products.map((p) => (
          <Card key={p.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={10}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.imageUrl ? <Image source={{ uri: assetUrl(p.imageUrl) }} style={{ width: '100%', height: '100%' }} /> : <Txt style={{ fontSize: 22 }}>{p.emoji ?? '🌾'}</Txt>}
                </View>
                <View>
                  <Txt variant="title">{p.name}</Txt>
                  <Txt variant="muted">{p.flag} {p.qty} · {t('sellerX.inventory.orders', { count: p._count?.orders ?? 0 })}</Txt>
                </View>
              </Row>
              <Txt variant="title">{p.price}{unitSuffix(p.unit)}</Txt>
            </Row>
            <Row gap={6}>
              {p.isOffer ? <Badge label={t('sellerX.inventory.offer')} tone="mango" /> : null}
              {p.isAuction ? <Badge label={t('sellerX.inventory.auction')} tone="info" /> : null}
              <View style={{ flex: 1 }} />
              <Button title={t('sellerX.inventory.edit')} variant="outline" size="sm" icon="create-outline" onPress={() => nav.navigate('Section', { role: 'seller', section: 'add', title: t('sellerX.inventory.editProductTitle'), productId: p.id })} />
              <Button title={t('sellerX.inventory.delete')} variant="ghost" size="sm" loading={remove.isPending} onPress={() => remove.mutate(p.id)} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
