import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal } from '@agrotraders/ui';
import {
  ORDER_STEPS,
  type ApiDirectoryEntry,
  type ApiOrderDetail,
  type ApiOrderStatus,
} from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { orderLabel, orderTone } from '../lib';

/** Refresh every list/detail that can show an order after it moves. */
export function useOrderInvalidation() {
  const qc = useQueryClient();
  return () => {
    for (const key of ['my-orders', 'incoming-orders', 'transporting-orders', 'order-detail', 'my-invoices', 'me-dashboard']) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function errMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
}

/** Horizontal stepper over the happy path, filled up to the order's position. */
export function OrderStepper({ status }: { status: ApiOrderStatus }) {
  const { t } = useI18n();
  const idx = ORDER_STEPS.indexOf(status);
  if (idx < 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1">
        {ORDER_STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className={'h-1.5 flex-1 rounded-full ' + (i <= idx ? 'bg-brand' : 'bg-surface-border')} />
            {i < ORDER_STEPS.length - 1 && (
              <Icon name="chevronRight" size={12} className={i < idx ? 'text-brand' : 'text-surface-border'} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
        <span>{t('console.order.stepEnquiry')}</span>
        <span>{t('console.order.stepPlaced')}</span>
        <span>{t('console.order.stepDispatched')}</span>
        <span>{t('console.order.stepDelivered')}</span>
      </div>
    </div>
  );
}

/** The real timeline, straight off `OrderEvent[]` — no invented timestamps. */
export function OrderTimeline({ events }: { events: ApiOrderDetail['events'] }) {
  const { t } = useI18n();
  if (events.length === 0) return <p className="text-sm text-ink-soft">{t('console.order.noActivity')}</p>;
  return (
    <ol className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">
              {e.toStatus ? t(`enums:order_status.${e.toStatus}`, { defaultValue: orderLabel[e.toStatus] ?? e.toStatus }) : e.type.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-ink-soft">
              {new Date(e.createdAt).toLocaleString()}
              {e.actor ? ` · ${e.actor.name}` : ''}
            </div>
            {e.note && <div className="mt-0.5 text-xs text-ink-soft">“{e.note}”</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The party-specific OTP. The server only ever sends the seller a `pickupOtp`
 * and the buyer a `deliveryOtp`, so rendering whichever arrived is safe.
 */
export function OtpCard({ label, code, hint }: { label: string; code: string; hint: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <Card className="bg-brand-dock text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-mint/80">{label}</div>
          <div className="font-numeric text-3xl font-extrabold tracking-[0.3em]">{code}</div>
          <p className="mt-1 max-w-md text-xs text-mint/70">{hint}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-white/30 text-white hover:bg-white/10"
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? t('console.order.copied') : t('console.order.copy')}
        </Button>
      </div>
    </Card>
  );
}

/** Transporter-facing OTP entry. `kind` picks which handshake we're closing. */
export function OtpEntry({ orderId, kind, onDone }: { orderId: string; kind: 'pickup' | 'delivery'; onDone?: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();
  const verify = useMutation<{ ok: true; status: ApiOrderStatus }>({
    mutationFn: () => (kind === 'pickup' ? api.orders.verifyPickup(orderId, code) : api.orders.verifyDelivery(orderId, code)),
    onSuccess: () => {
      setError('');
      setCode('');
      invalidate();
      onDone?.();
    },
    onError: (e) => setError(errMessage(e, t('console.order.verifyError'))),
  });

  return (
    <div>
      <div className="flex items-end gap-2">
        <Input
          label={kind === 'pickup' ? t('console.order.pickupOtpLabel') : t('console.order.deliveryOtpLabel')}
          value={code}
          inputMode="numeric"
          maxLength={8}
          placeholder="0000"
          onChange={(e) => setCode(e.target.value)}
        />
        <Button disabled={code.length < 4 || verify.isPending} onClick={() => verify.mutate()}>
          {verify.isPending ? t('console.order.checking') : t('console.order.confirm')}
        </Button>
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Seller dispatch. Two shapes: hand the load to an AgroTraders transporter (a Trip
 * is created and they get a work queue entry), or type in an external carrier.
 * Either way the server mints both OTPs and returns the seller's pickup code.
 */
export function DispatchModal({ order, open, onClose }: { order: ApiOrderDetail; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'platform' | 'external'>('platform');
  const [transporterUserId, setTransporterUserId] = useState('');
  const [form, setForm] = useState({ transporterName: '', transporterPhone: '', vehiclePlate: '', driverName: '' });
  const [error, setError] = useState('');
  // Held open after a successful dispatch so the seller can read the pickup OTP,
  // which the server returns exactly once in that response.
  const [dispatched, setDispatched] = useState<ApiOrderDetail | null>(null);
  const invalidate = useOrderInvalidation();

  const { data: transporters = [] } = useQuery<ApiDirectoryEntry[]>({
    queryKey: ['directory-transporters'],
    queryFn: () => api.directory.transporters({}) as Promise<ApiDirectoryEntry[]>,
    enabled: open && mode === 'platform' && !dispatched,
  });

  const dispatch = useMutation({
    mutationFn: () =>
      api.orders.dispatch(order.id, mode === 'platform' ? { mode, transporterUserId } : { mode, ...form }),
    onSuccess: (result) => {
      setError('');
      setDispatched(result);
      invalidate();
    },
    onError: (e) => setError(errMessage(e, t('console.order.dispatchError'))),
  });

  const ready = mode === 'platform' ? !!transporterUserId : form.transporterName.trim().length > 1;

  if (dispatched) {
    return (
      <Modal closeLabel={t('common:close')}
        open={open}
        onClose={onClose}
        title={t('console.order.dispatchedTitle', { ref: order.reference })}
        footer={<div className="flex justify-end"><Button onClick={onClose}>{t('console.order.done')}</Button></div>}
      >
        <div className="space-y-4">
          {dispatched.pickupOtp ? (
            <OtpCard
              label={t('console.order.pickupOtp')}
              code={dispatched.pickupOtp}
              hint={t('console.order.pickupHint')}
            />
          ) : (
            <p className="text-sm text-ink-soft">{t('console.order.dispatchedShort')}</p>
          )}
          <p className="text-sm text-ink-soft">{t('console.order.buyerOtpNote')}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal closeLabel={t('common:close')}
      open={open}
      onClose={onClose}
      title={t('console.order.dispatchTitle', { ref: order.reference })}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
          <Button disabled={!ready || dispatch.isPending} onClick={() => dispatch.mutate()}>
            {dispatch.isPending ? t('console.order.dispatching') : t('console.order.dispatchGenerate')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['platform', 'external'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ' +
                (mode === m ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft')
              }
            >
              {m === 'platform' ? t('console.order.platformCarrier') : t('console.order.externalCarrier')}
            </button>
          ))}
        </div>

        {mode === 'platform' ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">{t('console.order.transporter')}</span>
            <select
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={transporterUserId}
              onChange={(e) => setTransporterUserId(e.target.value)}
            >
              <option value="">{t('console.order.selectTransporter')}</option>
              {transporters.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.name} {tr.country ?? ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('console.order.transporterName')} value={form.transporterName} onChange={(e) => setForm({ ...form, transporterName: e.target.value })} />
            <Input label={t('console.order.phone')} value={form.transporterPhone} onChange={(e) => setForm({ ...form, transporterPhone: e.target.value })} />
            <Input label={t('console.order.vehicleNumber')} value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} />
            <Input label={t('console.order.driverName')} value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
          </div>
        )}

        <p className="rounded-lg bg-mango-soft px-3 py-2 text-xs text-ink-soft">{t('console.order.twoCodesNote')}</p>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

/** Transporter/vehicle/route facts, shared by the buyer's Transport section and the order drawer. */
export function ShipmentFacts({ order }: { order: ApiOrderDetail }) {
  const { t } = useI18n();
  const rows: [string, string | null | undefined][] = [
    [t('console.order.carrier'), order.transporterName],
    [t('console.order.phone'), order.transporterPhone],
    [t('console.order.vehicle'), order.vehiclePlate],
    [t('console.order.driver'), order.driverName],
    [t('console.order.route'), order.trip ? `${order.trip.fromCity} → ${order.trip.toCity}` : null],
    [t('console.order.distance'), order.trip?.route?.distanceKm ? t('console.order.distanceKm', { km: order.trip.route.distanceKm }) : null],
    [t('console.order.dispatched'), order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : null],
    [t('console.order.pickedUp'), order.pickupVerifiedAt ? new Date(order.pickupVerifiedAt).toLocaleString() : null],
    [t('console.order.delivered'), order.deliveryVerifiedAt ? new Date(order.deliveryVerifiedAt).toLocaleString() : null],
  ];
  const shown = rows.filter(([, v]) => !!v);
  if (shown.length === 0) return <p className="text-sm text-ink-soft">{t('console.order.notDispatched')}</p>;
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-surface-border/60 py-1 text-sm">
          <dt className="text-ink-soft">{k}</dt>
          <dd className="truncate font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Full-detail drawer: stepper, party OTP, shipment facts, timeline, invoices. */
export function OrderDrawer({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data: order, isLoading } = useQuery<ApiOrderDetail>({
    queryKey: ['order-detail', orderId],
    queryFn: () => api.orders.get(orderId),
    refetchInterval: 8000,
  });

  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={order ? t('console.order.orderTitle', { ref: order.reference }) : t('console.order.orderFallback')} className="max-w-2xl">
      {isLoading || !order ? (
        <p className="py-8 text-center text-ink-soft">{t('common:loading')}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-lg font-bold text-ink">{order.product?.name ?? t('console.order.orderFallback')}</div>
              <div className="text-xs text-ink-soft">{order.qty} · {order.seller?.name}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-xl font-extrabold text-ink">{order.amount}</span>
              <Badge tone={orderTone[order.status] ?? 'slate'}>{t(`enums:order_status.${order.status}`, { defaultValue: orderLabel[order.status] ?? order.status })}</Badge>
            </div>
          </div>

          <OrderStepper status={order.status} />

          {order.pickupOtp && order.status === 'dispatched' && (
            <OtpCard label={t('console.order.pickupOtp')} code={order.pickupOtp} hint={t('console.order.pickupHintShort')} />
          )}
          {order.deliveryOtp && (order.status === 'dispatched' || order.status === 'in_transit') && (
            <OtpCard label={t('console.order.deliveryOtp')} code={order.deliveryOtp} hint={t('console.order.deliveryHint')} />
          )}

          <section>
            <h4 className="mb-2 font-display font-bold text-ink">{t('console.order.shipment')}</h4>
            <ShipmentFacts order={order} />
          </section>

          <section>
            <h4 className="mb-2 font-display font-bold text-ink">{t('console.order.timeline')}</h4>
            <OrderTimeline events={order.events} />
          </section>

          {order.invoices.length > 0 && (
            <section>
              <h4 className="mb-2 font-display font-bold text-ink">{t('console.order.invoices')}</h4>
              <div className="space-y-2">
                {order.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm">
                    <span className="font-semibold text-ink">{inv.number}</span>
                    <DownloadInvoiceButton id={inv.id} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

/**
 * Fetches a short-lived signed URL, then hands it to the browser. The token
 * rides in the query string because a plain navigation can't set headers.
 */
export function DownloadInvoiceButton({ id, label }: { id: string; label?: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          window.open(await api.invoices.pdfUrl(id), '_blank', 'noopener');
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? t('console.order.preparing') : label ?? t('console.order.download')}
    </Button>
  );
}
