import { Image, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiOrder } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { orderLabel, orderTone } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Card, EmptyState, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C, radius } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { OtpEntry } from '../components/order-parts';

/**
 * The transporter's work queue. They enter the seller's pickup OTP to start the
 * trip, and the buyer's delivery OTP to close it.
 */
export function TransporterLoads() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'transporting'],
    queryFn: () => api.orders.transporting(),
    enabled: !!user,
    refetchInterval: 20000,
  });

  return (
    <Screen>
      <Txt variant="h2">{t('transX.loads.title')}</Txt>
      <Txt variant="muted">{t('transX.loads.subtitle')}</Txt>

      {isLoading ? (
        <SkeletonRows />
      ) : orders.length === 0 ? (
        <EmptyState icon="cube-outline" title={t('transX.loads.emptyTitle')} body={t('transX.loads.emptyBody')} />
      ) : (
        orders.map((o) => (
          <Card key={o.id} style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={10} style={{ flexShrink: 1 }}>
                {o.product?.imageUrl ? (
                  <Image source={{ uri: assetUrl(o.product.imageUrl) }} style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: C.surface }} />
                ) : null}
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="title">{o.product?.name ?? t('transX.loads.loadFallback')}</Txt>
                  <Txt variant="muted">
                    #{o.reference} · {o.seller?.name} → {o.buyer?.name}
                    {o.qty ? ` · ${o.qty}` : ''}
                    {o.driverName ? ` · ${o.driverName}` : ''}
                    {o.vehiclePlate ? ` · ${o.vehiclePlate}` : ''}
                  </Txt>
                </View>
              </Row>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt variant="title">{o.amount}</Txt>
                <Badge label={orderLabel[o.status] ?? o.status} tone={orderTone[o.status] ?? 'slate'} />
              </View>
            </Row>

            {o.status === 'dispatched' && <OtpEntry orderId={o.id} kind="pickup" />}
            {o.status === 'in_transit' && <OtpEntry orderId={o.id} kind="delivery" />}
          </Card>
        ))
      )}
    </Screen>
  );
}
