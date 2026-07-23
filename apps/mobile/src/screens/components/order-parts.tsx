import { Fragment, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ORDER_STEPS, type ApiOrderDetail, type ApiOrderStatus } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage, orderLabel, orderTone } from '../../lib/format';
import { Badge, Button, Card, Input, ProgressBar, Row, SkeletonRows, Txt } from '../../ui';
import { C, space, type } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { alignEnd } from '../../lib/rtl';

/**
 * Four-stage horizontal stepper for an order card — Escrow → Dispatched →
 * In transit → QC & release — with the many API statuses bucketed into those
 * stages, matching the prototype's order timeline.
 */
const STEP_BUCKET: Partial<Record<ApiOrderStatus, number>> = {
  enquiry: 0, quote: 0, processing: 0, paid: 0,
  packed: 1, dispatched: 1,
  shipped: 2, in_transit: 2,
  delivered: 3,
};
export function OrderSteps({ status }: { status: ApiOrderStatus }) {
  const { t } = useI18n();
  const cur = STEP_BUCKET[status] ?? 0;
  const labels = [t('buyerX.orders.stepEscrow'), t('buyerX.orders.stepDispatched'), t('buyerX.orders.stepTransit'), t('buyerX.orders.stepRelease')];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {labels.map((_, i) => {
          const done = i < cur;
          const current = i === cur;
          return (
            <Fragment key={i}>
              {i > 0 ? <View style={{ flex: 1, height: 2, backgroundColor: i <= cur ? C.green : C.border }} /> : null}
              <View
                style={[
                  ts.dot,
                  done && { backgroundColor: C.green, borderColor: C.green },
                  current && { backgroundColor: C.white, borderColor: C.green, borderWidth: 3 },
                  !done && !current && { backgroundColor: C.page, borderColor: C.border },
                ]}
              />
            </Fragment>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {labels.map((l, i) => (
          <Text
            key={i}
            numberOfLines={1}
            style={[ts.label, { flex: 1, textAlign: i === 0 ? 'left' : i === labels.length - 1 ? 'right' : 'center', color: i <= cur ? C.ink : C.inkMuted }]}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const ts = StyleSheet.create({
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  label: { ...type.caption, fontSize: 11 },
});

/** Refresh every list/detail that can show an order after it moves. */
export function useOrderInvalidation() {
  const qc = useQueryClient();
  return () => {
    for (const key of [['orders'], ['order-detail'], ['invoices'], ['me', 'dashboard']]) {
      qc.invalidateQueries({ queryKey: key });
    }
  };
}

/** Progress along the real lifecycle — no invented percentages. */
export function progressOf(status: ApiOrderStatus) {
  const i = ORDER_STEPS.indexOf(status);
  return i < 0 ? 0 : ((i + 1) / ORDER_STEPS.length) * 100;
}

/**
 * The party-specific OTP. The server only sends the seller a `pickupOtp` and the
 * buyer a `deliveryOtp`, so rendering whichever arrived is safe.
 */
export function OtpCard({ label, code, hint }: { label: string; code: string; hint: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <Card style={{ backgroundColor: C.evergreen, gap: 6 }}>
      <Txt variant="small" color={C.mint}>{label.toUpperCase()}</Txt>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt style={{ fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 8 }}>{code}</Txt>
        <Button
          title={copied ? t('compX.order.copied') : t('compX.order.copy')}
          size="sm"
          variant="outline"
          onPress={async () => {
            await Clipboard.setStringAsync(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        />
      </Row>
      <Txt variant="small" color={C.mint}>{hint}</Txt>
    </Card>
  );
}

/** Transporter-facing OTP entry. `kind` picks which handshake we're closing. */
export function OtpEntry({ orderId, kind }: { orderId: string; kind: 'pickup' | 'delivery' }) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const verify = useMutation<{ ok: true; status: ApiOrderStatus }>({
    mutationFn: () => (kind === 'pickup' ? api.orders.verifyPickup(orderId, code) : api.orders.verifyDelivery(orderId, code)),
    onSuccess: () => { setError(''); setCode(''); invalidate(); },
    onError: (e) => setError(errMessage(e, t('compX.order.verifyError'))),
  });

  return (
    <View style={{ gap: 8 }}>
      <Input
        label={kind === 'pickup' ? t('compX.order.pickupOtpLabel') : t('compX.order.deliveryOtpLabel')}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={8}
        placeholder="0000"
        error={error || undefined}
      />
      <Button
        title={verify.isPending ? t('compX.order.checking') : t('compX.order.confirm')}
        disabled={code.length < 4 || verify.isPending}
        onPress={() => verify.mutate()}
      />
    </View>
  );
}

/** Carrier, vehicle, driver and handshake timestamps. */
export function ShipmentFacts({ order }: { order: ApiOrderDetail }) {
  const { t } = useI18n();
  const rows: [string, string | null | undefined][] = [
    [t('compX.order.facts.carrier'), order.transporterName],
    [t('compX.order.facts.phone'), order.transporterPhone],
    [t('compX.order.facts.vehicle'), order.vehiclePlate],
    [t('compX.order.facts.driver'), order.driverName],
    [t('compX.order.facts.route'), order.trip ? `${order.trip.fromCity} → ${order.trip.toCity}` : null],
    [t('compX.order.facts.dispatched'), order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : null],
    [t('compX.order.facts.pickedUp'), order.pickupVerifiedAt ? new Date(order.pickupVerifiedAt).toLocaleString() : null],
    [t('compX.order.facts.delivered'), order.deliveryVerifiedAt ? new Date(order.deliveryVerifiedAt).toLocaleString() : null],
  ];
  const shown = rows.filter(([, v]) => !!v);
  if (shown.length === 0) return <Txt variant="muted">{t('compX.order.notDispatched')}</Txt>;
  return (
    <View style={{ gap: 6 }}>
      {shown.map(([k, v]) => (
        <Row key={k} style={{ justifyContent: 'space-between' }}>
          <Txt variant="muted">{k}</Txt>
          <Txt variant="small" style={{ fontWeight: '600', flexShrink: 1, textAlign: alignEnd() }}>{v}</Txt>
        </Row>
      ))}
    </View>
  );
}

/** Real timeline straight off `OrderEvent[]`. */
export function OrderTimeline({ events }: { events: ApiOrderDetail['events'] }) {
  const { t } = useI18n();
  if (events.length === 0) return <Txt variant="muted">{t('compX.order.noActivity')}</Txt>;
  return (
    <View style={{ gap: 10 }}>
      {events.map((e) => (
        <Row key={e.id} gap={10} style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green, marginTop: 6 }} />
          <View style={{ flex: 1 }}>
            <Txt variant="small" style={{ fontWeight: '600' }}>
              {e.toStatus ? orderLabel[e.toStatus] ?? e.toStatus : e.type.replace(/_/g, ' ')}
            </Txt>
            <Txt variant="muted">
              {new Date(e.createdAt).toLocaleString()}{e.actor ? ` · ${e.actor.name}` : ''}
            </Txt>
            {!!e.note && <Txt variant="muted">“{e.note}”</Txt>}
          </View>
        </Row>
      ))}
    </View>
  );
}

/** Bottom-sheet order detail: stepper, party OTP, shipment facts, timeline. */
export function OrderDetailSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data: order, isLoading } = useQuery<ApiOrderDetail>({
    queryKey: ['order-detail', orderId],
    queryFn: () => api.orders.get(orderId),
    refetchInterval: 10000,
  });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{order ? t('compX.order.title', { ref: order.reference }) : t('compX.order.order')}</Txt>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.inkSoft} />
            </Pressable>
          </Row>

          {isLoading || !order ? (
            <SkeletonRows />
          ) : (
            <>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="title">{order.product?.name ?? t('compX.order.order')}</Txt>
                  <Txt variant="muted">{order.qty} · {order.seller?.name}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Txt variant="title">{order.amount}</Txt>
                  <Badge label={orderLabel[order.status] ?? order.status} tone={orderTone[order.status] ?? 'slate'} />
                </View>
              </Row>

              <ProgressBar pct={progressOf(order.status)} />

              {!!order.pickupOtp && order.status === 'dispatched' && (
                <OtpCard label={t('compX.order.pickupOtp')} code={order.pickupOtp} hint={t('compX.order.pickupHint')} />
              )}
              {!!order.deliveryOtp && (order.status === 'dispatched' || order.status === 'in_transit') && (
                <OtpCard label={t('compX.order.deliveryOtp')} code={order.deliveryOtp} hint={t('compX.order.deliveryHint')} />
              )}

              <Card style={{ gap: 8 }}>
                <Txt variant="title">{t('compX.order.shipment')}</Txt>
                <ShipmentFacts order={order} />
              </Card>

              <Card style={{ gap: 10 }}>
                <Txt variant="title">{t('compX.order.timeline')}</Txt>
                <OrderTimeline events={order.events} />
              </Card>

              {order.invoices.length > 0 && (
                <Card style={{ gap: 10 }}>
                  <Txt variant="title">{t('compX.order.invoices')}</Txt>
                  {order.invoices.map((inv) => (
                    <Row key={inv.id} style={{ justifyContent: 'space-between' }}>
                      <Txt variant="small">{inv.number}</Txt>
                      <OpenInvoiceButton id={inv.id} />
                    </Row>
                  ))}
                </Card>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * Fetches a short-lived signed URL and hands it to the OS. The token rides in
 * the query string because `Linking.openURL` cannot attach an auth header.
 */
export function OpenInvoiceButton({ id, title }: { id: string; title?: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      title={busy ? t('compX.order.preparing') : (title ?? t('compX.order.openPdf'))}
      size="sm"
      variant="outline"
      disabled={busy}
      onPress={async () => {
        setBusy(true);
        try {
          await Linking.openURL(await api.invoices.pdfUrl(id));
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
