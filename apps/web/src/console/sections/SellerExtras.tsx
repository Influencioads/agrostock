import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal, type IconName } from '@agrotraders/ui';
import type { ApiAdCampaign, ApiBuyerBid, ApiOrder, ApiProduct } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { useI18n } from '../../i18n';
import { compactUsd, parseAmount, orderLabel, orderTone } from '../lib';
import { errMessage } from './order-parts';
import { ProductForm, blankProduct, formToPayload, productFormReady, type ProductFormValues } from './ProductForm';
import { BuyerBidRoom } from './BuyerBidRoom';
import { BarChart } from './BarChart';
import { unitSuffix } from '@agrotraders/types';

type SellerProduct = ApiProduct & { _count?: { orders: number; auctionBids: number } };

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

/** Add Product — the same shared form as the Inventory modal, rendered inline. */
export function AddProductSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductFormValues>(blankProduct);
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: () => api.products.create(formToPayload(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setForm(blankProduct);
      onNavigate('inventory');
    },
    onError: (e) => setErr(errMessage(e, t('console.seller.createProductError'))),
  });

  return (
    <div className="max-w-2xl">
      <SectionHead title={t('console.nav.add')} sub={t('console.seller.addProductSub')} />
      <Card className="space-y-4">
        <ProductForm value={form} onChange={setForm} error={err} onError={setErr} />
        <p className="text-[11px] text-ink-soft">{t('console.seller.addProductNote')}</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => onNavigate('inventory')}>{t('common:cancel')}</Button>
          <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => create.mutate()} disabled={create.isPending || !productFormReady(form)}>
            {create.isPending ? t('console.seller.addingProduct') : t('console.seller.addProduct')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Buyer Bids — buyer-posted requirements the seller can bid on, plus enquiries. */
export function SellerBids() {
  const { t } = useI18n();
  const [roomId, setRoomId] = useState<string | null>(null);

  const { data: buyerBids = [], isLoading } = useQuery<ApiBuyerBid[]>({
    queryKey: ['open-buyer-bids'],
    queryFn: () => api.buyerBids.open(),
    refetchInterval: 15000,
  });
  const { data: mySellerBids = [] } = useQuery({
    queryKey: ['my-seller-bids'],
    queryFn: () => api.buyerBids.myBids(),
  });
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['incoming-orders'],
    queryFn: () => api.orders.incoming(),
  });
  // The room owns the whole section while it's open — it's a screen, not an overlay.
  if (roomId) return <BuyerBidRoom id={roomId} onBack={() => setRoomId(null)} />;

  const enquiries = orders.filter((o) => o.status === 'enquiry');
  const bidOnIds = new Set(mySellerBids.map((q) => q.buyerBid.id));

  return (
    <div>
      <SectionHead title={t('console.nav.bids')} sub={t('console.seller.bidsSub')} />

      {enquiries.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-3 font-display font-bold text-ink">{t('console.seller.directEnquiries')}</h3>
          <div className="space-y-3">
            {enquiries.map((o) => (
              <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display font-bold text-ink">{o.product?.name ?? t('console.seller.requestFallback')}</div>
                  <div className="text-xs text-ink-soft">
                    #{o.reference} · {o.qty} ·{' '}
                    {o.buyer
                      ? <Link to={`/u/${o.buyer.id}`} className="underline-offset-2 hover:underline">{o.buyer.name}</Link>
                      : t('console.seller.buyerFallback')}{' '}
                    {o.buyer?.country}
                  </div>
                </div>
                <span className="text-xs text-ink-soft">{t('console.seller.respondFromOrders')}</span>
              </Card>
            ))}
          </div>
        </section>
      )}

      <h3 className="mb-3 font-display font-bold text-ink">{t('console.seller.openRequirements')}</h3>
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : buyerBids.length === 0 ? (
        <EmptyHint icon="file" title={t('console.seller.noBuyerBidsTitle')} body={t('console.seller.noBuyerBidsBody')} />
      ) : (
        <div className="space-y-3">
          {buyerBids.map((r) => (
            <Card key={r.id} interactive onClick={() => setRoomId(r.id)} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={r.mode === 'auction' ? 'mango' : 'info'}>{r.mode === 'auction' ? t('console.seller.auctionBadge') : t('console.seller.bidsBadge')}</Badge>
                  {bidOnIds.has(r.id) && <Badge tone="green">{t('console.seller.bidPlaced')}</Badge>}
                </div>
                <div className="mt-1.5 truncate font-display font-bold text-ink">{r.title}</div>
                <div className="text-xs text-ink-soft">
                  #{r.reference} · {r.qtyValue} {r.qtyUnit} ·{' '}
                  {r.buyer
                    ? <Link to={`/u/${r.buyer.id}`} className="underline-offset-2 hover:underline">{r.buyer.name}</Link>
                    : t('console.seller.buyerFallback')}
                  {r.deliveryPlace ? ` · ${r.deliveryPlace}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.mode === 'auction' && r.bestPriceCents != null && (
                  <div className="text-end">
                    <div className="text-xs text-ink-soft">{t('console.seller.priceToBeat')}</div>
                    <div className="font-display font-extrabold text-ink">{compactUsd(r.bestPriceCents / 100)}</div>
                  </div>
                )}
                <Button size="sm" onClick={() => setRoomId(r.id)}>
                  {bidOnIds.has(r.id) && r.mode === 'auction' ? t('console.seller.undercut') : t('console.seller.placeBid')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Auctions ─────────────────────────────────────────────────────── */

function countdown(end: string | null | undefined, t: (k: string) => string) {
  if (!end) return t('console.seller.open');
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return t('console.seller.ended');
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
}

/** Turn one of the seller's existing listings into an auction. */
function StartAuctionModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [startBid, setStartBid] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [err, setErr] = useState('');

  const { data: products = [] } = useQuery<SellerProduct[]>({
    queryKey: ['my-products'],
    queryFn: () => api.products.mine() as Promise<SellerProduct[]>,
  });
  const eligible = products.filter((p) => !p.isAuction);

  const start = useMutation({
    mutationFn: () =>
      api.products.update(productId, {
        isAuction: true,
        startBidCents: Math.round(Number(startBid) * 100),
        auctionEndsAt: new Date(endsAt).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] });
      qc.invalidateQueries({ queryKey: ['my-auctions'] });
      qc.invalidateQueries({ queryKey: ['live-auctions'] });
      onClose();
    },
    onError: (e) => setErr(errMessage(e, t('console.seller.startAuctionError'))),
  });

  return (
    <Modal closeLabel={t('common:close')}
      open
      onClose={onClose}
      title={t('console.seller.startAuction')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button>
          <Button disabled={!productId || !Number(startBid) || !endsAt || start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? t('console.seller.starting') : t('console.seller.startAuctionBtn')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {eligible.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('console.seller.allAuctions')}</p>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.seller.listing')}</span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
              >
                <option value="">{t('console.seller.selectListing')}</option>
                {eligible.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name} — {p.price}{unitSuffix(p.unit)}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label={t('console.seller.startingBid')} type="number" placeholder="800" value={startBid} onChange={(e) => setStartBid(e.target.value)} />
              <Input label={t('console.seller.auctionCloses')} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <p className="text-xs text-ink-soft">{t('console.seller.sealedNote')}</p>
          </>
        )}
        {err && <p className="text-sm font-semibold text-status-error">{err}</p>}
      </div>
    </Modal>
  );
}

/** The owner's full bid book for one auction. */
function BidBookModal({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data: bids = [], isLoading } = useQuery({
    queryKey: ['auction-bids', slug],
    queryFn: () => api.auctions.bids(slug) as Promise<{ id: string; amountCents: number; createdAt: string; bidder?: { name: string } }[]>,
    refetchInterval: 5000,
  });
  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={t('console.seller.bidsFor', { name })}>
      {isLoading ? (
        <p className="py-6 text-center text-ink-soft">{t('common:loading')}</p>
      ) : bids.length === 0 ? (
        <p className="py-6 text-center text-ink-soft">{t('console.seller.noBids')}</p>
      ) : (
        <div className="space-y-2">
          {bids.map((b, i) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">{b.bidder?.name ?? t('console.seller.bidderFallback')}</span>
                {i === 0 && <Badge tone="green">{t('console.seller.highest')}</Badge>}
              </div>
              <span className="font-display font-extrabold text-ink">{compactUsd(b.amountCents / 100)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

interface SellerAuction extends ApiProduct {
  bidCount: number;
  highestCents: number | null;
  highBidder: string | null;
}

/** Auctions — start, watch, and close the seller's own auctions. */
export function SellerAuctions() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [viewing, setViewing] = useState<SellerAuction | null>(null);
  const [err, setErr] = useState('');

  const { data: auctions = [], isLoading } = useQuery<SellerAuction[]>({
    queryKey: ['my-auctions'],
    queryFn: () => api.auctions.selling() as Promise<SellerAuction[]>,
    refetchInterval: 10000,
  });

  const close = useMutation({
    mutationFn: (slug: string) => api.auctions.close(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-auctions'] });
      qc.invalidateQueries({ queryKey: ['live-auctions'] });
    },
    onError: (e) => setErr(errMessage(e, t('console.seller.closeAuctionError'))),
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.nav.auctions')}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t('console.seller.auctionsSub')}</p>
        </div>
        <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => setStarting(true)}>{t('console.seller.startAuction')}</Button>
      </div>

      {err && <p className="mb-3 text-sm font-semibold text-status-error">{err}</p>}

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : auctions.length === 0 ? (
        <EmptyHint icon="gavel" title={t('console.seller.noAuctionsTitle')} body={t('console.seller.noAuctionsBody')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {auctions.map((p) => {
            const ended = p.auctionEndsAt ? new Date(p.auctionEndsAt).getTime() <= Date.now() : false;
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-brand-surface text-2xl">
                    {p.imageUrl ? <img src={assetUrl(p.imageUrl)} alt="" className="h-full w-full object-cover" /> : (p.emoji ?? '🌾')}
                  </span>
                  <Badge tone={ended ? 'slate' : 'mango'}>{countdown(p.auctionEndsAt, t)}</Badge>
                </div>
                <div className="mt-2 font-display font-bold text-ink">{p.name}</div>
                <div className="text-xs text-ink-soft">
                  {t('console.seller.startPrice', { price: p.startBidCents != null ? compactUsd(p.startBidCents / 100) : p.price })}
                  {' · '}{t('console.seller.bidCount', { count: p.bidCount })}
                </div>
                <div className="mt-2">
                  <div className="text-xs text-ink-soft">{t('console.seller.highestBid')}</div>
                  <div className="font-display text-lg font-extrabold text-ink">
                    {p.highestCents != null ? compactUsd(p.highestCents / 100) : '—'}
                    {p.highBidder && <span className="ms-1 text-xs font-normal text-ink-soft">{t('console.seller.byBidder', { name: p.highBidder })}</span>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" fullWidth onClick={() => setViewing(p)}>{t('console.seller.viewBids')}</Button>
                  {!ended && (
                    <Button size="sm" fullWidth disabled={close.isPending} onClick={() => { setErr(''); close.mutate(p.slug); }}>
                      {close.isPending ? t('console.seller.closing') : t('console.seller.closeNow')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {starting && <StartAuctionModal onClose={() => setStarting(false)} />}
      {viewing && <BidBookModal slug={viewing.slug} name={viewing.name} onClose={() => setViewing(null)} />}
    </div>
  );
}

/** Offers — toggle promotional pricing on any listing. */
export function SellerOffers() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery<SellerProduct[]>({
    queryKey: ['my-products'],
    queryFn: () => api.products.mine() as Promise<SellerProduct[]>,
  });
  const toggle = useMutation({
    mutationFn: ({ id, isOffer }: { id: string; isOffer: boolean }) => api.products.update(id, { isOffer }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <div>
      <SectionHead title={t('console.nav.offers')} sub={t('console.seller.offersSub')} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : products.length === 0 ? (
        <EmptyHint icon="star" title={t('console.seller.noOffersTitle')} body={t('console.seller.noOffersBody')} />
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <Card key={p.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-xl">{p.emoji ?? '🌾'}</span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{p.name}</div>
                  <div className="text-xs text-ink-soft">{p.price}{unitSuffix(p.unit)}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {p.isOffer && <Badge tone="mango">{t('console.seller.offerLive')}</Badge>}
                <Button
                  variant={p.isOffer ? 'outline' : 'primary'}
                  size="sm"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: p.id, isOffer: !p.isOffer })}
                >
                  {p.isOffer ? t('console.seller.removeOffer') : t('console.seller.makeOffer')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ads — promote listings. Campaigns are moderated by an admin before running. */
export function SellerAds() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery<SellerProduct[]>({
    queryKey: ['my-products'],
    queryFn: () => api.products.mine() as Promise<SellerProduct[]>,
  });
  const { data: campaigns = [], isLoading } = useQuery<ApiAdCampaign[]>({
    queryKey: ['my-ads'],
    queryFn: () => api.ads.mine(),
    refetchInterval: 20000,
  });
  const [product, setProduct] = useState('');
  const [budget, setBudget] = useState('');
  const [err, setErr] = useState('');

  const launch = useMutation({
    mutationFn: () => api.ads.create({ productId: product, dailyBudgetCents: Math.round(Number(budget) * 100) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-ads'] });
      setProduct('');
      setBudget('');
    },
    onError: (e) => setErr(errMessage(e, t('console.seller.launchError'))),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.ads.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-ads'] }),
    onError: (e) => setErr(errMessage(e, t('console.seller.updateCampaignError'))),
  });

  // Only an approved + unpaused campaign is actually spending.
  const totalSpend = useMemo(
    () => campaigns.filter((c) => c.active && c.status === 'approved').reduce((s, c) => s + c.dailyBudgetCents / 100, 0),
    [campaigns],
  );

  return (
    <div className="max-w-3xl">
      <SectionHead title={t('console.nav.ads')} sub={t('console.seller.adsSub')} />
      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.seller.product')}</span>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
            >
              <option value="">{t('console.seller.selectListing')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.approved === false ? t('console.seller.awaitingApproval') : ''}</option>
              ))}
            </select>
          </label>
          <Input label={t('console.seller.dailyBudget')} placeholder="50" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => { setErr(''); launch.mutate(); }} disabled={!product || !Number(budget) || launch.isPending}>
            {launch.isPending ? t('console.seller.submitting') : t('console.seller.submitForReview')}
          </Button>
        </div>
        {campaigns.length > 0 && (
          <p className="mt-3 text-xs text-ink-soft">{t('console.seller.activeSpend', { amount: `$${totalSpend}` })}</p>
        )}
        {err && <p className="mt-2 text-sm font-semibold text-status-error">{err}</p>}
      </Card>

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : campaigns.length === 0 ? (
        <EmptyHint icon="chart" title={t('console.seller.noCampaignsTitle')} body={t('console.seller.noCampaignsBody')} />
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const live = c.status === 'approved' && c.active;
            return (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{c.product?.emoji ?? '🌾'} {c.product?.name ?? t('console.seller.listingFallback')}</div>
                  <div className="text-xs text-ink-soft">{t('console.seller.perDay', { amount: `$${(c.dailyBudgetCents / 100).toLocaleString()}` })}</div>
                  {c.status === 'rejected' && c.rejectionReason && (
                    <div className="mt-1 text-xs text-status-error">{t('console.seller.rejectedReason', { reason: c.rejectionReason })}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {c.status === 'pending' && <Badge tone="warn">{t('console.seller.pendingReview')}</Badge>}
                  {c.status === 'rejected' && <Badge tone="error">{t('console.seller.rejected')}</Badge>}
                  {c.status === 'approved' && <Badge tone={live ? 'green' : 'slate'}>{live ? t('console.seller.live') : t('console.seller.paused')}</Badge>}
                  <Button
                    variant="outline"
                    size="sm"
                    // Pausing/resuming is only meaningful once the campaign is approved.
                    disabled={toggle.isPending || c.status !== 'approved'}
                    onClick={() => { setErr(''); toggle.mutate({ id: c.id, active: !c.active }); }}
                  >
                    {c.active ? t('console.seller.pause') : t('console.seller.resume')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Analytics — revenue trend, order-status mix and category spread. */
export function SellerAnalytics() {
  const { t } = useI18n();
  const orderText = (s: string) => t(`enums:order_status.${s}`, { defaultValue: orderLabel[s] ?? s });
  const { data: products = [] } = useQuery<SellerProduct[]>({
    queryKey: ['my-products'],
    queryFn: () => api.products.mine() as Promise<SellerProduct[]>,
  });
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['incoming-orders'],
    queryFn: () => api.orders.incoming() as Promise<ApiOrder[]>,
  });
  const { data: revenueSeries } = useQuery({
    queryKey: ['seller-revenue'],
    queryFn: () => api.me.revenue(),
  });

  const statusMix = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    return { entries: Object.entries(counts), max };
  }, [orders]);

  const revenue = orders.reduce((s, o) => s + parseAmount(o.amount), 0);

  return (
    <div className="space-y-6">
      <SectionHead title={t('console.nav.analytics')} sub={t('console.seller.analyticsSub')} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card><div className="text-xs text-ink-soft">{t('console.seller.grossRevenue')}</div><div className="mt-1 font-display text-2xl font-extrabold text-ink">{compactUsd(revenue)}</div></Card>
        <Card><div className="text-xs text-ink-soft">{t('console.seller.listings')}</div><div className="mt-1 font-display text-2xl font-extrabold text-ink">{products.length}</div></Card>
        <Card><div className="text-xs text-ink-soft">{t('console.seller.orders')}</div><div className="mt-1 font-display text-2xl font-extrabold text-ink">{orders.length}</div></Card>
        <Card><div className="text-xs text-ink-soft">{t('console.seller.totalBids')}</div><div className="mt-1 font-display text-2xl font-extrabold text-ink">{products.reduce((s, p) => s + (p._count?.auctionBids ?? 0), 0)}</div></Card>
      </div>

      <BarChart title={t('console.seller.revenueTrend')} caption={t('console.dash.perMonth')} data8={revenueSeries?.data8} data12={revenueSeries?.data12} />

      <Card>
        <h3 className="font-display text-lg font-bold text-ink">{t('console.seller.ordersByStatus')}</h3>
        <div className="mt-4 space-y-3">
          {statusMix.entries.length === 0 && <p className="py-4 text-center text-sm text-ink-soft">{t('console.dash.noOrders')}</p>}
          {statusMix.entries.map(([status, count]) => (
            <div key={status}>
              <div className="flex items-center justify-between text-sm">
                <Badge tone={orderTone[status] ?? 'slate'}>{orderText(status)}</Badge>
                <span className="text-ink-soft">{count}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(count / statusMix.max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
