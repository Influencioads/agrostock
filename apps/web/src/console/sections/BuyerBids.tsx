import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal } from '@agrotraders/ui';
import type { ApiBuyerBid, ApiBuyerBidMode, ApiCategory } from '@agrotraders/api-client';
import { PRODUCT_UNITS, toUnit } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { errMessage } from './order-parts';
import { GalleryEditor, MAX_IMAGES } from './ProductForm';
import { BuyerBidRoom } from './BuyerBidRoom';

const MODE_KEY: Record<ApiBuyerBidMode, string> = { quote: 'console.buyer.modeQuote', auction: 'console.buyer.modeAuction' };

/** H:M:S while open; null once closed. Ticks via the parent's 1s clock. */
function hms(end: string | null | undefined) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** Buyer posts a requirement. `auction` mode needs a closing time; `quote` doesn't. */
function NewBuyerBidModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [mode, setMode] = useState<ApiBuyerBidMode>('quote');
  const [f, setF] = useState({
    title: '', productName: '', qtyValue: '', qtyUnit: 'MT',
    targetPrice: '', deliveryPlace: '', destinationCountry: '', deadline: '', auctionEndsAt: '', notes: '', categoryId: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: categories = [] } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const create = useMutation({
    mutationFn: () =>
      api.buyerBids.create({
        mode,
        title: f.title,
        productName: f.productName,
        qtyValue: Number(f.qtyValue),
        qtyUnit: f.qtyUnit,
        targetPriceCents: f.targetPrice ? Math.round(Number(f.targetPrice) * 100) : undefined,
        deliveryPlace: f.deliveryPlace || undefined,
        destinationCountry: f.destinationCountry || undefined,
        deadline: f.deadline ? new Date(f.deadline).toISOString() : undefined,
        auctionEndsAt: mode === 'auction' && f.auctionEndsAt ? new Date(f.auctionEndsAt).toISOString() : undefined,
        notes: f.notes || undefined,
        categoryId: f.categoryId || undefined,
        images,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-buyer-bids'] }); onClose(); },
    onError: (e) => setError(errMessage(e, t('console.buyer.postError'))),
  });

  const ready = f.title.trim() && f.productName.trim() && Number(f.qtyValue) > 0 && (mode !== 'auction' || !!f.auctionEndsAt);

  return (
    <Modal closeLabel={t('common:close')}
      open
      onClose={onClose}
      title={t('console.buyer.postRequirement')}
      className="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
          <Button disabled={!ready || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? t('console.buyer.posting') : mode === 'auction' ? t('console.buyer.startAuction') : t('console.buyer.requestBids')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['quote', 'auction'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ' +
                (mode === m ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft')
              }
            >
              {m === 'quote' ? t('console.buyer.requestBids') : t('console.buyer.createAuction')}
            </button>
          ))}
        </div>
        <p className="rounded-lg bg-mango-soft px-3 py-2 text-xs text-ink-soft">{t(MODE_KEY[mode])}</p>

        <Input label={t('console.buyer.title')} placeholder={t('console.buyer.phTitle')} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('console.buyer.product')} placeholder={t('console.buyer.phProduct')} value={f.productName} onChange={(e) => setF({ ...f, productName: e.target.value })} />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">{t('console.buyer.category')}</span>
            <select className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
              <option value="">{t('console.buyer.any')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <Input label={t('console.buyer.quantity')} type="number" value={f.qtyValue} onChange={(e) => setF({ ...f, qtyValue: e.target.value })} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.unit')}</span>
            <select
              value={toUnit(f.qtyUnit)}
              onChange={(e) => setF({ ...f, qtyUnit: e.target.value })}
              className="h-11 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
            >
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>{t(`enums:unit.${u}`)}</option>
              ))}
            </select>
          </label>
          <Input label={t('console.buyer.targetPrice', { unit: f.qtyUnit })} type="number" value={f.targetPrice} onChange={(e) => setF({ ...f, targetPrice: e.target.value })} />
          <Input label={t('console.buyer.deliveryPlace')} placeholder={t('console.buyer.phDeliveryPlace')} value={f.deliveryPlace} onChange={(e) => setF({ ...f, deliveryPlace: e.target.value })} />
          <Input label={t('console.buyer.destinationCountry')} placeholder={t('console.buyer.phDestCountry')} value={f.destinationCountry} onChange={(e) => setF({ ...f, destinationCountry: e.target.value })} />
          {mode === 'auction' ? (
            <Input label={t('console.buyer.auctionCloses')} type="datetime-local" value={f.auctionEndsAt} onChange={(e) => setF({ ...f, auctionEndsAt: e.target.value })} />
          ) : (
            <Input label={t('console.buyer.bidDeadline')} type="datetime-local" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          )}
        </div>
        <Input label={t('console.buyer.notes')} placeholder={t('console.buyer.phNotes')} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />

        {/* Buyer's own upload route — the products one is seller-only. */}
        <div>
          <GalleryEditor images={images} onChange={setImages} onError={setError} upload={api.buyerBids.uploadImages} max={MAX_IMAGES} />
          <p className="mt-1.5 text-xs text-ink-soft">{t('console.buyer.photosHint')}</p>
        </div>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

function BuyerBidCard({ buyerBid, onOpen }: { buyerBid: ApiBuyerBid; onOpen: () => void }) {
  const { t } = useI18n();
  const isAuction = buyerBid.mode === 'auction';
  const bids = buyerBid._count?.sellerBids ?? 0;
  const time = isAuction ? hms(buyerBid.auctionEndsAt) : null;
  const live = isAuction && buyerBid.status === 'open' && !!time;
  // Reverse auction: sellers underbid, so "under target" is good progress.
  const underTarget =
    buyerBid.bestPriceCents != null && buyerBid.targetPriceCents != null
      ? Math.round(((buyerBid.targetPriceCents - buyerBid.bestPriceCents) / buyerBid.targetPriceCents) * 100)
      : null;

  return (
    <Card interactive onClick={onOpen} padded={false} className="overflow-hidden">
      <div className="flex">
        {/* mode rail */}
        <div className={'flex w-14 shrink-0 items-center justify-center ' + (isAuction ? 'bg-mango-soft text-mango-deep' : 'bg-brand-surface text-brand-dark')}>
          <Icon name={isAuction ? 'gavel' : 'chart'} size={22} />
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isAuction ? 'mango' : 'info'}>{isAuction ? t('console.buyer.reverseAuction') : t('console.buyer.bids')}</Badge>
            <Badge tone={buyerBid.status === 'open' ? 'green' : 'slate'}>{t(`console.buyer.status.${buyerBid.status}`, { defaultValue: buyerBid.status })}</Badge>
            {live && (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-pill bg-status-error/10 px-2.5 py-1 font-numeric text-xs font-bold text-status-error">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-status-error" />{t('auction.ends')} {time}
              </span>
            )}
          </div>
          <div className="mt-2 truncate font-display font-bold text-ink">{buyerBid.title}</div>
          <div className="text-xs text-ink-soft">
            #{buyerBid.reference} · {buyerBid.qtyValue} {buyerBid.qtyUnit}
            {buyerBid.deliveryPlace ? ` · ${buyerBid.deliveryPlace}` : ''}
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] text-ink-soft">{buyerBid.bestPriceCents != null ? t('console.buyer.bestOffer') : t('console.buyer.awaitingBids')}</div>
              <div className="font-numeric text-xl font-extrabold text-brand-dark">
                {buyerBid.bestPriceCents != null ? `${usd(buyerBid.bestPriceCents)}` : '—'}
                {buyerBid.bestPriceCents != null && <span className="text-xs font-normal text-ink-soft">/{buyerBid.qtyUnit}</span>}
              </div>
              {buyerBid.targetPriceCents != null && (
                <div className="text-[11px] text-ink-soft">{t('console.buyer.target', { price: usd(buyerBid.targetPriceCents) })}</div>
              )}
            </div>
            <div className="text-end">
              <div className="inline-flex items-center gap-1.5 rounded-pill bg-brand-surface px-2.5 py-1 text-xs font-bold text-brand-dark">
                <Icon name="user" size={12} />{t('console.buyer.bidsCount', { count: bids })}
              </div>
              {underTarget != null && underTarget > 0 && (
                <div className="mt-1 text-[11px] font-semibold text-status-success">{t('console.buyer.underTarget', { pct: underTarget })}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Buyer's "Buyer Bids": post requirements, watch seller bids land, award the winner. */
export function BuyerBids() {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: buyerBids = [], isLoading } = useQuery<ApiBuyerBid[]>({
    queryKey: ['my-buyer-bids'],
    queryFn: () => api.buyerBids.mine(),
    refetchInterval: 15000,
  });
  const { data: auctionBids = [] } = useQuery({
    queryKey: ['my-auction-bids'],
    queryFn: () => api.auctions.mine() as Promise<{ id: string; amountCents: number; product?: { name: string; slug?: string; emoji?: string | null; flag?: string | null } }[]>,
  });

  // 1s clock so auction-mode requirement countdowns tick between refetches.
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);

  // The room owns the whole section while it's open — it's a screen, not an overlay.
  if (openId) return <BuyerBidRoom id={openId} onBack={() => setOpenId(null)} />;

  const open = buyerBids.filter((r) => r.status === 'open');
  const closed = buyerBids.filter((r) => r.status !== 'open');
  const totalSellerBids = buyerBids.reduce((n, r) => n + (r._count?.sellerBids ?? 0), 0);
  const stats = [
    { k: t('console.buyer.statOpen'), v: String(open.length) },
    { k: t('console.buyer.statResponses'), v: String(totalSellerBids) },
    { k: t('console.buyer.statLiveBids'), v: String(auctionBids.length) },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.nav.bids')}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t('console.buyer.bidsSub')}</p>
        </div>
        <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => setCreating(true)}>{t('console.buyer.postRequirement')}</Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.k} className="rounded-xl border border-surface-border bg-white p-4">
            <div className="font-numeric text-2xl font-extrabold text-brand-dark">{s.v}</div>
            <div className="mt-0.5 text-xs text-ink-soft">{s.k}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="mb-3 font-display font-bold text-ink">{t('console.buyer.openRequirements')}</h3>
            {open.length === 0 ? (
              <Card className="py-10 text-center text-ink-soft">
                {t('console.buyer.nothingOpen')}
              </Card>
            ) : (
              <div className="space-y-3">{open.map((r) => <BuyerBidCard key={r.id} buyerBid={r} onOpen={() => setOpenId(r.id)} />)}</div>
            )}
          </section>

          {closed.length > 0 && (
            <section>
              <h3 className="mb-3 font-display font-bold text-ink">{t('console.buyer.closedSection')}</h3>
              <div className="space-y-3">{closed.map((r) => <BuyerBidCard key={r.id} buyerBid={r} onOpen={() => setOpenId(r.id)} />)}</div>
            </section>
          )}

          <section>
            <h3 className="mb-3 font-display font-bold text-ink">{t('console.buyer.myAuctionBids')}</h3>
            {auctionBids.length === 0 ? (
              <Card className="py-10 text-center text-ink-soft">{t('console.buyer.noAuctionBids')}</Card>
            ) : (
              <div className="space-y-2">
                {auctionBids.map((b) => {
                  const row = (
                    <Card interactive={!!b.product?.slug} padded={false} className="flex items-center gap-3 p-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-xl">{b.product?.emoji ?? '🌾'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display font-semibold text-ink">{b.product?.flag} {b.product?.name}</div>
                        <div className="text-xs text-ink-soft">{t('console.buyer.yourBidRow')}</div>
                      </div>
                      <span className="font-numeric font-extrabold text-brand-dark">{usd(b.amountCents)}</span>
                    </Card>
                  );
                  return b.product?.slug ? <Link key={b.id} to={`/product/${b.product.slug}`}>{row}</Link> : <div key={b.id}>{row}</div>;
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {creating && <NewBuyerBidModal onClose={() => setCreating(false)} />}
    </div>
  );
}
