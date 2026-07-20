import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiOrder } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { usd, orderLabel } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Card, EmptyState, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';

/** Safe Deal — escrow balance + orders held until delivery is confirmed. */
export function BuyerSafeDeal() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: wallet } = useQuery<{ balanceCents: number }>({
    queryKey: ['me-wallet'], queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>, enabled: !!user,
  });
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'mine'], queryFn: () => api.orders.mine() as Promise<ApiOrder[]>, enabled: !!user,
  });
  const held = orders.filter((o) => o.status === 'paid');

  return (
    <Screen>
      <Txt variant="h2">{t('buyerX.safeDeal.screenTitle')}</Txt>
      <Card style={{ backgroundColor: C.evergreen }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Txt variant="muted" color={C.mint}>{t('buyerX.safeDeal.escrowBalance')}</Txt>
            <Txt color={C.white} style={{ fontSize: 28, fontWeight: '800', marginTop: 4 }}>{usd(wallet?.balanceCents)}</Txt>
          </View>
          <Badge label={t('buyerX.safeDeal.protected')} tone="mango" />
        </Row>
      </Card>
      <Txt variant="h3">{t('buyerX.safeDeal.ordersInEscrow')}</Txt>
      {held.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title={t('buyerX.safeDeal.emptyTitle')} body={t('buyerX.safeDeal.emptyBody')} />
      ) : (
        held.map((o) => (
          <Card key={o.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="title">{o.product?.name ?? t('buyerX.safeDeal.orderFallback')} · #{o.reference}</Txt>
              <Row gap={8}>
                <Txt variant="title">{o.amount}</Txt>
                <Badge label={orderLabel[o.status] ?? o.status} tone="gold" />
              </Row>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
