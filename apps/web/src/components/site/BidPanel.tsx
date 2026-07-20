import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiAuctionBidRow, ApiAuctionDetail } from '@agrotraders/api-client';
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
 * Open ascending auction panel: the current highest bid, the viewer's standing,
 * a min-increment stepper with quick raises, and a proxy auto-bid toggle. Bids
 * are public now — everyone sees the price; only identities are masked.
 */
export function BidPanel({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { fmtCents } = useCurrency();
  const [amount, setAmount] = useState<number | null>(null); // dollars; null = track min
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
  const increment = (auction?.bidIncrementCents ?? 0) / 100;
  const minNext = (auction?.minNextCents ?? 0) / 100;
  const value = amount ?? minNext;
  const standing = auction?.standing;
  const autoMaxCents = standing?.autoMaxCents ?? null;

  // Keep the auto-bid toggle in sync with the server's view of my ceiling.
  useEffect(() => {
    if (autoMaxCents != null) { setAutoOpen(true); if (!autoMax) setAutoMax(String(autoMaxCents / 100)); }
  }, [autoMaxCents]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastRaise = bids.length >= 2 ? bids[0].amountCents - bids[1].amountCents : null;

  const requireBuyer = () => {
    setError('');
    if (!user) { navigate('/login', { state: { from: `/product/${slug}` } }); return false; }
    if (user.role !== 'buyer') { setError(t('site.onlyBuyers')); return false; }
    return true;
  };

  const place = useMutation({
    mutationFn: () => api.auctions.placeBid(slug, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction', slug] });
      qc.invalidateQueries({ queryKey: ['auction-bids', slug] });
      setAmount(null);
      setError('');
    },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('site.bidError')),
  });

  const saveAuto = useMutation({
    mutationFn: (clear: boolean) => (clear ? api.auctions.clearAutoBid(slug) : api.auctions.setAutoBid(slug, Number(autoMax))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction', slug] });
      qc.invalidateQueries({ queryKey: ['auction-bids', slug] });
      setError('');
    },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('site.bidError')),
  });

  const step = (dir: 1 | -1) => setAmount(Math.max(minNext, Math.round((value + dir * (increment || 1)) * 100) / 100));
  const onBid = () => { if (requireBuyer()) place.mutate(); };
  const onToggleAuto = () => {
    if (autoOpen && autoMaxCents != null) { saveAuto.mutate(true); setAutoOpen(false); setAutoMax(''); }
    else setAutoOpen((o) => !o);
  };
  const onSaveAuto = () => { if (requireBuyer() && Number(autoMax) > 0) saveAuto.mutate(false); };

  const fmtUsd = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="p-5">
        {/* current highest + starting */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-ink-soft">{t('auction.currentHighest')}</div>
            <div className="font-numeric text-[2.6rem] font-extrabold leading-none tracking-tight text-brand-dark">
              {auction?.highestCents != null ? fmtCents(auction.highestCents) : fmtCents(auction?.startBidCents ?? 0)}
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
            <div className="font-numeric font-bold text-ink">{fmtCents(auction?.startBidCents ?? 0)}</div>
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
            {/* offer stepper */}
            <div className="mt-4 text-xs text-ink-soft">
              {t('auction.yourOfferLabel')} <span className="font-semibold text-brand-dark">{t('auction.minNext', { amount: fmtUsd(minNext) })}</span>
            </div>
            <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border-2 border-brand-leaf shadow-[0_0_0_4px_rgba(83,184,106,0.1)]">
              <button aria-label={t('auction.decrease')} onClick={() => step(-1)} disabled={ended} className="h-[52px] w-12 shrink-0 text-2xl text-brand-dark hover:bg-brand-surface disabled:opacity-40">−</button>
              <input
                type="number"
                value={value}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                disabled={ended}
                className="w-full flex-1 border-0 text-center font-numeric text-2xl font-bold text-ink outline-none"
              />
              <button aria-label={t('auction.increase')} onClick={() => step(1)} disabled={ended} className="h-[52px] w-12 shrink-0 text-2xl text-brand-dark hover:bg-brand-surface disabled:opacity-40">+</button>
            </div>

            {/* quick raises */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 5].map((mult) => {
                const total = minNext + increment * (mult - 1);
                return (
                  <button
                    key={mult}
                    onClick={() => setAmount(total)}
                    disabled={ended}
                    className="rounded-lg border border-surface-border bg-white py-1.5 text-center hover:border-brand-leaf disabled:opacity-40"
                  >
                    <div className="font-numeric text-xs font-bold text-brand-dark">+{fmtUsd(increment * mult)}</div>
                    <div className="text-[10px] text-ink-soft">{fmtUsd(total)}</div>
                  </button>
                );
              })}
            </div>

            <Button
              fullWidth
              className="mt-3.5 h-[52px]"
              disabled={place.isPending || ended || value < minNext}
              onClick={onBid}
              leftIcon={<Icon name="gavel" size={18} />}
            >
              {ended ? t('site.ended') : t('auction.placeBidAmount', { amount: fmtUsd(value) })}
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
                    type="number"
                    placeholder={t('auction.maxPlaceholder')}
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
