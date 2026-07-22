import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge, Button, Card } from '@agrotraders/ui';
import { nextStatusFor, type ApiOrder } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { orderLabel, orderTone } from '../lib';
import { OrderDrawer, OrderStepper, errMessage, useOrderInvalidation } from './order-parts';
import { OrderReviewButtons } from '../components/OrderReviewButtons';

export function BuyerOrders() {
  const { t } = useI18n();
  const orderText = (s: ApiOrder['status']) => t(`enums:order_status.${s}`, { defaultValue: orderLabel[s] ?? s });
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const invalidate = useOrderInvalidation();

  const { data: orders = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.orders.mine(),
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parameters<typeof api.orders.setStatus>[1] }) =>
      api.orders.setStatus(id, status),
    onSuccess: () => { setError(''); invalidate(); },
    onError: (e) => setError(errMessage(e, t('console.order.updateError'))),
  });

  return (
    <div>
      <h2 className="mb-5 min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.order.myOrders')}</h2>
      {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : orders.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">
          {t('console.dash.noOrders')}{' '}
          <Link to="/market" className="font-bold text-brand">{t('console.order.browseMarketplace')}</Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            // Buyers accept a quote and release escrow; everything past `packed`
            // is the seller's or the transporter's move.
            const next = nextStatusFor(o.status, 'buyer');
            return (
              <Card key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface text-xl">
                      {o.product?.emoji ?? '🌾'}
                    </span>
                    <div>
                      <div className="font-display font-bold text-ink">{o.product?.name ?? t('console.order.orderFallback')}</div>
                      <div className="text-xs text-ink-soft">#{o.reference} · {o.qty} · {o.seller?.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-extrabold text-ink">{o.amount}</span>
                    <Badge tone={orderTone[o.status] ?? 'slate'}>{orderText(o.status)}</Badge>
                  </div>
                </div>

                <div className="mt-4"><OrderStepper status={o.status} /></div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenId(o.id)}>
                    {t('console.order.details')} {o.status === 'in_transit' || o.status === 'dispatched' ? t('console.order.otpSuffix') : ''}
                  </Button>
                  {o.status === 'delivered' && <OrderReviewButtons orderId={o.id} roles={['seller', 'product']} />}
                  {next && (
                    <Button size="sm" disabled={advance.isPending} onClick={() => advance.mutate({ id: o.id, status: next })}>
                      {next === 'processing' ? t('console.order.acceptQuote') : next === 'paid' ? t('console.order.payEscrow') : t('console.order.markStatus', { status: orderText(next) })}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {openId && <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
