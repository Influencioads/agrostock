import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Icon } from '@agrotraders/ui';
import type { ApiAuctionBidRow, ApiAuctionDetail } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { chatBus } from '../../chat/chatBus';
import { BidPanel } from './BidPanel';
import { unitSuffix } from '@agrotraders/types';

interface CardProduct {
  id: string; name: string; emoji?: string | null; flag?: string | null;
  seller?: string; sellerId?: string | null; images?: string[]; imageUrl?: string | null;
  grade?: string | null; origin?: string | null; qty?: string | null; moq?: string | null;
  unit?: string; delivery?: string | null; marketName?: string | null;
}

const HERO = 'radial-gradient(900px 420px at 82% -20%,rgba(83,184,106,.22),transparent),linear-gradient(150deg,#0B3D2E,#0e4632)';
// Labels are i18n keys under `page.product.quality.*`; scores are indicative.
const quality = [
  { k: 'grainPurity', v: 96 }, { k: 'moistureControl', v: 92 },
  { k: 'packaging', v: 95 }, { k: 'documentation', v: 94 },
];

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

/** The live auction "room" — big countdown hero, lot details, bid panel and the
 *  public masked bid history. Matches the AgroStock auction design 1:1. */
export function AuctionRoom({ slug, product }: { slug: string; product: CardProduct }) {
  const { t, lang } = useI18n();
  const { fmtCents } = useCurrency();
  const [active, setActive] = useState(0);
  const { data: auction } = useQuery<ApiAuctionDetail>({
    queryKey: ['auction', slug], queryFn: () => api.auctions.detail(slug), refetchInterval: 4000,
  });
  const { data: bids = [] } = useQuery<ApiAuctionBidRow[]>({
    queryKey: ['auction-bids', slug], queryFn: () => api.auctions.bids(slug), refetchInterval: 4000,
  });
  const timer = useCountdown(auction?.auctionEndsAt ?? null);

  const photos = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const hasPhotos = photos.length > 0;
  const current = Math.min(active, Math.max(0, photos.length - 1));

  // Values are real listing data — an em-dash when absent, rather than the
  // invented "Premium"/"Ready" fallbacks this used to show on every lot.
  const specs: [string, string][] = [
    [t('auction.spec.grade'), product.grade || '—'],
    [t('auction.spec.origin'), product.origin || `${product.flag ?? ''} ${product.seller ?? ''}`.trim() || '—'],
    [t('auction.spec.available'), product.qty || '—'],
    [t('auction.spec.moqLot'), product.moq || '—'],
    [t('auction.spec.delivery'), product.delivery || '—'],
    [t('auction.spec.unit'), unitSuffix(product.unit)],
  ];
  const sellerInitials = (product.seller ?? 'AG').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="bg-surface-bg">
      {/* breadcrumb */}
      <div className="border-b border-surface-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3.5 text-sm text-ink-soft lg:px-6">
          <Link to="/" className="hover:text-brand">{t('page.product.home')}</Link><span>›</span>
          <Link to="/market" className="hover:text-brand">{t('auction.liveAuctions')}</Link><span>›</span>
          <span className="truncate font-semibold text-ink">{product.name}</span>
        </div>
      </div>

      {/* ===== BIG TIMER HERO ===== */}
      <section style={{ background: HERO }} className="text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-4 py-7 lg:px-8">
          <div className="min-w-0 sm:min-w-[280px]">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-status-error px-2.5 py-1.5 text-xs font-bold">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white" />{t('auction.liveAuction')}
              </span>
              <span className="text-xs text-brand-leaf">#{slug.slice(0, 8).toUpperCase()}</span>
            </div>
            <h1 className="max-w-full break-words font-display text-2xl font-extrabold leading-tight tracking-tight sm:max-w-[460px] sm:text-3xl">{product.name}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-brand-mint/90">
              <span>{product.flag} {product.seller}</span>
              {product.marketName && <><span className="opacity-40">·</span><span>📍 {product.marketName}</span></>}
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1.5"><Icon name="shield" size={14} className="text-brand-leaf" />{t('site.safeDeal')}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg border border-brand-leaf/30 bg-brand-leaf/10 px-2.5 py-1.5 text-xs font-bold text-brand-leaf">{t('auction.biddersN', { count: auction?.bidCount ?? 0 })}</span>
              <span className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-bold">{t('auction.minIncrement', { amount: fmtCents(auction?.bidIncrementCents ?? 0) })}</span>
              {auction?.hasReserve && (
                <span className={'rounded-lg border px-2.5 py-1.5 text-xs font-bold ' + (auction.reserveMet ? 'border-brand-leaf/30 bg-brand-leaf/10 text-brand-leaf' : 'border-status-error/40 bg-status-error/20 text-white')}>
                  {auction.reserveMet ? t('auction.reserveMet') : t('auction.reserveNotMet')}
                </span>
              )}
            </div>
          </div>

          {/* countdown */}
          <div className="text-center">
            <div className="mb-2.5 text-[11px] font-bold tracking-[0.16em] text-brand-leaf">{t('auction.closesIn')}</div>
            {/* 3 × 88px + gaps is 285px — it fits 390px but not a 320px phone. */}
            <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-2.5">
              {[[timer.h, t('auction.hours')], [timer.m, t('auction.minutes')]].map(([v, l], i) => (
                <div key={i} className="w-[68px] rounded-2xl border border-white/15 bg-white/[0.08] px-1.5 pb-2.5 pt-3.5 sm:w-[88px]">
                  <div className="font-numeric text-[2.2rem] font-bold leading-none sm:text-[3.1rem]">{v}</div>
                  <div className="mt-1.5 text-[10px] tracking-wider text-brand-leaf">{l}</div>
                </div>
              ))}
              <div className="w-[68px] rounded-2xl border border-white/15 px-1.5 pb-2.5 pt-3.5 shadow-[0_10px_26px_rgba(201,67,67,0.4)] sm:w-[88px]" style={{ background: 'linear-gradient(160deg,#C94343,#a83333)' }}>
                <div className="font-numeric text-[2.2rem] font-bold leading-none sm:text-[3.1rem]">{timer.s}</div>
                <div className="mt-1.5 text-[10px] tracking-wider text-white/80">{t('auction.seconds')}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-brand-mint/80">{t('auction.antiSnipe')}</div>
          </div>
        </div>
      </section>

      {/* ===== MAIN GRID ===== */}
      <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-7 lg:grid-cols-2 lg:px-8">
        {/* LEFT: product */}
        <div>
          <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-surface-border" style={{ background: 'linear-gradient(140deg,#0e4632,#146B3A)' }}>
            {hasPhotos ? (
              <img src={photos[current]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-8xl drop-shadow-lg">{product.emoji ?? '🌾'}</span>
            )}
            <span className="absolute start-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-lg bg-status-error px-2.5 py-1.5 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white" />{t('auction.liveLot', { qty: product.qty ?? product.moq ?? '' })}
            </span>
          </div>
          {hasPhotos && photos.length > 1 && (
            <div className="mt-3 flex gap-2.5">
              {photos.slice(0, 5).map((src, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`Image ${i + 1}`} className={'aspect-square flex-1 overflow-hidden rounded-xl border-2 ' + (i === current ? 'border-brand-leaf' : 'border-surface-border')}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* lot details */}
          <Card className="mt-5">
            <h3 className="font-display text-lg font-bold text-ink">{t('auction.lotDetails')}</h3>
            <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-surface-border py-2.5 text-sm">
                  <dt className="text-ink-soft">{k}</dt><dd className="text-end font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* inspection score */}
          <Card className="mt-4">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="font-display font-bold text-ink">{t('auction.inspectionScore')}</span>
              <span className="font-numeric text-xl font-bold text-status-success">93<span className="text-xs text-ink-soft">/100</span></span>
            </div>
            <div className="space-y-3">
              {quality.map((q) => (
                <div key={q.k}>
                  <div className="flex justify-between text-xs text-ink-soft">{t(`page.product.quality.${q.k}`)}<b className="text-ink">{q.v}%</b></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-surface">
                    <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${q.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* price / bid section — moved below the product */}
          <div className="mt-5"><BidPanel slug={slug} /></div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-leaf/40 bg-brand-surface px-4 py-3.5">
            <Icon name="shield" size={22} className="shrink-0 text-brand-dark" />
            <div className="text-xs leading-relaxed text-brand-dark">{t('auction.escrowWin')}</div>
          </div>
        </div>

        {/* RIGHT: masked bid history on top, then seller */}
        <aside className="flex flex-col gap-5">
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-ink">{t('auction.bidHistory')}</h3>
              {!timer.ended && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-status-error">
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-status-error" />{t('auction.liveBids', { count: auction?.bidCount ?? 0 })}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t('auction.maskedNote')}</p>
            <div className="mt-4 space-y-2">
              {bids.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-soft">{t('auction.noBidsYet')}</p>
              ) : bids.map((b) => (
                <div key={b.id} className={'flex items-center gap-3.5 rounded-xl border px-4 py-3 ' + (b.isYou ? 'border-mango-soft bg-mango-soft/40' : b.isTop ? 'border-brand-leaf/50 bg-brand-surface' : 'border-surface-border bg-white')}>
                  <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + (b.isTop ? 'bg-status-success' : 'bg-surface-border')} />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-base">{b.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-numeric text-sm font-semibold text-ink">{b.masked}</span>
                      {b.isTop && <span className="rounded bg-status-success px-1.5 py-0.5 text-[10px] font-bold text-white">{t('auction.topBid')}</span>}
                      {b.auto && <span className="rounded bg-brand-surface px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">{t('auction.auto')}</span>}
                    </div>
                    <div className="text-xs text-ink-soft">{ago(b.createdAt, lang)}</div>
                  </div>
                  <div className="font-numeric font-bold text-ink">{fmtCents(b.amountCents)}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#0B3D2E,#146B3A)' }}>
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 font-display text-lg font-extrabold">{sellerInitials}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display font-bold">{product.seller}</span>
                  <Icon name="shield" size={15} className="text-brand-leaf" />
                </div>
                <div className="mt-0.5 truncate text-xs text-brand-mint/80">{product.flag} · {t('auction.sellerTrades')}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                {product.sellerId && (
                  <button onClick={() => chatBus.openCommunityDm(product.sellerId!, product.seller ?? '')} aria-label={t('page.product.chatSeller')} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25">
                    <Icon name="message" size={16} />
                  </button>
                )}
                {product.sellerId && (
                  <Link to={`/u/${product.sellerId}`} className="flex h-9 items-center rounded-lg bg-white px-3.5 text-xs font-bold text-brand-evergreen hover:brightness-95">{t('auction.store')}</Link>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
