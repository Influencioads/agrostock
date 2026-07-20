import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';

/** Offers — feature any listing as a promotional deal. */
export function SellerOffers() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: products = [], isLoading } = useQuery<ApiProduct[]>({
    queryKey: ['products', 'mine'],
    queryFn: () => api.products.mine(),
    enabled: !!user,
  });
  const toggle = useMutation({
    mutationFn: ({ id, isOffer }: { id: string; isOffer: boolean }) => api.products.update(id, { isOffer }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', 'mine'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <Screen>
      <Txt variant="h2">{t('sellerX.offers.title')}</Txt>
      <Txt variant="muted">{t('sellerX.offers.subtitle')}</Txt>
      {isLoading ? (
        <Loading />
      ) : products.length === 0 ? (
        <EmptyState icon="star-outline" title={t('sellerX.offers.emptyTitle')} body={t('sellerX.offers.emptyBody')} />
      ) : (
        products.map((p) => (
          <Card key={p.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={10}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 20 }}>{p.emoji ?? '🌾'}</Txt>
                </View>
                <View>
                  <Txt variant="title">{p.name}</Txt>
                  <Txt variant="muted">{p.price}{p.unit}</Txt>
                </View>
              </Row>
              <Row gap={8}>
                {p.isOffer ? <Badge label={t('sellerX.offers.offerLive')} tone="mango" /> : null}
                <Button
                  title={p.isOffer ? t('sellerX.offers.remove') : t('sellerX.offers.makeOffer')}
                  variant={p.isOffer ? 'outline' : 'primary'}
                  size="sm"
                  loading={toggle.isPending}
                  onPress={() => toggle.mutate({ id: p.id, isOffer: !p.isOffer })}
                />
              </Row>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
