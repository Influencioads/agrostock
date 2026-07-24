import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { canCancel, canDispute, nextStatusFor, type ApiOrder, type ApiOrderStatus } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage, orderLabel, orderTone } from '../../lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { OrderDetailSheet, OrderSteps, useOrderInvalidation } from '../components/order-parts';
import { OrderReviewButton } from '../components/ReviewSheet';

export function BuyerOrders() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const { data: orders = [], isLoading, isError, refetch } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'mine'],
    queryFn: () => api.orders.mine(),
    enabled: !!user,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApiOrderStatus }) => api.orders.setStatus(id, status),
    onSuccess: () => { setError(''); invalidate(); },
    onError: (e) => setError(errMessage(e, t('buyerX.orders.errUpdate'))),
  });

  // F03: confirm before taking a destructive exit path (cancel / dispute).
  const confirmExit = (id: string, status: 'cancelled' | 'dispute') => {
    const msg = status === 'cancelled' ? t('buyerX.orders.confirmCancel') : t('buyerX.orders.confirmDispute');
    const yes = status === 'cancelled' ? t('buyerX.orders.cancelOrder') : t('buyerX.orders.openDispute');
    Alert.alert(yes, msg, [
      { text: t('common:cancel'), style: 'cancel' },
      { text: yes, style: 'destructive', onPress: () => advance.mutate({ id, status }) },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('buyerX.orders.screenTitle')}</Txt>
      {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
      {!user ? (
        <EmptyState icon="lock-closed-outline" title={t('buyerX.orders.signInTitle')} body={t('buyerX.orders.signInBody')} />
      ) : isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState title={t('common:errorTitle')} body={t('common:errorBody')} onRetry={() => refetch()} retryLabel={t('common:retry')} />
      ) : orders.length === 0 ? (
        <EmptyState icon="cube-outline" title={t('buyerX.orders.emptyTitle')} body={t('buyerX.orders.emptyBody')} />
      ) : (
        orders.map((o) => {
          // Buyers accept a quote and release escrow; the rest is the seller's or
          // the transporter's move (and dispatch/delivery need an OTP).
          // D4/BL-03: `paid` is excluded — no API transition reaches it, so the
          // "Pay escrow" button could never fire and only advertised a payment
          // step that does not exist yet.
          const nextRaw = nextStatusFor(o.status, 'buyer');
          const next = nextRaw === 'paid' ? null : nextRaw;
          const cancellable = canCancel(o.status, 'buyer');
          const disputable = canDispute(o.status, 'buyer');
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

              <OrderSteps status={o.status} />

              <Row gap={8} style={{ justifyContent: 'flex-end' }}>
                <Button
                  title={o.status === 'dispatched' || o.status === 'in_transit' ? t('buyerX.orders.detailsOtp') : t('buyerX.orders.details')}
                  size="sm"
                  variant="outline"
                  onPress={() => setOpenId(o.id)}
                />
                {disputable && (
                  <Button
                    title={t('buyerX.orders.openDispute')}
                    size="sm"
                    variant="outline"
                    disabled={advance.isPending}
                    onPress={() => confirmExit(o.id, 'dispute')}
                  />
                )}
                {cancellable && (
                  <Button
                    title={t('buyerX.orders.cancelOrder')}
                    size="sm"
                    variant="outline"
                    disabled={advance.isPending}
                    onPress={() => confirmExit(o.id, 'cancelled')}
                  />
                )}
                {!!next && (
                  <Button
                    title={next === 'processing' ? t('buyerX.orders.acceptQuote') : t('buyerX.orders.mark', { label: orderLabel[next] })}
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
