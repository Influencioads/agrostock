import { useMemo } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiOrder } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { compactUsd, parseAmount, usd } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { BarChart } from '../../ui/charts';
import { Card, Row, Screen, Stat, Txt } from '../../ui';
import { C } from '../../theme/tokens';

export function BuyerDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: dash } = useQuery<{ kpis: Record<string, number> }>({ queryKey: ['me-dashboard'], queryFn: () => api.me.dashboard(), enabled: !!user });
  const { data: wallet } = useQuery<{ balanceCents: number }>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>, enabled: !!user });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series(), enabled: !!user });
  const { data: orders = [] } = useQuery<ApiOrder[]>({ queryKey: ['orders', 'mine'], queryFn: () => api.orders.mine() as Promise<ApiOrder[]>, enabled: !!user });

  const kpis = dash?.kpis ?? {};
  const pending = useMemo(() => {
    const due = orders.filter((o) => o.status === 'processing' || o.status === 'paid');
    return { count: due.length, total: due.reduce((s, o) => s + parseAmount(o.amount), 0) * 100 };
  }, [orders]);
  const deliveries = orders.filter((o) => ['shipped', 'in_transit'].includes(o.status)).slice(0, 4);

  return (
    <Screen>
      <Txt variant="h2">{t('dash.welcome', { name: (user?.name ?? t('dash.nameFallback')).split(' ')[0] })}</Txt>
      <Txt variant="muted">{t('dash.buyerSub')}</Txt>

      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="cube-outline" value={String(kpis.active ?? 0)} label={t('dash.activeOrders')} delta={`+${Math.max((kpis.orders ?? 0) - (kpis.active ?? 0), 0)}`} />
        <Stat icon="wallet-outline" value={usd(pending.total)} label={t('dash.pendingPayments')} delta={t('dash.due', { count: pending.count })} deltaUp={false} />
      </Row>
      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        <Stat icon="pricetag-outline" value={String(kpis.bids ?? 0)} label={t('dash.activeBids')} delta={t('dash.live')} />
        <Stat icon="shield-checkmark-outline" value={usd(wallet?.balanceCents)} label={t('dash.safeDeal')} delta={t('dash.escrow')} />
      </Row>

      <BarChart title={t('dash.procurementSpend')} caption={t('dash.perMonth')} data8={series?.data8} data12={series?.data12} />

      <Card style={{ gap: 14 }}>
        <Txt variant="h3">{t('dash.activeDeliveries')}</Txt>
        {deliveries.length === 0 ? (
          <Txt variant="muted">{t('dash.noShipments')}</Txt>
        ) : (
          deliveries.map((o, i) => (
            <View key={o.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="title">{o.product?.name ?? t('dash.shipmentFallback')}</Txt>
                <Txt variant="muted">{t('dash.etaDays', { count: o.status === 'in_transit' ? 2 + i : 5 + i })}</Txt>
              </Row>
              <View style={{ height: 6, borderRadius: 6, backgroundColor: C.border, overflow: 'hidden' }}>
                <View style={{ width: `${o.status === 'in_transit' ? 72 : 35}%`, height: '100%', backgroundColor: C.green }} />
              </View>
            </View>
          ))
        )}
      </Card>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt variant="title">{t('dash.totalSpent')}</Txt>
        <Txt variant="title" color={C.green}>{compactUsd(orders.reduce((s, o) => s + parseAmount(o.amount), 0))}</Txt>
      </Card>
    </Screen>
  );
}
