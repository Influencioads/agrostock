import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Combobox, Icon, Input, Modal } from '@agrotraders/ui';
import { CountrySelect } from '@agrotraders/ui/ProductForm';
import { buildSubcategoryTree, type ApiBuyerBid, type ApiCategory, type SubcategoryNode } from '@agrotraders/api-client';
import { CURRENCIES, CURRENCY_SYMBOLS, PROCURE_WINDOWS, PRODUCT_UNITS, toUnit } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { errMessage } from './order-parts';
import { GalleryEditor, MAX_IMAGES } from './ProductForm';
import { BuyerBidRoom } from './BuyerBidRoom';

const selectCls = 'h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf';

/**
 * One options list per drill-down level: the roots, then the children of
 * whatever is picked at each level, stopping at the first level with nothing
 * selected. Exported for the unit test — the drill-down is the fiddly part.
 */
export function levelOptions(tree: SubcategoryNode[], path: string[]): SubcategoryNode[][] {
  const levels: SubcategoryNode[][] = [];
  let nodes = tree;
  for (let i = 0; nodes.length > 0; i++) {
    levels.push(nodes);
    const picked = nodes.find((n) => n.id === path[i]);
    if (!picked) break;
    nodes = picked.children;
  }
  return levels;
}

/**
 * The requirement's title, composed rather than typed: what it is (the whole
 * taxonomy path), where it goes, and who wants it. Buyers wrote titles nobody
 * could search or compare; these three facts are what a seller scans for.
 */
export function buyerBidTitle(taxonomy: string[], city?: string, forWhom?: string): string {
  return [taxonomy.join(' › '), city?.trim(), forWhom?.trim()].filter(Boolean).join(' · ');
}

/**
 * Category → subcategory → … as far as the taxonomy goes, so a requirement is
 * specific enough for a seller to price it. Presentational: the modal owns the
 * queries because it composes the title out of the SAME names.
 */
function TaxonomyPicker({
  categories,
  levels,
  categoryId,
  path,
  onChange,
}: {
  categories: ApiCategory[];
  levels: SubcategoryNode[][];
  categoryId: string;
  path: string[];
  onChange: (categoryId: string, path: string[]) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.category')}</span>
        <select className={selectCls} value={categoryId} onChange={(e) => onChange(e.target.value, [])}>
          <option value="">{t('console.buyer.any')}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name} {c.emoji}</option>)}
        </select>
      </label>
      {levels.map((options, i) => (
        <label className="block" key={i}>
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            {i === 0 ? t('console.buyer.subcategory') : t('console.buyer.narrower')}
          </span>
          <select
            className={selectCls}
            value={path[i] ?? ''}
            // Picking at a level drops everything chosen below it.
            onChange={(e) => onChange(categoryId, e.target.value ? [...path.slice(0, i), e.target.value] : path.slice(0, i))}
          >
            <option value="">{t('console.buyer.any')}</option>
            {options.map((n) => <option key={n.id} value={n.id}>{n.name}{n.emoji ? ` ${n.emoji}` : ''}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}

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

/**
 * Buyer posts ONE thing: what they need. Sellers then underbid each other on it
 * and the buyer awards the cheapest — there is no second "mode" to choose.
 */
function NewBuyerBidModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  // Default the quote currency to whatever the buyer is already browsing in.
  const { currency } = useCurrency();
  const [f, setF] = useState({
    qtyValue: '', qtyUnit: 'MT', targetPrice: '', targetCurrency: currency,
    deliveryPlace: '', destinationCountry: '', deadline: '', procureBy: 'immediate', notes: '', categoryId: '',
  });
  const [path, setPath] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const set = <K extends keyof typeof f>(k: K) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const { data: subs } = useQuery({
    queryKey: ['category-subtree', f.categoryId],
    queryFn: () => api.categories.subtree(f.categoryId, { depth: 'all' }),
    enabled: Boolean(f.categoryId),
    staleTime: 5 * 60 * 1000,
  });
  const levels = useMemo(() => levelOptions(buildSubcategoryTree(subs ?? []), path), [subs, path]);
  // Category name + the name picked at each level — the title's backbone, and
  // the last of them is what the requirement is FOR (the old "product" field).
  const taxonomy = useMemo(
    () =>
      [
        categories.find((c) => c.id === f.categoryId)?.name,
        ...levels.map((options, i) => options.find((n) => n.id === path[i])?.name),
      ].filter((name): name is string => !!name),
    [categories, f.categoryId, levels, path],
  );
  const title = buyerBidTitle(taxonomy, f.deliveryPlace, user?.name ? t('console.buyer.titleFor', { name: user.name }) : '');

  // City suggestions come from the API per destination country, same as the
  // product form — the dataset is far too big to ship in the bundle.
  const { data: cities = [], isFetching: citiesLoading } = useQuery({
    queryKey: ['geo-cities', f.destinationCountry, f.deliveryPlace],
    queryFn: () => api.geo.cities(f.destinationCountry, f.deliveryPlace || undefined),
    enabled: Boolean(f.destinationCountry),
    staleTime: 3600e3,
    retry: 1,
  });

  const create = useMutation({
    mutationFn: () =>
      api.buyerBids.create({
        title,
        // No separate "product" box any more: the leaf of the taxonomy IS the
        // product, and it stays a column because every seller-facing list reads it.
        productName: taxonomy[taxonomy.length - 1] ?? title,
        qtyValue: Number(f.qtyValue),
        qtyUnit: f.qtyUnit,
        targetPriceCents: f.targetPrice ? Math.round(Number(f.targetPrice) * 100) : undefined,
        targetPriceCurrency: f.targetCurrency,
        deliveryPlace: f.deliveryPlace || undefined,
        destinationCountry: f.destinationCountry || undefined,
        deadline: f.deadline ? new Date(f.deadline).toISOString() : undefined,
        procureBy: f.procureBy || undefined,
        notes: f.notes || undefined,
        categoryId: f.categoryId || undefined,
        // The deepest node picked; the API stores it as-is at any level.
        subcategoryId: path[path.length - 1] || undefined,
        images,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-buyer-bids'] }); onClose(); },
    onError: (e) => setError(errMessage(e, t('console.buyer.postError'))),
  });

  const ready = taxonomy.length > 0 && Number(f.qtyValue) > 0;

  return (
    <Modal closeLabel={t('common:close')}
      open
      onClose={onClose}
      title={t('console.buyer.postRequirement')}
      className="max-w-2xl"
      footer={
        // The failure has to sit NEXT to the button. Down in the scrolling body
        // it was below the fold, so a rejected post read as a dead button.
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {error && <p className="me-auto text-sm font-semibold text-status-error">{error}</p>}
          <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
          <Button disabled={!ready || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? t('console.buyer.posting') : t('console.buyer.postRequirement')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-mango-soft px-3 py-2 text-xs text-ink-soft">{t('console.buyer.modeAuction')}</p>

        {/* Read-only: the title is composed below, so every requirement on the
            board reads the same way and stays comparable. */}
        <Input
          label={t('console.buyer.title')}
          placeholder={t('console.buyer.phAutoTitle')}
          value={title}
          readOnly
          hint={t('console.buyer.titleHint')}
        />

        <TaxonomyPicker
          categories={categories}
          levels={levels}
          categoryId={f.categoryId}
          path={path}
          onChange={(categoryId, next) => { setF((p) => ({ ...p, categoryId })); setPath(next); }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t('console.buyer.quantity')} type="number" value={f.qtyValue} onChange={(e) => set('qtyValue')(e.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.unit')}</span>
            <select value={toUnit(f.qtyUnit)} onChange={(e) => set('qtyUnit')(e.target.value)} className={selectCls}>
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>{t(`enums:unit.${u}`)}</option>
              ))}
            </select>
          </label>
          {/* Quote the target in whatever currency the buyer trades in — the API
              converts it to the USD baseline every bid is compared against. */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.targetPrice', { unit: f.qtyUnit })}</span>
            <div className="flex gap-2">
              <select
                value={f.targetCurrency}
                onChange={(e) => set('targetCurrency')(e.target.value)}
                aria-label={t('console.productForm.currency')}
                className={selectCls.replace('w-full', 'w-28') + ' shrink-0'}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="any"
                value={f.targetPrice}
                onChange={(e) => set('targetPrice')(e.target.value)}
                className={selectCls + ' min-w-0'}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.procureBy')}</span>
            <select value={f.procureBy} onChange={(e) => set('procureBy')(e.target.value)} className={selectCls}>
              {PROCURE_WINDOWS.map((w) => (
                <option key={w} value={w}>{t(`enums:procure.${w}`)}</option>
              ))}
            </select>
          </label>
          {/* Country first — cities are fetched per country, so the city resets with it. */}
          <CountrySelect
            label={t('console.buyer.destinationCountry')}
            value={f.destinationCountry}
            onChange={(destinationCountry) => setF((p) => ({ ...p, destinationCountry, deliveryPlace: '' }))}
          />
          <Combobox
            label={t('console.buyer.deliveryPlace')}
            placeholder={t('console.productForm.phCity')}
            value={f.deliveryPlace}
            onChange={set('deliveryPlace')}
            options={cities}
            loading={citiesLoading}
            // The API already filtered by the typed term.
            filterLocally={false}
          />
          <Input label={t('console.buyer.bidDeadline')} type="datetime-local" value={f.deadline} onChange={(e) => set('deadline')(e.target.value)} />
        </div>
        <Input label={t('console.buyer.notes')} placeholder={t('console.buyer.phNotes')} value={f.notes} onChange={(e) => set('notes')(e.target.value)} />

        {/* Buyer's own upload route — the products one is seller-only. */}
        <div>
          <GalleryEditor images={images} onChange={setImages} onError={setError} upload={api.buyerBids.uploadImages} max={MAX_IMAGES} />
          <p className="mt-1.5 text-xs text-ink-soft">{t('console.buyer.photosHint')}</p>
        </div>
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
