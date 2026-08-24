import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Icon } from '@agrotraders/ui';
import { convertCents, toUsdAmount } from '@agrotraders/api-client';
import type { ApiAuctionBidRow, ApiAuctionDetail } from '@agrotraders/api-client';
import { toUnit, unitSuffix } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';

const ENDED = 'ENDED';
function countdown(end: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return ENDED;
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/**
 * Open auction panel: the current highest bid, the viewer's standing, a free
 * offer field and a proxy auto-bid toggle. Bids are public — everyone sees the
 * price; only identities are masked.
 *
 * There is no minimum raise. A bidder offers whatever the lot is worth to them,
 * above or below the standing top, and the highest offer takes it at close. The
 * old "+$50 / +$100 / +$250" quick raises and the "min. next" floor are gone
 * with the rule they enforced.
 *
 * One account holds one offer. Bidding again revises it — the book shows a
 * single row per bidder, not a log of every attempt — until the lot closes.
 */
export function BidPanel({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currency, rate, fmtCents } = useCurrency();
  const [amount, setAmount] = useState<string | null>(null); // DISPLAY-currency major units; null = track the current price
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoMax, setAutoMax] = useState('');
  const [error, setError] = useState('');

  const { data: auction } = useQuery<ApiAuctionDetail>({
    queryKey: ['auction', slug],
    queryFn: () => api.auctions.detail(slug),
    refetchInterval: 4000,
  });
  const { data: bids = [] } = useQuery<ApiAuctionBidRow[]>({
    queryKey: ['auction-bids', slug],
    queryFn: () => api.auctions.bids(slug),
    refetchInterval: 4000,
  });

  const time = countdown(auction?.auctionEndsAt ?? null);
  const ended = time === ENDED;
  const isOwner = auction?.isOwner ?? false;
  // The field opens at whatever the lot stands at; the bidder edits it freely.
  const currentCents = auction?.highestCents ?? auction?.startBidCents ?? 0;
  /**
   * Every price on this panel is printed in the viewer's DISPLAY currency, so
   * the offer field has to be quoted there too. It used to hold USD dollars
   * under a converted headline with no marker on it: a bidder reading "₽83,467"
   * and typing it placed an $83,467 bid — ~84x their intent, with no floor and
   * no confirmation to catch it. Converted in, converted back out on submit.
   */
  const inDisplay = (usdCents: number) => String(Math.round(convertCents(usdCents, rate) * 100) / 100);
  // One account, one offer: once you have bid the field opens at YOUR standing
  // offer, because placing again revises it rather than adding a second row.
  const amountText = amount ?? inDisplay(auction?.standing?.yourMaxCents ?? currentCents);
  const value = Number(amountText);
  const usdAmount = toUsdAmount(value, rate); // what the API is given: USD dollars
  // The metric the lot is priced in, so "$8.20" always reads "$8.20/KG".
  const unit = unitSuffix(auction?.unit, t);
  const standing = auction?.standing;
  const autoMaxCents = standing?.autoMaxCents ?? null;

  // Keep the auto-bid toggle in sync with the server's view of my ceiling.
  useEffect(() => {
    if (autoMaxCents != null) { setAutoOpen(true); if (!autoMax) setAutoMax(inDisplay(autoMaxCents)); }
  }, [autoMaxCents]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastRaise = bids.length >= 2 ? bids[0].amountCents - bids[1].amountCents : null;

  const requireBuyer = () => {
    setError('');
    if (!user) { navigate('/login', { state: { from: `/product/${slug}` } }); return false; }
    // Effective roles, not the primary one — a seller granted `buyer` may bid.
    if (!roles.includes('buyer')) { setError(t('site.onlyBuyers')); return false; }
    return true;
  };

  const place = useMutation({
    mutationFn: () => api.auctions.placeBid(slug, usdAmount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction', slug] });
      qc.invalidateQueries({ queryKey: ['auction-bids', slug] });
      setAmount(null);
      setError('');
    },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('site.bidError')),
  });

  const saveAuto = useMutation({
    mutationFn: (clear: boolean) =>
      clear ? api.auctions.clearAutoBid(slug) : api.auctions.setAutoBid(slug, toUsdAmount(Number(autoMax), rate)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction', slug] });
      qc.invalidateQueries({ queryKey: ['auction-bids', slug] });
      setError('');
    },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('site.bidError')),
  });

  const onBid = () => { if (requireBuyer()) place.mutate(); };
  const onToggleAuto = () => {
    if (autoOpen && autoMaxCents != null) { saveAuto.mutate(true); setAutoOpen(false); setAutoMax(''); }
    else setAutoOpen((o) => !o);
  };
  const onSaveAuto = () => { if (requireBuyer() && Number(autoMax) > 0) saveAuto.mutate(false); };

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="p-5">
        {/* current highest + starting */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-ink-soft">{t('auction.currentHighest')}</div>
            <div className="flex items-baseline gap-1">
              <span className="font-numeric text-[2.6rem] font-extrabold leading-none tracking-tight text-brand-dark">
                {auction?.highestCents != null ? fmtCents(auction.highestCents) : fmtCents(auction?.startBidCents ?? 0)}
              </span>
              <span className="text-sm font-bold text-ink-soft">{unit}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {lastRaise ? (
                <span className="rounded-md border border-brand-leaf/60 bg-brand-surface px-2 py-0.5 text-xs font-bold text-status-success">
                  ↑ +{fmtCents(lastRaise)} {t('auction.lastBid')}
                </span>
              ) : null}
              <span className="text-xs text-ink-soft">{t('auction.bidsN', { count: auction?.bidCount ?? 0 })}</span>
            </div>
          </div>
          <div className="text-end">
            <div className="text-xs text-ink-soft">{t('auction.starting')}</div>
            <div className="font-numeric font-bold text-ink">
              {fmtCents(auction?.startBidCents ?? 0)}<span className="text-xs font-normal text-ink-soft">{unit}</span>
            </div>
            <div className="mt-0.5 text-xs text-ink-soft">{ended ? t('site.ended') : time ?? '—'}</div>
          </div>
        </div>

        {/* your standing */}
        {standing && standing.yourRank != null && (
          <div className={'mt-4 flex items-center gap-3 rounded-xl border px-3.5 py-3 ' + (standing.leading ? 'border-brand-leaf/50 bg-brand-surface' : 'border-mango-soft bg-mango-soft/40')}>
            <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-numeric font-bold text-white ' + (standing.leading ? 'bg-brand-dark' : 'bg-gold')}>
              #{standing.yourRank}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">
                {standing.yourMaxCents != null ? t('auction.yourOffer', { amount: fmtCents(standing.yourMaxCents) }) : ''}
              </div>
              <div className="text-xs text-ink-soft">{standing.leading ? t('auction.leading') : t('auction.outbidRaise')}</div>
            </div>
          </div>
        )}

        {isOwner ? (
          <p className="mt-4 rounded-lg bg-brand-surface px-3 py-2 text-xs text-ink-soft">{t('auction.ownerNote')}</p>
        ) : (
          <>
            {/* offer field — any amount, priced per the lot's own metric */}
            <div className="mt-4 text-xs text-ink-soft">
              {t('auction.yourOfferLabel')}{' '}
              <span className="font-semibold text-brand-dark">
                {t('auction.pricePerUnit', { unit: t(`enums:unitShort.${toUnit(auction?.unit)}`) })}
              </span>
            </div>
            <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border-2 border-brand-leaf px-4 shadow-[0_0_0_4px_rgba(83,184,106,0.1)]">
              <input
                type="text"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => {
                  const next = e.target.value;
                  if (/^\d*(?:\.\d{0,2})?$/.test(next)) setAmount(next);
                }}
                disabled={ended}
                aria-label={t('auction.yourOfferLabel')}
                className="h-[52px] w-full flex-1 border-0 text-center font-numeric text-2xl font-bold text-ink outline-none"
              />
              {/* The field is quoted in the display currency — say which one. */}
              <span className="ps-2 font-numeric text-sm font-bold text-ink-soft">{currency}</span>
            </div>

            <Button
              fullWidth
              className="mt-3.5 h-[52px]"
              disabled={place.isPending || ended || !(value > 0)}
              onClick={onBid}
              leftIcon={<Icon name="gavel" size={18} />}
            >
              {ended ? t('site.ended') : t('auction.placeBidAmount', { amount: `${fmtCents(Math.round(usdAmount * 100))}${unit}` })}
            </Button>
            {error && <p className="mt-2 text-xs text-status-error">{error}</p>}

            {/* auto-bid */}
            <div className="mt-3.5 border-t border-surface-border pt-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">{t('auction.autoBid')}</div>
                  <div className="text-xs text-ink-soft">{t('auction.autoBidSub')}</div>
                </div>
                <button
                  role="switch"
                  aria-checked={autoOpen}
                  onClick={onToggleAuto}
                  disabled={ended}
                  className={'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ' + (autoOpen ? 'bg-brand-dark' : 'bg-surface-border')}
                >
                  <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (autoOpen ? 'start-[22px]' : 'start-0.5')} />
                </button>
              </div>
              {autoOpen && (
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={t('auction.maxPlaceholder', { currency })}
                    value={autoMax}
                    onChange={(e) => setAutoMax(e.target.value)}
                    disabled={ended}
                    className="h-10 w-full rounded-lg border border-surface-border px-3 font-numeric text-sm outline-none focus:border-brand-leaf"
                  />
                  <Button variant="outline" size="sm" disabled={saveAuto.isPending || !Number(autoMax)} onClick={onSaveAuto}>
                    {autoMaxCents != null ? t('common:save') : t('auction.setMax')}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
