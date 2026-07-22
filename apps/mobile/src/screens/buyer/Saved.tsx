import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { Badge, Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { unitSuffix } from '@agrotraders/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Saved — verified & safe-deal picks kept for later. */
export function BuyerSaved() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { data: saved = [], isLoading } = useQuery<ApiProduct[]>({
    queryKey: ['saved-products'], queryFn: () => api.products.list({ safe: true }),
  });

  return (
    <Screen>
      <Txt variant="h2">{t('buyerX.saved.screenTitle')}</Txt>
      <Txt variant="muted">{t('buyerX.saved.subtitle')}</Txt>
      {isLoading ? (
        <Loading />
      ) : saved.length === 0 ? (
        <EmptyState icon="heart-outline" title={t('buyerX.saved.emptyTitle')} body={t('buyerX.saved.emptyBody')} />
      ) : (
        saved.map((p) => (
          <Card key={p.id} onPress={() => nav.navigate('ProductDetail', { slug: p.slug })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={10}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.mangoSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 20 }}>{p.emoji ?? '🌾'}</Txt>
                </View>
                <View>
                  <Txt variant="title">{p.name}</Txt>
                  <Txt variant="muted">{p.flag} {p.price}{unitSuffix(p.unit)}</Txt>
                </View>
              </Row>
              {p.verified ? <Badge label={t('buyerX.saved.verified')} tone="green" /> : null}
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
