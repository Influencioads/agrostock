import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { Button, Card, Loading, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';
import { unitSuffix } from '@agrotraders/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'Checkout'>;

export function Checkout() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { t } = useI18n();
  const slug = params?.slug;
  const [qty, setQty] = useState(1);
  const { data: p, isLoading } = useQuery<ApiProduct>({ queryKey: ['product', slug], queryFn: () => api.products.get(slug!), enabled: !!slug });
  const place = useMutation({
    mutationFn: () => api.orders.place({ productSlug: slug!, qty }),
    onSuccess: () => { Alert.alert(t('pubX.checkout.placedTitle'), t('pubX.checkout.placedBody')); nav.navigate('App'); },
    onError: () => Alert.alert(t('pubX.checkout.failTitle'), t('pubX.checkout.failBody')),
  });

  if (!slug) return <Screen><Txt variant="muted">{t('pubX.checkout.nothing')}</Txt></Screen>;
  if (isLoading || !p) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Txt variant="h2">{t('pubX.checkout.title')}</Txt>
      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}><Txt variant="title">{p.emoji} {p.name}</Txt><Txt variant="title">{p.price}{unitSuffix(p.unit)}</Txt></Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="muted">{t('pubX.checkout.quantity')}</Txt>
          <Row gap={8}>
            <Button title="−" variant="outline" size="sm" onPress={() => setQty((q) => Math.max(1, q - 1))} />
            <Txt variant="title">{qty}</Txt>
            <Button title="+" variant="outline" size="sm" onPress={() => setQty((q) => q + 1)} />
          </Row>
        </Row>
        <Row gap={8}><Txt variant="muted" color={C.green}>{t('pubX.checkout.protected')}</Txt></Row>
      </Card>
      <Button title={t('pubX.checkout.placeOrder')} full loading={place.isPending} onPress={() => place.mutate()} />
    </Screen>
  );
}
