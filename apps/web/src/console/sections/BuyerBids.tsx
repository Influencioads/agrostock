import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Combobox, Icon, Input } from '@agrotraders/ui';
import { CountrySelect } from '@agrotraders/ui/ProductForm';
import { buildSubcategoryTree, type ApiBuyerBid, type ApiCategory, type SubcategoryNode } from '@agrotraders/api-client';
import { buyerBidTitle, CURRENCIES, CURRENCY_SYMBOLS, PROCURE_WINDOWS, PRODUCT_UNITS, suggestProductName, toUnit } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { errMessage } from './order-parts';
import { AttributeFields, DeliverySelect, GalleryEditor, MarketSelect, MAX_IMAGES, SupplyCountriesSelect } from './ProductForm';
import { BuyerBidRoom } from './BuyerBidRoom';

const selectCls = 'h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf';

// Composed in `@agrotraders/types` so the mobile requirement sheet builds the
// identical title; re-exported here because the section's test imports it.
export { buyerBidTitle };

/**
 * Category → subcategory, and no deeper.
 *
 * A seller drills to the exact leaf because they are describing goods they hold;
 * a buyer is describing goods they WANT, and every subcategory carries its own
 * spec fields — so picking "Almond" already asks for variety, size and
 * processing. The extra "more specific" levels below it only re-asked, in
 * dropdown form, what the detail fields ask properly.
 */
function TaxonomyPicker({
  categories,
  subcategories,
  categoryId,
  subcategoryId,
  onChange,
}: {
  categories: ApiCategory[];
  subcategories: SubcategoryNode[];
  categoryId: string;
  subcategoryId: string;
  onChange: (categoryId: string, subcategoryId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.category')}</span>
        <select className={selectCls} value={categoryId} onChange={(e) => onChange(e.target.value, '')}>
          <option value="">{t('console.buyer.any')}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name} {c.emoji}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.subcategory')}</span>
        <select
          className={selectCls}
          value={subcategoryId}
          disabled={subcategories.length === 0}
          onChange={(e) => onChange(categoryId, e.target.value)}
        >
          <option value="">{t('console.buyer.any')}</option>
          {subcategories.map((n) => <option key={n.id} value={n.id}>{n.name}{n.emoji ? ` ${n.emoji}` : ''}</option>)}
        </select>
      </label>
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

export function buyerBidsLoadState(q: { isPending: boolean; isError: boolean }): 'loading' | 'error' | 'ready' {
  if (q.isError) return 'error';
  return q.isPending ? 'loading' : 'ready';
}

/**
 * Buyer posts ONE thing: what they need. Sellers then underbid each other on it
 * and the buyer awards the cheapest — there is no second "mode" to choose.
 */
function NewBuyerBidPage({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  // Default the quote currency to whatever the buyer is already browsing in.
  const { currency } = useCurrency();
  const [f, setF] = useState({
    qtyValue: '', qtyUnit: 'MT', moq: '', targetPrice: '', targetCurrency: currency, vatExtra: false,
    deliveryPlace: '', destinationCountry: '', origin: '', delivery: 'delivery', marketId: '',
    negotiable: false,
    deadline: '', procureBy: 'immediate', notes: '', categoryId: '', subcategoryId: '',
  });
  const [supplyCountries, setSupplyCountries] = useState<string[]>([]);
  // Same shape a listing stores: field key → canonical English value.
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const { data: subs } = useQuery({
    queryKey: ['category-subtree', f.categoryId],
    queryFn: () => api.categories.subtree(f.categoryId, { depth: 'all' }),
    enabled: Boolean(f.categoryId),
    staleTime: 5 * 60 * 1000,
  });
  // Only the top level: the deeper nodes exist for sellers, and everything they
  // would pin down is asked properly by the spec fields below.
  const subcategories = useMemo(() => buildSubcategoryTree(subs ?? []), [subs]);
  const pickedNode = subcategories.find((n) => n.id === f.subcategoryId);
  // Category + subcategory names — the title's backbone, and the subcategory is
  // what the requirement is FOR (the old "product" field).
  const taxonomy = useMemo(
    () => [categories.find((c) => c.id === f.categoryId)?.name, pickedNode?.name]
      .filter((name): name is string => !!name),
    [categories, f.categoryId, pickedNode],
  );
  const title = buyerBidTitle(taxonomy, f.deliveryPlace, user?.name ? t('console.buyer.titleFor', { name: user.name }) : '');

  // The chosen subcategory's own spec fields — the SAME set a seller fills in on
  // the listing form, so the two sides describe goods identically.
  // Memoised on the node: the prune effect below keys on this, and a fresh `[]`
  // every render would re-run it every render.
  const attrFields = useMemo(() => pickedNode?.attrFields ?? [], [pickedNode]);
  const attrLabel = pickedNode?.name ?? taxonomy[taxonomy.length - 1] ?? null;

  // Re-picking the taxonomy invalidates specs that the new node has no field for
  // (the API trims them too — this is so the buyer SEES what was dropped).
  useEffect(() => {
    const keys = new Set(attrFields.map((a) => a.key));
    const pruned = Object.fromEntries(Object.entries(attributes).filter(([k]) => keys.has(k)));
    if (Object.keys(pruned).length !== Object.keys(attributes).length) setAttributes(pruned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrFields]);

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
        // Sharpened by the specs the buyer picked, exactly as the seller form
        // names a listing ("Basmati 1121 Steam" rather than bare "Basmati").
        productName: suggestProductName(taxonomy[taxonomy.length - 1], attributes) || taxonomy[taxonomy.length - 1] || title,
        qtyValue: Number(f.qtyValue),
        qtyUnit: f.qtyUnit,
        moq: f.moq ? Number(f.moq) : undefined,
        targetPriceCents: f.targetPrice ? Math.round(Number(f.targetPrice) * 100) : undefined,
        targetPriceCurrency: f.targetCurrency,
        vatExtra: f.vatExtra,
        origin: f.origin || undefined,
        delivery: f.delivery || undefined,
        supplyCountries,
        marketId: f.marketId || undefined,
        // Mandatory — the API rejects anything else on a bid.
        safeDeal: true,
        negotiable: f.negotiable,
        deliveryPlace: f.deliveryPlace || undefined,
        destinationCountry: f.destinationCountry || undefined,
        deadline: f.deadline ? new Date(f.deadline).toISOString() : undefined,
        procureBy: f.procureBy || undefined,
        notes: f.notes || undefined,
        categoryId: f.categoryId || undefined,
        subcategoryId: f.subcategoryId || undefined,
        attributes: Object.keys(attributes).length ? attributes : undefined,
        images,
      }),
    onMutate: () => setError(''),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-buyer-bids'] }); onBack(); },
    onError: (e) => setError(errMessage(e, t('console.buyer.postError'))),
  });

  const ready = taxonomy.length > 0 && Number(f.qtyValue) > 0;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-3" onClick={onBack} leftIcon={<Icon name="chevronLeft" size={15} />}>
        {t('common:back')}
      </Button>
      <div className="mb-5">
        <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.buyer.postRequirement')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('console.buyer.bidsSub')}</p>
      </div>
      <Card className="p-4 sm:p-6">
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
          subcategories={subcategories}
          categoryId={f.categoryId}
          subcategoryId={f.subcategoryId}
          onChange={(categoryId, subcategoryId) => setF((p) => ({ ...p, categoryId, subcategoryId }))}
        />

        {/* The subcategory's own spec fields — the same grades, sizes and
            percentages a seller fills in, so a bid is specific enough to price. */}
        <AttributeFields fields={attrFields} label={attrLabel} value={attributes} onChange={setAttributes} />

        <MarketSelect value={f.marketId} onChange={set('marketId')} api={api} label={t('console.buyer.whichMarket')} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.unit')}</span>
            <select value={toUnit(f.qtyUnit)} onChange={(e) => set('qtyUnit')(e.target.value)} className={selectCls}>
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>{t(`enums:unit.${u}`)}</option>
              ))}
            </select>
          </label>
          <Input
            label={`${t('console.buyer.quantity')} (${toUnit(f.qtyUnit)})`}
            type="text"
            inputMode="decimal"
            min={0}
            step="any"
            value={f.qtyValue}
            onChange={(e) => set('qtyValue')(e.target.value)}
          />
          {/* The seller form's MOQ, read from the other side: the smallest lot
              this buyer will take, so a seller who cannot fill the whole
              requirement still knows whether a part-load is worth quoting. */}
          <Input
            label={`${t('console.buyer.minLot')} (${toUnit(f.qtyUnit)})`}
            type="text"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder={t('console.buyer.phMinLot')}
            value={f.moq}
            onChange={(e) => set('moq')(e.target.value)}
          />
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
                type="text"
                inputMode="decimal"
                min={0}
                step="any"
                value={f.targetPrice}
                onChange={(e) => set('targetPrice')(e.target.value)}
                className={selectCls + ' min-w-0'}
              />
            </div>
            {/* Sits with the price because that is the number it qualifies. */}
            <label className="mt-2 flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={f.vatExtra} onChange={(e) => set('vatExtra')(e.target.checked)} className="accent-[#249653]" />
              {t('console.productForm.vatExtra')}
            </label>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.buyer.procureBy')}</span>
            <select value={f.procureBy} onChange={(e) => set('procureBy')(e.target.value)} className={selectCls}>
              {PROCURE_WINDOWS.map((w) => (
                <option key={w} value={w}>{t(`enums:procure.${w}`)}</option>
              ))}
            </select>
          </label>
          {/* Where the buyer wants the goods GROWN — the mirror of the listing's
              origin, and the same picker so both sides match on one country set. */}
          <CountrySelect
            label={t('console.buyer.preferredOrigin')}
            placeholder={t('console.buyer.any')}
            value={f.origin}
            onChange={set('origin')}
          />
          <DeliverySelect value={f.delivery} onChange={set('delivery')} />
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

        {/* The listing's supply-countries chip grid, pointed the other way:
            which origins this buyer will actually accept offers from. */}
        <SupplyCountriesSelect
          value={supplyCountries}
          onChange={setSupplyCountries}
          label={t('console.buyer.acceptFrom')}
          hint={t('console.buyer.acceptFromHint')}
        />

        {/* Settlement is NOT a choice on a bid: every bid settles through Safe
            Deal escrow. The picker that used to sit here is replaced by a
            statement of the rule, so a seller quoting into this requirement
            knows exactly how it settles. The API rejects `safeDeal: false`. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.productForm.dealType')}</span>
            <div className="flex items-center gap-2 rounded-md border border-brand-leaf/40 bg-brand-surface/60 px-3 py-2 text-sm font-semibold text-ink">
              <Icon name="shield" size={15} className="shrink-0 text-brand" />
              {t('console.productForm.dealSafe')}
            </div>
            <p className="mt-1 text-xs text-ink-soft">{t('console.productForm.dealBidLocked')}</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.productForm.priceType')}</span>
            <select value={f.negotiable ? 'negotiable' : 'fixed'} onChange={(e) => set('negotiable')(e.target.value === 'negotiable')} className={selectCls}>
              <option value="fixed">{t('console.productForm.priceFixed')}</option>
              <option value="negotiable">{t('console.productForm.priceNegotiable')}</option>
            </select>
          </label>
        </div>

        {/* Multi-line like the listing's: packing, loading terms, documents —
            a one-line box was too small for what buyers actually specify. */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            {t('console.buyer.notes')}{' '}
            <span className="font-normal text-ink-soft">{t('console.productForm.notesHint')}</span>
          </span>
          <textarea
            rows={3}
            maxLength={800}
            value={f.notes}
            onChange={(e) => set('notes')(e.target.value)}
            placeholder={t('console.buyer.phNotes')}
            className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-leaf"
          />
        </label>

        {/* Buyer's own upload route — the products one is seller-only. */}
        <div>
          <GalleryEditor images={images} onChange={setImages} onError={setError} upload={api.buyerBids.uploadImages} max={MAX_IMAGES} />
          <p className="mt-1.5 text-xs text-ink-soft">{t('console.buyer.photosHint')}</p>
        </div>
        </div>
        <div className="mt-6 flex w-full flex-col-reverse gap-2 border-t border-surface-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {error && <p className="me-auto text-sm font-semibold text-status-error">{error}</p>}
          <Button variant="outline" onClick={onBack}>{t('common:cancel')}</Button>
          <Button disabled={!ready || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? t('console.buyer.posting') : t('console.buyer.postRequirement')}
          </Button>
        </div>
      </Card>
    </div>
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

  const buyerBidsQuery = useQuery<ApiBuyerBid[]>({
    queryKey: ['my-buyer-bids'],
    queryFn: () => api.buyerBids.mine(),
    retry: false,
    refetchInterval: 15000,
  });
  const { data: auctionBids = [] } = useQuery({
    queryKey: ['my-auction-bids'],
    queryFn: () => api.auctions.mine() as Promise<{ id: string; amountCents: number; product?: { name: string; slug?: string; emoji?: string | null; flag?: string | null } }[]>,
    retry: false,
  });
  const buyerBids = buyerBidsQuery.data ?? [];
  const loadState = buyerBidsLoadState(buyerBidsQuery);

  // 1s clock so auction-mode requirement countdowns tick between refetches.
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);

  // The room owns the whole section while it's open — it's a screen, not an overlay.
  if (creating) return <NewBuyerBidPage onBack={() => setCreating(false)} />;
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

      {loadState === 'loading' ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : loadState === 'error' ? (
        <Card className="py-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-error/10 text-status-error">
            <Icon name="refresh" size={24} />
          </div>
          <h3 className="font-display text-lg font-extrabold text-ink">{t('common:errorTitle', { defaultValue: 'Something went wrong' })}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
            {errMessage(buyerBidsQuery.error, t('console.buyer.loadError', { defaultValue: 'Could not load buyer bids. Please try again.' }))}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => buyerBidsQuery.refetch()}>{t('common:retry')}</Button>
        </Card>
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

    </div>
  );
}
