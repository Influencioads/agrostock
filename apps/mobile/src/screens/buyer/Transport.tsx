import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiOrder, ApiOrderDetail } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage, orderLabel, orderTone } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Input, ProgressBar, Row, Screen, Segmented, SkeletonRows, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { OrderDetailSheet, OtpCard, ShipmentFacts, progressOf } from '../components/order-parts';

interface Req {
  id: string; reference: string; fromCity: string; toCity: string; cargo: string;
  status: string; quotes?: { id: string; priceCents: number; transporter?: { name: string } }[];
  trip?: { reference: string; status: string } | null;
}
const blank = { fromCity: '', toCity: '', cargo: '', weightMt: '' };

/**
 * One in-transit consignment. The list payload is thin, so the per-shipment
 * detail (carrier, vehicle, driver, delivery OTP) is fetched on demand.
 */
function ShipmentCard({ order, onOpen }: { order: ApiOrder; onOpen: () => void }) {
  const { t } = useI18n();
  const { data: detail } = useQuery<ApiOrderDetail>({
    queryKey: ['order-detail', order.id],
    queryFn: () => api.orders.get(order.id),
    refetchInterval: order.status === 'delivered' ? false : 20000,
  });

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1 }}>
          <Txt variant="title">{order.product?.name ?? t('buyerX.transport.shipmentFallback')}</Txt>
          <Txt variant="muted">
            #{order.reference} · {detail?.trip ? `${detail.trip.fromCity} → ${detail.trip.toCity}` : `${order.seller?.country ?? t('buyerX.transport.origin')} → ${order.buyer?.country ?? t('buyerX.transport.destination')}`}
          </Txt>
        </View>
        <Badge label={orderLabel[order.status] ?? order.status} tone={orderTone[order.status] ?? 'slate'} />
      </Row>

      <ProgressBar pct={progressOf(order.status)} />

      {detail && <ShipmentFacts order={detail} />}

      {detail?.deliveryOtp && detail.status !== 'delivered' && (
        <OtpCard
          label={t('buyerX.transport.deliveryOtp')}
          code={detail.deliveryOtp}
          hint={t('buyerX.transport.otpHint')}
        />
      )}

      <Button title={t('buyerX.transport.fullDetails')} size="sm" variant="outline" onPress={onOpen} />
    </Card>
  );
}

/** Transport — live shipments for the buyer's orders, plus freight requests. */
export function BuyerTransport() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState('shipments');
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: orders = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'mine'], queryFn: () => api.orders.mine(), enabled: !!user,
  });
  const { data: requests = [] } = useQuery<Req[]>({
    queryKey: ['transport', 'mine'], queryFn: () => api.transport.myRequests() as Promise<Req[]>, enabled: !!user,
  });
  const create = useMutation({
    mutationFn: () => api.transport.createRequest(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport', 'mine'] });
      setForm(blank); setOpen(false); setErr('');
    },
    onError: (e) => setErr(errMessage(e, t('buyerX.transport.errCreate'))),
  });
  const canSubmit = !!form.fromCity && !!form.toCity && !!form.cargo;

  const shipments = orders.filter((o) => ['dispatched', 'shipped', 'in_transit', 'delivered'].includes(o.status));

  return (
    <Screen>
      <Txt variant="h2">{t('buyerX.transport.screenTitle')}</Txt>
      <Segmented
        options={[{ id: 'shipments', label: t('buyerX.transport.tabShipments') }, { id: 'requests', label: t('buyerX.transport.tabRequests') }]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'shipments' ? (
        isLoading ? (
          <SkeletonRows />
        ) : shipments.length === 0 ? (
          <EmptyState icon="car-outline" title={t('buyerX.transport.emptyShipTitle')} body={t('buyerX.transport.emptyShipBody')} />
        ) : (
          shipments.map((o) => <ShipmentCard key={o.id} order={o} onOpen={() => setOpenId(o.id)} />)
        )
      ) : (
        <>
          <Button title={open ? t('buyerX.transport.close') : t('buyerX.transport.newRequest')} size="sm" icon={open ? 'close' : 'add'} variant={open ? 'outline' : 'primary'} onPress={() => setOpen((o) => !o)} />
          {open && (
            <Card style={{ gap: 12 }}>
              <Txt variant="title">{t('buyerX.transport.newRequestTitle')}</Txt>
              {!!err && <Txt color={C.error} variant="small">{err}</Txt>}
              <Row gap={10}>
                <View style={{ flex: 1 }}><Input label={t('buyerX.transport.fieldFrom')} placeholder={t('pubX.ph.cityMundra')} value={form.fromCity} onChangeText={set('fromCity')} /></View>
                <View style={{ flex: 1 }}><Input label={t('buyerX.transport.fieldTo')} placeholder={t('pubX.ph.cityDubai')} value={form.toCity} onChangeText={set('toCity')} /></View>
              </Row>
              <Input label={t('buyerX.transport.fieldCargo')} placeholder={t('pubX.ph.cargoBasmati500')} value={form.cargo} onChangeText={set('cargo')} />
              <Input label={t('buyerX.transport.fieldWeight')} keyboardType="numeric" placeholder="500" value={form.weightMt} onChangeText={set('weightMt')} />
              <Button title={create.isPending ? t('buyerX.transport.creating') : t('buyerX.transport.createRequest')} disabled={!canSubmit || create.isPending} onPress={() => create.mutate()} />
            </Card>
          )}
          {requests.length === 0 ? (
            <EmptyState icon="car-outline" title={t('buyerX.transport.emptyReqTitle')} body={t('buyerX.transport.emptyReqBody')} />
          ) : (
            requests.map((r) => (
              <Card key={r.id} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="title">{r.fromCity} → {r.toCity}</Txt>
                  <Badge label={r.trip ? r.trip.status : r.status} tone={r.trip ? 'info' : 'slate'} />
                </Row>
                <Txt variant="muted">#{r.reference} · {r.cargo}</Txt>
                <Txt variant="muted">{t('buyerX.transport.quoteCount', { count: r.quotes?.length ?? 0 })}{r.trip ? t('buyerX.transport.tripSuffix', { ref: r.trip.reference }) : ''}</Txt>
              </Card>
            ))
          )}
        </>
      )}

      {openId && <OrderDetailSheet orderId={openId} onClose={() => setOpenId(null)} />}
    </Screen>
  );
}
