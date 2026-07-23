import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiBuyerBid } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { BuyerBidRoom } from './BuyerBidRoom';

interface AuctionRow {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  flag: string | null;
  startBidCents: number | null;
  highestCents: number | null;
  bidIncrementCents: number;
  hasReserve: boolean;
  reserveMet: boolean;
  auctionEndsAt: string | null;
  bidCount: number;
  seller?: { name: string };
}

/** H:M:S while < 1 day out, else "Xd Yh"; ticks via the parent's 1s clock. */
function hms(end: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

interface MyBid {
  id: string;
  amountCents: number;
  createdAt: string;
  product?: { name: string; slug: string; emoji?: string | null };
}

function countdown(end: string | null, endedLabel: string) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return endedLabel;
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
}

/**
 * Buyer's auction hub: live seller auctions to join, plus the buy-side auctions
 * this buyer created (which are buyer bids in `auction` mode) and their results.
 */
export function BuyerAuctions() {
  const { t } = useI18n();
  const [roomId, setRoomId] = useState<string | null>(null);
  const { data: auctions = [], isLoading } = useQuery<AuctionRow[]>({
    queryKey: ['live-auctions'],
    queryFn: () => api.auctions.list() as Promise<AuctionRow[]>,
    refetchInterval: 5000,
  });
  const { data: bids = [] } = useQuery<MyBid[]>({
    queryKey: ['my-auction-bids'],
    queryFn: () => api.auctions.mine() as Promise<MyBid[]>,
    refetchInterval: 10000,
  });
  const { data: requirements = [] } = useQuery<ApiBuyerBid[]>({
    queryKey: ['my-buyer-bids'],
    queryFn: () => api.buyerBids.mine(),
    refetchInterval: 15000,
  });

  // 1s clock so the live countdowns tick smoothly between the 5s refetches.
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);

  // The room owns the whole section while it's open — it's a screen, not an overlay.
  if (roomId) return <BuyerBidRoom id={roomId} onBack={() => setRoomId(null)} />;

  const myAuctions = requirements.filter((r) => r.mode === 'auction');
  // Open auctions now expose the current highest bid; `mine` is this buyer's last
  // offer, used to show "you're leading / raise" against the public highest.
  const bidBySlug = new Map(bids.map((b) => [b.product?.slug, b]));

  return (
    <div>
      <div className="mb-5">
        <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.nav.auctions')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('console.buyer.auctionsHubSub')}</p>
      </div>

      <section className="mb-8">
        <h3 className="mb-3 font-display font-bold text-ink">{t('console.buyer.liveSellerAuctions')}</h3>
        {isLoading ? (
          <p className="text-ink-soft">{t('common:loading')}</p>
        ) : auctions.length === 0 ? (
          <Card className="py-10 text-center text-ink-soft">{t('console.buyer.noAuctionsRunning')}</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {auctions.map((a) => {
              const mine = bidBySlug.get(a.slug);
              const time = hms(a.auctionEndsAt);
              const ended = !time && a.auctionEndsAt != null;
              const price = a.highestCents ?? a.startBidCents ?? 0;
              return (
                <Card key={a.id} padded={false} className="flex flex-col overflow-hidden">
                  {/* image band */}
                  <div className="relative flex h-24 items-center justify-center" style={{ background: 'linear-gradient(135deg,#0e4632,#146B3A)' }}>
                    <span className="text-4xl opacity-90">{a.emoji ?? '🌾'}</span>
                    <span className="absolute start-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg bg-status-error px-2 py-1 text-[11px] font-bold text-white">
                      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white" />{ended ? t('console.seller.ended') : t('site.liveAuction')}
                    </span>
                    {a.flag && <span className="absolute end-2.5 top-2.5 text-lg">{a.flag}</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="truncate font-display font-bold text-ink">{a.name}</div>
                    <div className="truncate text-xs text-ink-soft">{t('console.buyer.byBidders', { seller: a.seller?.name ?? '', count: a.bidCount })}</div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <div className="text-[11px] text-ink-soft">{a.highestCents != null ? t('auction.currentHighest') : t('console.buyer.startsAt')}</div>
                        <div className="font-numeric text-xl font-extrabold text-brand-dark">{usd(price)}</div>
                        {mine && (
                          <div className="text-[11px] font-semibold text-ink-soft">{t('console.buyer.yourBid', { amount: usd(mine.amountCents) })}</div>
                        )}
                      </div>
                      <div className="rounded-xl border border-status-error/25 bg-status-error/5 px-2.5 py-1.5 text-center">
                        <div className="text-[10px] font-semibold tracking-wide text-status-error">{t('auction.ends')}</div>
                        <div className="font-numeric text-sm font-bold text-status-error">{time ?? t('console.seller.ended')}</div>
                      </div>
                    </div>
                    {a.hasReserve && (
                      <div className="mt-2">
                        <Badge tone={a.reserveMet ? 'green' : 'slate'}>{a.reserveMet ? t('auction.reserveMet') : t('auction.reserveNotMet')}</Badge>
                      </div>
                    )}
                    <Link to={`/product/${a.slug}`} className="mt-3">
                      <Button size="sm" className="w-full" disabled={ended}>
                        {ended ? t('console.buyer.auctionClosed') : mine ? t('console.buyer.raiseBid') : t('console.buyer.placeABid')}
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h3 className="font-display font-bold text-ink">{t('console.buyer.myReverseAuctions')}</h3>
          <span className="text-xs text-ink-soft">{t('console.buyer.sellersBidDown')}</span>
        </div>
        {myAuctions.length === 0 ? (
          <Card className="flex flex-col items-center py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-surface text-brand-dark">
              <Icon name="gavel" size={24} />
            </span>
            <p className="mt-3 text-sm text-ink-soft">{t('console.buyer.noReverseAuctions')}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {myAuctions.map((r) => {
              const ended = r.auctionEndsAt ? new Date(r.auctionEndsAt).getTime() < Date.now() : false;
              return (
                <Card key={r.id} interactive onClick={() => setRoomId(r.id)} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-display font-bold text-ink">{r.title}</div>
                    <div className="text-xs text-ink-soft">
                      #{r.reference} · {r.qtyValue} {r.qtyUnit} · {t('console.buyer.sellerBidsN', { count: r._count?.sellerBids ?? 0 })}
                      {r.auctionEndsAt && ` · ${ended ? t('console.buyer.closed2') : t('console.buyer.closesIn', { time: countdown(r.auctionEndsAt, t('console.seller.ended')) })}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <div className="text-xs text-ink-soft">{t('console.buyer.bestPriceLabel')}</div>
                      <div className="font-display font-extrabold text-ink">
                        {r.bestPriceCents != null ? `${usd(r.bestPriceCents)}/${r.qtyUnit}` : '—'}
                      </div>
                    </div>
                    <Badge tone={r.status === 'awarded' ? 'green' : r.status === 'open' ? 'mango' : 'slate'}>{t(`console.buyer.status.${r.status}`, { defaultValue: r.status })}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
