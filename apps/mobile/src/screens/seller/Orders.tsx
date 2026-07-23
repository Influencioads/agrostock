import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { nextStatusFor, type ApiDirectoryEntry, type ApiOrder, type ApiOrderDetail, type ApiOrderStatus } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage, orderLabel, orderTone } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, ChipSelect, EmptyState, Input, Row, Screen, Segmented, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { OrderDetailSheet, OtpCard, useOrderInvalidation } from '../components/order-parts';
import { ArrangeLogisticsSheet } from '../components/ArrangeLogisticsSheet';
import { OrderReviewButton } from '../components/ReviewSheet';

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3" style={{ flexShrink: 1 }}>{title}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
          </Row>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Seller answers a buyer's enquiry with a firm per-unit price. */
function RespondSheet({ order, onClose }: { order: ApiOrder; onClose: () => void }) {
  const { t } = useI18n();
  const [price, setPrice] = useState(String((order.unitPriceCents ?? 0) / 100));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const respond = useMutation({
    mutationFn: () => api.orders.respond(order.id, { unitPriceCents: Math.round(Number(price) * 100), note }),
    onSuccess: () => { invalidate(); onClose(); },
    onError: (e) => setError(errMessage(e, t('sellerX.orders.quoteError'))),
  });

  const qty = order.qtyValue ?? 0;

  return (
    <Sheet title={t('sellerX.orders.respondTitle', { ref: order.reference })} onClose={onClose}>
      {!!order.note && <Txt variant="muted">{t('sellerX.orders.buyerNote', { note: order.note })}</Txt>}
      {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
      <Input label={t('sellerX.orders.pricePerUnit', { unit: order.qtyUnit ?? 'MT' })} keyboardType="numeric" value={price} onChangeText={setPrice} />
      <Txt variant="muted">{qty} {order.qtyUnit ?? 'MT'} × ${price || 0} = ${(Number(price) * qty).toLocaleString()}</Txt>
      <Input label={t('sellerX.orders.noteOptional')} placeholder={t('sellerX.orders.phNote')} value={note} onChangeText={setNote} />
      <Button title={respond.isPending ? t('sellerX.orders.sending') : t('sellerX.orders.sendQuote')} disabled={!Number(price) || respond.isPending} onPress={() => respond.mutate()} full />
    </Sheet>
  );
}

/**
 * Dispatch. Either hand the load to an AgroTraders transporter (a Trip is created)
 * or type in an external carrier. Either way the server mints both OTPs and
 * returns the seller's pickup code — so the sheet stays open to show it.
 */
function DispatchSheet({ order, onClose }: { order: ApiOrder; onClose: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'platform' | 'external'>('platform');
  const [transporterUserId, setTransporterUserId] = useState('');
  const [f, setF] = useState({ transporterName: '', transporterPhone: '', vehiclePlate: '', driverName: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState<ApiOrderDetail | null>(null);
  const invalidate = useOrderInvalidation();
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const { data: transporters = [] } = useQuery<ApiDirectoryEntry[]>({
    queryKey: ['directory', 'transporters'],
    queryFn: () => api.directory.transporters({}),
    enabled: mode === 'platform' && !done,
  });

  const dispatch = useMutation({
    mutationFn: () => api.orders.dispatch(order.id, mode === 'platform' ? { mode, transporterUserId } : { mode, ...f }),
    onSuccess: (r) => { setError(''); setDone(r); invalidate(); },
    onError: (e) => setError(errMessage(e, t('sellerX.orders.dispatchError'))),
  });

  const ready = mode === 'platform' ? !!transporterUserId : f.transporterName.trim().length > 1;

  if (done) {
    return (
      <Sheet title={t('sellerX.orders.dispatchedTitle', { ref: order.reference })} onClose={onClose}>
        {done.pickupOtp ? (
          <OtpCard label={t('sellerX.orders.pickupOtp')} code={done.pickupOtp} hint={t('sellerX.orders.pickupHint')} />
        ) : (
          <Txt variant="muted">{t('sellerX.orders.dispatched')}</Txt>
        )}
        <Txt variant="muted">
          {t('sellerX.orders.deliveryOtpNote')}
        </Txt>
        <Button title={t('sellerX.orders.done')} onPress={onClose} full />
      </Sheet>
    );
  }

  return (
    <Sheet title={t('sellerX.orders.dispatchTitle', { ref: order.reference })} onClose={onClose}>
      <Segmented
        options={[{ id: 'platform', label: 'AgroTraders' }, { id: 'external', label: t('sellerX.orders.external') }]}
        value={mode}
        onChange={(m) => setMode(m as 'platform' | 'external')}
      />
      {!!error && <Txt color={C.error} variant="small">{error}</Txt>}

      {mode === 'platform' ? (
        <ChipSelect
          label={t('sellerX.orders.transporter')}
          options={transporters.map((tr) => ({ id: tr.id, label: tr.name }))}
          value={transporterUserId}
          onChange={setTransporterUserId}
        />
      ) : (
        <>
          <Input label={t('sellerX.orders.transporterName')} value={f.transporterName} onChangeText={set('transporterName')} />
          <Input label={t('sellerX.orders.phone')} keyboardType="phone-pad" value={f.transporterPhone} onChangeText={set('transporterPhone')} />
          <Input label={t('sellerX.orders.vehicleNumber')} value={f.vehiclePlate} onChangeText={set('vehiclePlate')} />
          <Input label={t('sellerX.orders.driverName')} value={f.driverName} onChangeText={set('driverName')} />
        </>
      )}

      <Txt variant="muted">
        {t('sellerX.orders.otpNote')}
      </Txt>
      <Button
        title={dispatch.isPending ? t('sellerX.orders.dispatching') : t('sellerX.orders.dispatchGenerate')}
        disabled={!ready || dispatch.isPending}
        onPress={() => dispatch.mutate()}
        full
      />
    </Sheet>
  );
}

export function SellerOrders() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [respondTo, setRespondTo] = useState<ApiOrder | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<ApiOrder | null>(null);
  const [logisticsFor, setLogisticsFor] = useState<ApiOrder | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const { data: orders = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'incoming'],
    queryFn: () => api.orders.incoming(),
    enabled: !!user,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApiOrderStatus }) => api.orders.setStatus(id, status),
    onSuccess: () => { setError(''); invalidate(); },
    onError: (e) => setError(errMessage(e, t('sellerX.orders.updateError'))),
  });

  const invoice = useMutation({
    mutationFn: (id: string) => api.invoices.create({ kind: 'order', subjectId: id }),
    onSuccess: () => { setError(''); invalidate(); },
    onError: (e) => setError(errMessage(e, t('sellerX.orders.invoiceError'))),
  });

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('sellerX.orders.title')}</Txt>
      {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
      {isLoading ? (
        <SkeletonRows />
      ) : orders.length === 0 ? (
        <EmptyState icon="cube-outline" title={t('sellerX.orders.emptyTitle')} body={t('sellerX.orders.emptyBody')} />
      ) : (
        orders.map((o) => {
          const next = nextStatusFor(o.status, 'seller');
          const canInvoice = ['dispatched', 'in_transit', 'delivered'].includes(o.status);
          return (
            <Card key={o.id} style={{ gap: 10 }} onPress={() => setDetailId(o.id)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="title">{o.product?.name ?? t('sellerX.orders.orderFallback')}</Txt>
                  <Txt variant="muted">#{o.reference} · {o.buyer?.name}</Txt>
                </View>
                <Txt variant="title">{o.amount}</Txt>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge label={orderLabel[o.status] ?? o.status} tone={orderTone[o.status] ?? 'slate'} />
                <Row gap={8}>
                  {o.status === 'enquiry' && <Button title={t('sellerX.orders.respond')} size="sm" onPress={() => setRespondTo(o)} />}
                  {!!next && o.status !== 'enquiry' && (
                    <Button title={t('sellerX.orders.mark', { status: orderLabel[next] })} size="sm" loading={advance.isPending} onPress={() => advance.mutate({ id: o.id, status: next })} />
                  )}
                  {['processing', 'paid', 'packed'].includes(o.status) && (
                    <Button title={t('sellerX.orders.logistics')} size="sm" variant="outline" onPress={() => setLogisticsFor(o)} />
                  )}
                  {o.status === 'packed' && <Button title={t('sellerX.orders.dispatch')} size="sm" onPress={() => setDispatchOrder(o)} />}
                  {canInvoice && <Button title={t('sellerX.orders.invoice')} size="sm" variant="outline" loading={invoice.isPending} onPress={() => invoice.mutate(o.id)} />}
                </Row>
              </Row>
              {o.status === 'delivered' && <OrderReviewButton orderId={o.id} />}
            </Card>
          );
        })
      )}

      {respondTo && <RespondSheet order={respondTo} onClose={() => setRespondTo(null)} />}
      {dispatchOrder && <DispatchSheet order={dispatchOrder} onClose={() => setDispatchOrder(null)} />}
      {detailId && <OrderDetailSheet orderId={detailId} onClose={() => setDetailId(null)} />}
      {logisticsFor && <ArrangeLogisticsSheet order={logisticsFor} onClose={() => setLogisticsFor(null)} />}
    </Screen>
  );
}
