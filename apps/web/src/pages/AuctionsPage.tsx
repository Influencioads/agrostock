import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import { api, assetUrl } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { SafeDealNotice } from '../components/site/SafeDealNotice';

interface LiveAuction {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  imageUrl: string | null;
  flag: string | null;
  seller?: { name: string } | null;
  sellerId?: string | null;
  /** Only present for the auction owner — bids are private. */
  highestCents: number | null;
  startBidCents: number | null;
  bidCount: number;
  auctionEndsAt: string | null;
}

const ENDED = 'ENDED';
function endsIn(end: string | null) {
  if (!end) return '—';
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return ENDED;
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/**
 * Live auction board. Bids are PRIVATE: the public sees the starting bid and
 * bid count; the highest bid is only shown to the auction's owner.
 */
export function AuctionsPage() {
  const { t } = useI18n();
  useDocumentTitle(t('section.auctions'));
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const { fmtCents } = useCurrency();
  const endsLabel = (end: string | null) => { const v = endsIn(end); return v === ENDED ? t('page.auctions.ended') : v; };

  const { data: list = [] } = useQuery<LiveAuction[]>({
    queryKey: ['auctions-page'],
    queryFn: () => api.auctions.list() as Promise<LiveAuction[]>,
    refetchInterval: 5000,
  });

  const isSeller = roles.includes('seller');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('section.auctions')}</h1>
          <p className="mt-1 text-ink-soft">{t('page.auctions.sub')}</p>
        </div>
        <Button
          variant="accent"
          leftIcon={<Icon name="gavel" size={16} />}
          onClick={() => navigate(user ? '/console' : '/login')}
        >
          {isSeller ? t('page.auctions.createAuction') : t('page.auctions.sellByAuction')}
        </Button>
      </div>

      <div className="mb-6 rounded-md bg-brand-surface px-4 py-2.5 text-xs text-ink-soft">
        <Icon name="shield" size={13} className="me-1.5 inline text-brand-dark" />
        {t('page.auctions.sealedNote')}
      </div>

      {/* Escrow is mandatory on every lot listed here, so the notice is part of
          the page rather than something a bidder can dismiss. */}
      <SafeDealNotice className="mb-6" />

      {list.length === 0 ? (
        <Card className="py-16 text-center text-ink-soft">{t('page.auctions.noAuctions')}</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => {
            const mine = a.highestCents != null; // owner view: API only sends it to the owner
            return (
              <Card key={a.id} interactive className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <Badge tone="error" icon={<span className="h-1.5 w-1.5 rounded-full bg-status-error" />}>{t('page.auctions.live')}</Badge>
                  <span className="text-xs text-ink-soft">{t('site.sealedBids', { count: a.bidCount })}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-brand-surface text-3xl">
                    {/* WEB-11: seller uploads are relative /uploads/... paths served
                        from the API origin — without assetUrl they resolved against
                        the web origin and broke. Fall back to the emoji on error. */}
                    {a.imageUrl ? (
                      <img
                        src={assetUrl(a.imageUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      a.emoji ?? '🌾'
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-display font-bold text-ink">{a.name}</div>
                    <div className="text-xs text-ink-soft">{a.flag} {a.seller?.name}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-ink-soft">{mine ? t('page.auctions.highestOwner') : t('page.auctions.startingBid')}</div>
                    <span className="font-display text-xl font-extrabold text-ink">
                      {fmtCents(mine ? a.highestCents : a.startBidCents)}
                    </span>
                  </div>
                  <div className="text-end">
                    <div className="text-xs text-ink-soft">{t('auction.ends')}</div>
                    <span className="font-numeric font-bold text-orange">{endsLabel(a.auctionEndsAt)}</span>
                  </div>
                </div>
                <Link to={`/product/${a.slug}`} className="mt-4">
                  <Button variant="accent" fullWidth leftIcon={<Icon name="gavel" size={16} />}>
                    {mine ? t('page.auctions.viewBids') : t('page.auctions.placeBid')}
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
