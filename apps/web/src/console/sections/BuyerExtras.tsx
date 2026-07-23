import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, type IconName } from '@agrotraders/ui';
import type { ApiInvoice, ApiOrder, ApiOrderDetail, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { chatBus } from '../../chat/chatBus';
import { usd, orderLabel, orderTone } from '../lib';
import { DownloadInvoiceButton, OrderDrawer, OrderStepper, OtpCard, ShipmentFacts } from './order-parts';
import { unitSuffix } from '@agrotraders/types';

const orderTextKey = (s: string) => `enums:order_status.${s}`;

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

function EmptyHint({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <Card className="flex flex-col items-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-dark">
        <Icon name={icon} size={28} />
      </span>
      <p className="mt-3 font-display text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>
    </Card>
  );
}

/** Browse — quick funnel into the public marketplace. */
export function BrowseSection() {
  const { t } = useI18n();
  const { data: products = [] } = useQuery<ApiProduct[]>({
    queryKey: ['browse-products'],
    queryFn: () => api.products.list({}),
  });
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <SectionHead title={t('console.browseProducts')} sub={t('console.buyer.browseSub')} />
        <Link to="/market">
          <Button leftIcon={<Icon name="bag" size={16} />}>{t('console.buyer.openMarketplace')}</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.slice(0, 9).map((p) => (
          <Card key={p.id} hoverable className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-surface text-2xl">{p.emoji ?? '🌾'}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display font-bold text-ink">{p.name}</div>
              <div className="truncate text-xs text-ink-soft">{p.flag} {p.origin} · ${p.price}{unitSuffix(p.unit)}</div>
            </div>
            {p.verified && <Badge tone="green">{t('console.buyer.verified')}</Badge>}
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Saved / wishlist — verified & safe-deal picks kept for later. */
export function SavedSection() {
  const { t } = useI18n();
  const { data: saved = [] } = useQuery<ApiProduct[]>({
    queryKey: ['saved-products'],
    queryFn: () => api.products.list({ safe: true }),
  });
  return (
    <div>
      <SectionHead title={t('console.nav.saved')} sub={t('console.buyer.savedSub')} />
      {saved.length === 0 ? (
        <EmptyHint icon="heart" title={t('console.buyer.noSavedTitle')} body={t('console.buyer.noSavedBody')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.slice(0, 9).map((p) => (
            <Card key={p.id} hoverable className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-mango-soft text-2xl">{p.emoji ?? '🌾'}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display font-bold text-ink">{p.name}</div>
                <div className="truncate text-xs text-ink-soft">{p.flag} ${p.price}{unitSuffix(p.unit)}</div>
              </div>
              <Icon name="heart" size={18} className="text-orange" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Safe Deal — escrow balance + held orders. */
export function SafeDealSection() {
  const { t } = useI18n();
  const { data: wallet } = useQuery<{ balanceCents: number }>({
    queryKey: ['me-wallet'],
    queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }>,
  });
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.orders.mine() as Promise<ApiOrder[]>,
  });
  const held = orders.filter((o) => o.status === 'paid');
  return (
    <div>
      <SectionHead title={t('console.nav.safedeal')} sub={t('console.buyer.safeDealSub')} />
      <Card className="mb-5 flex items-center gap-4 bg-brand-dock text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
          <Icon name="shield" size={24} />
        </span>
        <div>
          <div className="text-xs text-mint/80">{t('console.buyer.escrowBalance')}</div>
          <div className="font-display text-3xl font-extrabold">{usd(wallet?.balanceCents)}</div>
        </div>
        <Badge tone="mango" className="ms-auto">{t('console.buyer.protected')}</Badge>
      </Card>
      <h3 className="mb-3 font-display font-bold text-ink">{t('console.buyer.ordersInEscrow')}</h3>
      {held.length === 0 ? (
        <Card className="py-10 text-center text-ink-soft">{t('console.buyer.noFundsHeld')}</Card>
      ) : (
        <div className="space-y-2">
          {held.map((o) => (
            <Card key={o.id} className="flex items-center justify-between py-3">
              <span className="font-semibold text-ink">{o.product?.name ?? t('console.order.orderFallback')} · #{o.reference}</span>
              <div className="flex items-center gap-3">
                <span className="font-display font-extrabold text-ink">{o.amount}</span>
                <Badge tone="gold">{t(orderTextKey(o.status), { defaultValue: orderLabel[o.status] })}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Transport — full detail for every shipment attached to the buyer's orders. */
export function TransportSection() {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.orders.mine(),
  });
  const shipments = orders.filter((o) => ['dispatched', 'shipped', 'in_transit', 'delivered'].includes(o.status));

  return (
    <div>
      <SectionHead title={t('console.nav.transport')} sub={t('console.buyer.transportSub')} />
      {shipments.length === 0 ? (
        <EmptyHint icon="truck" title={t('console.buyer.noShipmentsTitle')} body={t('console.buyer.noShipmentsBody')} />
      ) : (
        <div className="space-y-3">
          {shipments.map((o) => (
            <ShipmentCard key={o.id} order={o} onOpen={() => setOpenId(o.id)} />
          ))}
        </div>
      )}
      {openId && <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/**
 * One in-transit consignment. The list payload is thin, so the per-shipment
 * detail (carrier, vehicle, driver, delivery OTP) is fetched on demand.
 */
function ShipmentCard({ order, onOpen }: { order: ApiOrder; onOpen: () => void }) {
  const { t } = useI18n();
  const { data: detail } = useQuery<ApiOrderDetail>({
    queryKey: ['order-detail', order.id],
    queryFn: () => api.orders.get(order.id),
    refetchInterval: order.status === 'delivered' ? false : 15000,
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display font-bold text-ink">{order.product?.name ?? t('console.dash.shipmentFallback')} · #{order.reference}</div>
          <div className="mt-0.5 text-xs text-ink-soft">
            {detail?.trip ? `${detail.trip.fromCity} → ${detail.trip.toCity}` : `${order.seller?.country ?? t('console.dash.origin')} → ${order.buyer?.country ?? t('console.dash.destination')}`}
          </div>
        </div>
        <Badge tone={orderTone[order.status] ?? 'slate'}>{t(orderTextKey(order.status), { defaultValue: orderLabel[order.status] ?? order.status })}</Badge>
      </div>

      {detail && (
        <>
          <div className="mt-4"><OrderStepper status={detail.status} /></div>
          <div className="mt-4"><ShipmentFacts order={detail} /></div>
          {detail.deliveryOtp && detail.status !== 'delivered' && (
            <div className="mt-4">
              <OtpCard
                label={t('console.order.deliveryOtp')}
                code={detail.deliveryOtp}
                hint={t('console.buyer.deliveryOtpHint')}
              />
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={onOpen}>{t('console.buyer.fullDetails')}</Button>
      </div>
    </Card>
  );
}

/** Invoices — everything billed to this buyer, from any party, as a real PDF. */
export function InvoicesSection() {
  const { t } = useI18n();
  const { data: invoices = [], isLoading } = useQuery<ApiInvoice[]>({
    queryKey: ['my-invoices', 'received'],
    queryFn: () => api.invoices.mine('received'),
  });

  return (
    <div>
      <SectionHead title={t('console.nav.invoices')} sub={t('console.buyer.invoicesSub')} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : invoices.length === 0 ? (
        <EmptyHint icon="file" title={t('console.buyer.noInvoicesTitle')} body={t('console.buyer.noInvoicesBody')} />
      ) : (
        <Card padded={false} className="divide-y divide-surface-border">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-surface text-brand-dark">
                  <Icon name="file" size={16} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">{inv.number}</div>
                  <div className="text-xs text-ink-soft">
                    {t(`console.buyer.kind.${inv.kind}`, { defaultValue: inv.kind })} · {inv.issuer?.name}
                    {inv.order ? ` · #${inv.order.reference}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={inv.status === 'paid' ? 'green' : inv.status === 'void' ? 'slate' : 'gold'}>{t(`console.invoice.status.${inv.status}`, { defaultValue: inv.status })}</Badge>
                <span className="font-display font-extrabold text-ink">{usd(inv.totalCents)}</span>
                <DownloadInvoiceButton id={inv.id} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/**
 * Messages — the real community DM inbox. Threads and delivery are handled by
 * the always-mounted CommunityWidget; this section lists the buyer's
 * counterparties and hands each one off to it via `chatBus`.
 */
export function MessagesSection() {
  const { t } = useI18n();
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['my-orders'],
    queryFn: () => api.orders.mine(),
  });
  // Counterparties the buyer actually trades with, de-duplicated by user id.
  const contacts = new Map<string, { id: string; name: string; sub: string }>();
  for (const o of orders) {
    if (o.seller?.id) contacts.set(o.seller.id, { id: o.seller.id, name: o.seller.name, sub: t('console.buyer.sellerRef', { ref: o.reference }) });
  }

  return (
    <div>
      <SectionHead title={t('console.nav.messages')} sub={t('console.buyer.messagesSub')} />
      {contacts.size === 0 ? (
        <EmptyHint icon="message" title={t('console.buyer.noConvTitle')} body={t('console.buyer.noConvBody')} />
      ) : (
        <Card padded={false} className="divide-y divide-surface-border">
          {[...contacts.values()].map((c) => (
            <button
              key={c.id}
              onClick={() => chatBus.openCommunityDm(c.id, c.name)}
              className="flex w-full items-center gap-3 px-5 py-3 text-start transition hover:bg-brand-surface/50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface font-display font-bold text-brand-dark">
                {c.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{c.name}</div>
                <div className="truncate text-xs text-ink-soft">{c.sub}</div>
              </div>
              <Icon name="chevronRight" size={16} className="shrink-0 text-ink-soft" />
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
