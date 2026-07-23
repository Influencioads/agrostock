import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { ApiOrder } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Avatar, Card, EmptyState, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { forwardChevron } from '../../lib/rtl';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * The buyer's counterparties, each opening the real Community DM room —
 * the same Socket.IO thread used everywhere else in the app.
 */
export function BuyerMessages() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'mine'],
    queryFn: () => api.orders.mine(),
    enabled: !!user,
  });

  const contacts = new Map<string, { id: string; name: string; sub: string }>();
  for (const o of orders) {
    if (o.seller?.id) contacts.set(o.seller.id, { id: o.seller.id, name: o.seller.name, sub: t('buyerX.messages.contactSub', { ref: o.reference }) });
  }

  return (
    <Screen>
      <Txt variant="h2">{t('buyerX.messages.screenTitle')}</Txt>
      <Txt variant="muted">{t('buyerX.messages.subtitle')}</Txt>
      {!user ? (
        <EmptyState icon="lock-closed-outline" title={t('buyerX.messages.signInTitle')} />
      ) : isLoading ? (
        <SkeletonRows />
      ) : contacts.size === 0 ? (
        <EmptyState icon="chatbubbles-outline" title={t('buyerX.messages.emptyTitle')} body={t('buyerX.messages.emptyBody')} />
      ) : (
        [...contacts.values()].map((c) => (
          <Card key={c.id} onPress={() => nav.navigate('Community', { dmUserId: c.id, dmName: c.name })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={10}>
                <Avatar name={c.name} size={40} />
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="title">{c.name}</Txt>
                  <Txt variant="muted">{c.sub}</Txt>
                </View>
              </Row>
              <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
