import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import type { ApiBuyerBidDetail, ApiBuyerBidRow } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { errMessage } from './order-parts';

const HERO = 'radial-gradient(900px 420px at 82% -20%,rgba(83,184,106,.22),transparent),linear-gradient(150deg,#0B3D2E,#0e4632)';

function useCountdown(end: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const ms = end ? new Date(end).getTime() - now : 0;
  const ended = !end || ms <= 0;
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return { h: p(Math.floor(s / 3600)), m: p(Math.floor((s % 3600) / 60)), s: p(s % 60), ended };
}

/** Localized "3m ago" via Intl — no per-language strings to maintain. */
function ago(iso: string, locale: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' });
  if (m < 1) return rtf.format(0, 'minute');
  if (m < 60) return rtf.format(-m, 'minute');
  const h = Math.floor(m / 60);
  return h < 24 ? rtf.format(-h, 'hour') : rtf.format(-Math.floor(h / 24), 'day');
}

/* ── Seller's submit panel ───────────────────────────────────────── */

/** Seller offers a price. In auction mode it must undercut the current best. */
function SellerSubmitPanel({ buyerBid }: { buyerBid: ApiBuyerBidDetail }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState(String(buyerBid.qtyValue));
  const [eta, setEta] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      api.buyerBids.submitBid(buyerBid.id, {
        priceCents: Math.round(Number(price) * 100),
        qtyValue: Number(qty),
        etaDays: eta ? Number(eta) : undefined,
        message: message || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['open-buyer-bids'] });
      qc.invalidateQueries({ queryKey: ['my-seller-bids'] });
      qc.invalidateQueries({ queryKey: ['buyer-bid-detail', buyerBid.id] });
      qc.invalidateQueries({ queryKey: ['buyer-bid-book', buyerBid.id] });
      setPrice(''); setEta(''); setMessage(''); setError('');
    },
    onError: (e) => setError(errMessage(e, t('console.seller.submitQuoteError'))),
  });

  const closed = buyerBid.status !== 'open';
  const isAuction = buyerBid.mode === 'auction';

  return (
    <Card>
      <h3 className="font-display text-lg font-extrabold text-ink">
        {buyerBid.yourBestPriceCents != null ? t('console.buyerBidRoom.updateBid') : t('console.buyerBidRoom.yourOffer')}
      </h3>

      {buyerBid.yourBestPriceCents != null && (
        <p className="mt-1 text-xs text-ink-soft">
          {t('console.buyerBidRoom.yourCurrent', { price: usd(buyerBid.yourBestPriceCents), unit: buyerBid.qtyUnit })}
        </p>
      )}

      {/* Reverse auctions publish the floor; sealed quote-mode requirements never do. */}
      {isAuction && (
        <p className="mt-3 rounded-lg bg-mango-soft px-3 py-2 text-sm text-ink-soft">
          {buyerBid.bestPriceCents != null
            ? t('console.buyerBidRoom.mustBeat', { price: usd(buyerBid.bestPriceCents), unit: buyerBid.qtyUnit })
            : t('console.buyerBidRoom.noBidsOpening')}
        </p>
      )}
      {buyerBid.targetPriceCents != null && (
        <p className="mt-2 text-xs text-ink-soft">
          {t('console.buyerBidRoom.targetPrice', { price: usd(buyerBid.targetPriceCents), unit: buyerBid.qtyUnit })}
        </p>
      )}

      {closed ? (
        <p className="mt-3 rounded-lg bg-brand-surface px-3 py-2 text-sm text-ink-soft">{t('console.buyerBidRoom.closedNote')}</p>
      ) : (
        <div className="mt-4 space-y-3">
          <Input label={t('console.seller.yourPricePerUnit', { unit: buyerBid.qtyUnit })} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('console.seller.qtySupply', { unit: buyerBid.qtyUnit })} type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            <Input label={t('console.seller.etaDays')} type="number" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
          <Input label={t('console.seller.messageOptional')} value={message} onChange={(e) => setMessage(e.target.value)} />
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <Button className="w-full" disabled={!Number(price) || !Number(qty) || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? t('console.buyerBidRoom.submitting') : t('console.buyerBidRoom.submitBid')}
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ── The room ────────────────────────────────────────────────────── */

/**
 * The buyer-bid "room" — the reverse-auction twin of `AuctionRoom`. Countdown
 * hero, the requirement's photos and specs, and the masked bid book where the
 * LOWEST price wins. Sealed in quote mode: a non-owner sees only their own rows.
 */
export function BuyerBidRoom({ id, onBack }: { id: string; onBack: () => void }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');

  const { data: buyerBid, isLoading } = useQuery<ApiBuyerBidDetail>({
    queryKey: ['buyer-bid-detail', id],
    queryFn: () => api.buyerBids.get(id),
    refetchInterval: 4000,
  });
  const { data: book = [] } = useQuery<ApiBuyerBidRow[]>({
    queryKey: ['buyer-bid-book', id],
    queryFn: () => api.buyerBids.bidBook(id),
    refetchInterval: 4000,
  });

  const isAuction = buyerBid?.mode === 'auction';
  const timer = useCountdown((isAuction ? buyerBid?.auctionEndsAt : buyerBid?.deadline) ?? null);

  const award = useMutation({
    mutationFn: (sellerBidId: string) => api.buyerBids.award(id, sellerBidId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-buyer-bids'] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      qc.invalidateQueries({ queryKey: ['buyer-bid-detail', id] });
      qc.invalidateQueries({ queryKey: ['buyer-bid-book', id] });
    },
    onError: (e) => setError(errMessage(e, t('console.buyer.awardError'))),
  });

  const back = (
    <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand">
      <Icon name="chevronLeft" size={16} />{t('console.buyerBidRoom.back')}
    </button>
  );

  if (isLoading || !buyerBid) {
    return <div>{back}<p className="py-10 text-center text-ink-soft">{t('common:loading')}</p></div>;
  }

  const photos = buyerBid.images ?? [];
  const hasPhotos = photos.length > 0;
  const current = Math.min(active, Math.max(0, photos.length - 1));
  // Quote mode is sealed by design: a non-owner never sees the book.
  const sealed = !buyerBid.isOwner && buyerBid.mode === 'quote';

  const specs: [string, string][] = [
    [t('console.buyer.product'), buyerBid.productName || '—'],
    [t('console.buyer.quantity'), `${buyerBid.qtyValue} ${buyerBid.qtyUnit}`],
    [t('console.buyerBidRoom.targetPriceShort'), buyerBid.targetPriceCents != null ? `${usd(buyerBid.targetPriceCents)}/${buyerBid.qtyUnit}` : '—'],
    [t('console.buyer.deliveryPlace'), buyerBid.deliveryPlace || '—'],
    [t('console.buyer.destinationCountry'), buyerBid.destinationCountry || '—'],
    [
      isAuction ? t('console.buyer.auctionCloses') : t('console.buyer.bidDeadline'),
      (isAuction ? buyerBid.auctionEndsAt : buyerBid.deadline)
        ? new Date((isAuction ? buyerBid.auctionEndsAt : buyerBid.deadline)!).toLocaleString()
        : '—',
    ],
  ];

  return (
    <div>
      {back}

      {/* ===== TIMER HERO ===== */}
      <section style={{ background: HERO }} className="rounded-2xl px-4 py-5 text-white sm:px-5 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-5 sm:gap-6">
          {/* `min-w-0` first: a 260px floor inside a ~300px console column left
              nothing for the countdown and forced a horizontal scroll. */}
          <div className="min-w-0 sm:min-w-[260px]">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className={'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ' + (isAuction ? 'bg-status-error' : 'bg-white/15')}>
                {isAuction && !timer.ended && <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white" />}
                {isAuction ? t('console.buyer.reverseAuction') : t('console.buyer.bids')}
              </span>
              <span className="text-xs text-brand-leaf">#{buyerBid.reference}</span>
            </div>
            <h1 className="max-w-full break-words font-display text-xl font-extrabold leading-tight tracking-tight sm:max-w-[460px] sm:text-2xl">{buyerBid.title}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-brand-mint/90">
              <span>{buyerBid.qtyValue} {buyerBid.qtyUnit}</span>
              {buyerBid.deliveryPlace && <><span className="opacity-40">·</span><span>📍 {buyerBid.deliveryPlace}</span></>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg border border-brand-leaf/30 bg-brand-leaf/10 px-2.5 py-1.5 text-xs font-bold text-brand-leaf">
                {t('console.buyerBidRoom.sellersN', { count: buyerBid.sellerCount })}
              </span>
              {buyerBid.bestPriceCents != null && (
                <span className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-bold">
                  {t('console.buyerBidRoom.bestOffer', { price: usd(buyerBid.bestPriceCents), unit: buyerBid.qtyUnit })}
                </span>
              )}
            </div>
          </div>

          {/* countdown */}
          <div className="text-center">
            <div className="mb-2.5 text-[11px] font-bold tracking-[0.16em] text-brand-leaf">
              {timer.ended ? t('console.buyerBidRoom.ended') : isAuction ? t('auction.closesIn') : t('console.buyerBidRoom.deadlineIn')}
            </div>
            {/* Three 76px boxes + gaps is 248px — wider than the console column
                on a phone. Boxes shrink and the row wraps instead. */}
            <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-2.5">
              {[[timer.h, t('auction.hours')], [timer.m, t('auction.minutes')]].map(([v, l], i) => (
                <div key={i} className="w-[64px] rounded-2xl border border-white/15 bg-white/[0.08] px-1.5 pb-2.5 pt-3 sm:w-[76px]">
                  <div className="font-numeric text-3xl font-bold leading-none sm:text-[2.6rem]">{v}</div>
                  <div className="mt-1.5 text-[10px] tracking-wider text-brand-leaf">{l}</div>
                </div>
              ))}
              <div className="w-[64px] rounded-2xl border border-white/15 px-1.5 pb-2.5 pt-3 shadow-[0_10px_26px_rgba(201,67,67,0.4)] sm:w-[76px]" style={{ background: 'linear-gradient(160deg,#C94343,#a83333)' }}>
                <div className="font-numeric text-3xl font-bold leading-none sm:text-[2.6rem]">{timer.s}</div>
                <div className="mt-1.5 text-[10px] tracking-wider text-white/80">{t('auction.seconds')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MAIN GRID ===== */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        {/* LEFT: photos + requirement */}
        <div>
          <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-surface-border" style={{ background: 'linear-gradient(140deg,#0e4632,#146B3A)' }}>
            {hasPhotos ? (
              <img src={assetUrl(photos[current])} alt={buyerBid.productName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-8xl drop-shadow-lg">{buyerBid.category?.emoji ?? '🌾'}</span>
            )}
          </div>
          {hasPhotos && photos.length > 1 && (
            <div className="mt-3 flex gap-2.5">
              {photos.slice(0, 5).map((src, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`Image ${i + 1}`} className={'aspect-square flex-1 overflow-hidden rounded-xl border-2 ' + (i === current ? 'border-brand-leaf' : 'border-surface-border')}>
                  <img src={assetUrl(src)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <Card className="mt-5">
            <h3 className="font-display text-lg font-bold text-ink">{t('console.buyerBidRoom.requirementDetails')}</h3>
            <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-surface-border py-2.5 text-sm">
                  <dt className="text-ink-soft">{k}</dt><dd className="text-end font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {buyerBid.notes && <p className="mt-3 rounded-lg bg-brand-surface px-3 py-2 text-sm text-ink-soft">{buyerBid.notes}</p>}
          </Card>

          {/* price / bid section — moved below the product */}
          {buyerBid.isOwner ? (
            <Card className="mt-5">
              <h3 className="font-display text-lg font-extrabold text-ink">{t('console.buyerBidRoom.ownerNote')}</h3>
              <p className="mt-1 text-sm text-ink-soft">{t('console.buyerBidRoom.ownerHint')}</p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[11px] text-ink-soft">{buyerBid.bestPriceCents != null ? t('console.buyer.bestOffer') : t('console.buyer.awaitingBids')}</div>
                  <div className="font-numeric text-2xl font-extrabold text-brand-dark">
                    {buyerBid.bestPriceCents != null ? usd(buyerBid.bestPriceCents) : '—'}
                    {buyerBid.bestPriceCents != null && <span className="text-xs font-normal text-ink-soft">/{buyerBid.qtyUnit}</span>}
                  </div>
                </div>
                <Badge tone={buyerBid.status === 'open' ? 'green' : 'slate'}>
                  {t(`console.buyer.status.${buyerBid.status}`, { defaultValue: buyerBid.status })}
                </Badge>
              </div>
              {buyerBid.status === 'awarded' && (
                <p className="mt-3 rounded-lg bg-brand-surface px-3 py-2 text-sm text-ink-soft">{t('console.buyer.awardedNote')}</p>
              )}
            </Card>
          ) : user ? (
            <div className="mt-5"><SellerSubmitPanel buyerBid={buyerBid} /></div>
          ) : (
            /* Logged-out visitor on the public board — invite sign-in to bid. */
            <Card className="mt-5">
              <h3 className="font-display text-lg font-extrabold text-ink">{t('console.buyerBidRoom.yourOffer')}</h3>
              <p className="mt-1 text-sm text-ink-soft">{t('console.buyerBidRoom.signInToBid')}</p>
              <Link to="/login" className="mt-4 block">
                <Button className="w-full">{t('console.buyerBidRoom.signIn')}</Button>
              </Link>
            </Card>
          )}

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-leaf/40 bg-brand-surface px-4 py-3.5">
            <Icon name="shield" size={22} className="shrink-0 text-brand-dark" />
            <div className="text-xs leading-relaxed text-brand-dark">{t('auction.escrowWin')}</div>
          </div>
        </div>

        {/* RIGHT: masked bid book on top */}
        <aside className="flex flex-col gap-5">
          <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-ink">{t('console.buyerBidRoom.bidBook')}</h3>
          <span className="text-xs font-bold text-ink-soft">{t('console.buyerBidRoom.sellersN', { count: buyerBid.sellerCount })}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          {sealed ? t('console.buyerBidRoom.sealedNote') : buyerBid.isOwner ? t('console.buyerBidRoom.ownerBookNote') : t('console.buyerBidRoom.maskedNote')}
        </p>
        {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
        <div className="mt-4 space-y-2">
          {book.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">
              {sealed ? t('console.buyerBidRoom.sealedNoBid') : t('console.buyerBidRoom.noBidsYet')}
            </p>
          ) : book.map((b) => (
            <div key={b.id} className={'flex flex-wrap items-center gap-3.5 rounded-xl border px-4 py-3 ' + (b.isYou ? 'border-mango-soft bg-mango-soft/40' : b.isTop ? 'border-brand-leaf/50 bg-brand-surface' : 'border-surface-border bg-white')}>
              <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + (b.isTop ? 'bg-status-success' : 'bg-surface-border')} />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-base">{b.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Only the owner gets a real id, so only they get a profile link. */}
                  {b.sellerId ? (
                    <Link to={`/u/${b.sellerId}`} className="font-numeric text-sm font-semibold text-ink underline-offset-2 hover:underline">{b.masked}</Link>
                  ) : (
                    <span className="font-numeric text-sm font-semibold text-ink">{b.masked}</span>
                  )}
                  {b.isTop && <span className="rounded bg-status-success px-1.5 py-0.5 text-[10px] font-bold text-white">{t('console.buyerBidRoom.lowestBid')}</span>}
                  {b.status === 'awarded' && <Badge tone="green">{t('console.buyer.awarded')}</Badge>}
                </div>
                <div className="text-xs text-ink-soft">
                  {b.qtyValue} {buyerBid.qtyUnit}{b.etaDays ? ` · ${t('console.buyer.etaDays', { days: b.etaDays })}` : ''} · {ago(b.createdAt, lang)}
                  {b.message ? ` · “${b.message}”` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-numeric font-bold text-ink">
                  {usd(b.priceCents)}<span className="text-xs font-normal text-ink-soft">/{buyerBid.qtyUnit}</span>
                </div>
                {buyerBid.isOwner && buyerBid.status === 'open' && b.status === 'submitted' && (
                  <Button size="sm" disabled={award.isPending} onClick={() => award.mutate(b.id)}>
                    {award.isPending ? t('console.buyer.awarding') : t('console.buyer.award')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
