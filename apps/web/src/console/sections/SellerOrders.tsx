import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Input, Modal } from '@agrotraders/ui';
import { nextStatusFor, type ApiOrder, type ApiOrderDetail, type ApiOrderStatus } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { orderLabel, orderTone } from '../lib';
import { DispatchModal, OrderDrawer, errMessage, useOrderInvalidation } from './order-parts';
import { ArrangeLogisticsModal } from './ArrangeLogisticsModal';
import { OrderReviewButtons } from '../components/OrderReviewButtons';
import { ErrorState } from '../../components/ErrorState';

/** Seller answers a buyer's enquiry with a firm per-unit price. */
function RespondModal({ order, onClose }: { order: ApiOrder; onClose: () => void }) {
  const { t } = useI18n();
  const [price, setPrice] = useState(String((order.unitPriceCents ?? 0) / 100));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const respond = useMutation({
    mutationFn: () => api.orders.respond(order.id, { unitPriceCents: Math.round(Number(price) * 100), note }),
    onSuccess: () => { invalidate(); onClose(); },
    onError: (e) => setError(errMessage(e, t('console.order.sendQuoteError'))),
  });

  const qty = order.qtyValue ?? 0;
  const total = Number(price) * qty;

  return (
    <Modal closeLabel={t('common:close')}
      open
      onClose={onClose}
      title={t('console.order.respondTitle', { ref: order.reference })}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
          <Button disabled={!Number(price) || respond.isPending} onClick={() => respond.mutate()}>
            {respond.isPending ? t('console.order.sending') : t('console.order.sendQuote')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {order.note && (
          <div className="rounded-lg bg-brand-surface px-3 py-2 text-sm text-ink-soft">
            {t('console.order.buyerNote', { note: order.note })}
          </div>
        )}
        <Input label={t('console.order.pricePerUnit', { unit: order.qtyUnit ?? 'MT' })} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <p className="text-sm text-ink-soft">
          {qty} {order.qtyUnit ?? 'MT'} × ${price || 0} = <strong className="text-ink">${total.toLocaleString()}</strong>
        </p>
        <Input label={t('console.order.noteOptional')} value={note} placeholder={t('console.order.notePlaceholder')} onChange={(e) => setNote(e.target.value)} />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

/** Seller bills the buyer for a delivered (or in-flight) order. */
function InvoiceModal({ order, onClose }: { order: ApiOrder; onClose: () => void }) {
  const { t } = useI18n();
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const raise = useMutation({
    mutationFn: () => api.invoices.create({ kind: 'order', subjectId: order.id, taxCents: Math.round(Number(tax) * 100), notes }),
    onSuccess: () => { invalidate(); onClose(); },
    onError: (e) => setError(errMessage(e, t('console.order.invoiceError'))),
  });

  return (
    <Modal closeLabel={t('common:close')}
      open
      onClose={onClose}
      title={t('console.order.invoiceTitle', { ref: order.reference })}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
          <Button disabled={raise.isPending} onClick={() => raise.mutate()}>
            {raise.isPending ? t('console.order.raising') : t('console.order.raiseInvoice')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">{t('console.order.invoiceLineNote', { product: order.product?.name, amount: order.amount })}</p>
        <Input label={t('console.order.tax')} type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
        <Input label={t('console.order.notesOptional')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

export function SellerOrders() {
  const { t } = useI18n();
  const orderText = (s: ApiOrderStatus) => t(`enums:order_status.${s}`, { defaultValue: orderLabel[s] ?? s });
  const [respondTo, setRespondTo] = useState<ApiOrder | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<ApiOrderDetail | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<ApiOrder | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [logisticsFor, setLogisticsFor] = useState<ApiOrder | null>(null);
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const { data: orders = [], isLoading, isError, refetch } = useQuery<ApiOrder[]>({
    queryKey: ['incoming-orders'],
    queryFn: () => api.orders.incoming(),
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApiOrderStatus }) => api.orders.setStatus(id, status),
    onSuccess: () => { setError(''); invalidate(); },
    onError: (e) => setError(errMessage(e, t('console.order.updateError'))),
  });

  // Dispatch needs the full detail payload (it renders the returned pickup OTP).
  const openDispatch = useMutation({
    mutationFn: (id: string) => api.orders.get(id),
    onSuccess: (o) => setDispatchOrder(o),
  });

  return (
    <div>
      <h2 className="mb-5 min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.order.incomingOrders')}</h2>
      {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : isError ? (
        /* WEB-06/F28: a failed fetch is an error with retry, not "no orders". */
        <ErrorState onRetry={() => refetch()} />
      ) : orders.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('console.dash.noOrders')}</Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">{t('console.order.colOrder')}</th>
                  <th className="px-5 py-3">{t('console.order.colProduct')}</th>
                  <th className="px-5 py-3">{t('console.order.colBuyer')}</th>
                  <th className="px-5 py-3 text-end">{t('console.order.colAmount')}</th>
                  <th className="px-5 py-3">{t('console.order.colStatus')}</th>
                  <th className="px-5 py-3 text-end">{t('console.order.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const next = nextStatusFor(o.status, 'seller');
                  const canInvoice = ['dispatched', 'in_transit', 'delivered'].includes(o.status);
                  // Source transport/crew any time before the order is dispatched.
                  const canArrange = ['processing', 'paid', 'packed'].includes(o.status);
                  return (
                    <tr key={o.id} className="border-b border-surface-border/70 last:border-0">
                      <td className="px-5 py-3">
                        <button className="font-numeric font-semibold text-brand hover:underline" onClick={() => setDetailId(o.id)}>
                          #{o.reference}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-ink">{o.product?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-ink-soft">{o.buyer?.name} {o.buyer?.country}</td>
                      <td className="px-5 py-3 text-end font-numeric font-bold text-ink">{o.amount}</td>
                      <td className="px-5 py-3">
                        <Badge tone={orderTone[o.status] ?? 'slate'}>{orderText(o.status)}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        {/* Up to four buttons, one of them interpolated
                            (`markStatus`) — wrap rather than widen the row. */}
                        <div className="flex flex-wrap justify-end gap-2">
                          {o.status === 'enquiry' && <Button size="sm" onClick={() => setRespondTo(o)}>{t('console.order.respond')}</Button>}
                          {next && o.status !== 'enquiry' && (
                            <Button size="sm" disabled={advance.isPending} onClick={() => advance.mutate({ id: o.id, status: next })}>
                              {t('console.order.markStatus', { status: orderText(next) })}
                            </Button>
                          )}
                          {canArrange && (
                            <Button variant="outline" size="sm" onClick={() => setLogisticsFor(o)}>
                              {t('console.order.logistics')}
                            </Button>
                          )}
                          {o.status === 'packed' && (
                            <Button size="sm" disabled={openDispatch.isPending} onClick={() => openDispatch.mutate(o.id)}>
                              {t('console.order.dispatch')}
                            </Button>
                          )}
                          {canInvoice && <Button variant="outline" size="sm" onClick={() => setInvoiceFor(o)}>{t('console.order.invoice')}</Button>}
                          {o.status === 'delivered' && <OrderReviewButtons orderId={o.id} roles={['buyer']} />}
                          {!next && !canArrange && !canInvoice && o.status !== 'enquiry' && (
                            <span className="text-xs text-ink-soft">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {respondTo && <RespondModal order={respondTo} onClose={() => setRespondTo(null)} />}
      {dispatchOrder && <DispatchModal order={dispatchOrder} open onClose={() => setDispatchOrder(null)} />}
      {invoiceFor && <InvoiceModal order={invoiceFor} onClose={() => setInvoiceFor(null)} />}
      {detailId && <OrderDrawer orderId={detailId} onClose={() => setDetailId(null)} />}
      {logisticsFor && <ArrangeLogisticsModal order={logisticsFor} onClose={() => setLogisticsFor(null)} />}
    </div>
  );
}
