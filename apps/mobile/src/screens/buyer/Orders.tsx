import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { nextStatusFor, type ApiOrder, type ApiOrderStatus } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage, orderLabel, orderTone } from '../../lib/format';
import { Badge, Button, Card, EmptyState, Loading, ProgressBar, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { OrderDetailSheet, progressOf, useOrderInvalidation } from '../components/order-parts';
import { OrderReviewButton } from '../components/ReviewSheet';

export function BuyerOrders() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const { data: orders = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'mine'],
    queryFn: () => api.orders.mine(),
    enabled: !!user,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApiOrderStatus }) => api.orders.setStatus(id, status),
    onSuccess: () => { setError(''); invalidate(); },
    onError: (e) => setError(errMessage(e, t('buyerX.orders.errUpdate'))),
  });

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('buyerX.orders.screenTitle')}</Txt>
      {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
      {!user ? (
        <EmptyState icon="lock-closed-outline" title={t('buyerX.orders.signInTitle')} body={t('buyerX.orders.signInBody')} />
      ) : isLoading ? (
        <Loading />
      ) : orders.length === 0 ? (
        <EmptyState icon="cube-outline" title={t('buyerX.orders.emptyTitle')} body={t('buyerX.orders.emptyBody')} />
      ) : (
        orders.map((o) => {
          // Buyers accept a quote and release escrow; the rest is the seller's or
          // the transporter's move (and dispatch/delivery need an OTP).
          const next = nextStatusFor(o.status, 'buyer');
          return (
            <Card key={o.id} style={{ gap: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={10}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontSize: 20 }}>{o.product?.emoji ?? '🌾'}</Txt>
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Txt variant="title">{o.product?.name ?? t('buyerX.orders.orderFallback')}</Txt>
                    <Txt variant="muted">#{o.reference} · {o.seller?.name}</Txt>
                  </View>
                </Row>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Txt variant="title">{o.amount}</Txt>
                  <Badge label={orderLabel[o.status] ?? o.status} tone={orderTone[o.status] ?? 'slate'} />
                </View>
              </Row>

              <ProgressBar pct={progressOf(o.status)} />

              <Row gap={8} style={{ justifyContent: 'flex-end' }}>
                <Button
                  title={o.status === 'dispatched' || o.status === 'in_transit' ? t('buyerX.orders.detailsOtp') : t('buyerX.orders.details')}
                  size="sm"
                  variant="outline"
                  onPress={() => setOpenId(o.id)}
                />
                {!!next && (
                  <Button
                    title={next === 'processing' ? t('buyerX.orders.acceptQuote') : next === 'paid' ? t('buyerX.orders.payEscrow') : t('buyerX.orders.mark', { label: orderLabel[next] })}
                    size="sm"
                    disabled={advance.isPending}
                    onPress={() => advance.mutate({ id: o.id, status: next })}
                  />
                )}
              </Row>

              {o.status === 'delivered' && <OrderReviewButton orderId={o.id} />}
            </Card>
          );
        })
      )}
      {openId && <OrderDetailSheet orderId={openId} onClose={() => setOpenId(null)} />}
    </Screen>
  );
}
