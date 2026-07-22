import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiBuyerBid } from '@agrotraders/api-client';
import { api, assetUrl } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';

const ENDED = ' ENDED';
function endsIn(end: string | null) {
  if (!end) return '—';
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return ENDED;
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/**
 * Public buyer-bids board — the reverse-auction mirror of `AuctionsPage`.
 * Buyers post what they need; sellers underbid. Identities stay masked (only the
 * bid count and best price show here); clicking a card opens the bid room.
 */
export function BuyerBidsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fmtCents } = useCurrency();
  const endsLabel = (end: string | null) => { const v = endsIn(end); return v === ENDED ? t('page.auctions.ended') : v; };

  const { data: list = [] } = useQuery<ApiBuyerBid[]>({
    queryKey: ['buyer-bids-page'],
    queryFn: () => api.buyerBids.live(),
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.bids.title')}</h1>
          <p className="mt-1 text-ink-soft">{t('page.bids.sub')}</p>
        </div>
        <Button
          variant="accent"
          leftIcon={<Icon name="file" size={16} />}
          onClick={() => navigate(user ? '/console' : '/login')}
        >
          {t('page.bids.postRequirement')}
        </Button>
      </div>

      <div className="mb-6 rounded-md bg-brand-surface px-4 py-2.5 text-xs text-ink-soft">
        <Icon name="shield" size={13} className="me-1.5 inline text-brand-dark" />
        {t('page.bids.maskedNote')}
      </div>

      {list.length === 0 ? (
        <Card className="py-16 text-center text-ink-soft">{t('page.bids.noBids')}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => {
            const cover = b.images?.[0];
            const bidCount = b._count?.sellerBids ?? 0;
            return (
              <Link key={b.id} to={`/bid/${b.id}`}>
                <Card interactive className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <Badge tone="mango" icon={<span className="h-1.5 w-1.5 rounded-full bg-mango-deep" />}>{t('console.buyer.reverseAuction')}</Badge>
                    <span className="text-xs text-ink-soft">{t('console.buyerBidRoom.sellersN', { count: bidCount })}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-brand-surface text-3xl">
                      {cover ? <img src={assetUrl(cover)} alt="" className="h-full w-full object-cover" /> : b.category?.emoji ?? '🌾'}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-display font-bold text-ink">{b.title}</div>
                      <div className="text-xs text-ink-soft">{b.qtyValue} {b.qtyUnit}{b.deliveryPlace ? ` · ${b.deliveryPlace}` : ''}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-ink-soft">{b.bestPriceCents != null ? t('console.buyer.bestOffer') : t('console.buyer.awaitingBids')}</div>
                      <span className="font-display text-xl font-extrabold text-ink">
                        {b.bestPriceCents != null ? fmtCents(b.bestPriceCents) : '—'}
                      </span>
                    </div>
                    <div className="text-end">
                      <div className="text-xs text-ink-soft">{t('auction.ends')}</div>
                      <span className="font-numeric font-bold text-orange">{endsLabel(b.auctionEndsAt)}</span>
                    </div>
                  </div>
                  <Button variant="accent" fullWidth className="mt-4" leftIcon={<Icon name="file" size={16} />}>
                    {t('page.bids.viewBid')}
                  </Button>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
