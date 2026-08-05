import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { Button, Card, Icon, Input } from '@agrotraders/ui';
import { CountrySelect } from '@agrotraders/ui/ProductForm';
import { findCountry, type ApiProduct, type OrderDelivery } from '@agrotraders/api-client';
import { comparableUnits, convertQty, minOrderQty, toUnit, unitSuffix } from '@agrotraders/types';
import { api, toCardProduct } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCart, type CartLine } from '../cart/CartContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { CityInput } from '../components/GeoInputs';
import { errMessage } from '../console/sections/order-parts';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/** What one line's submission did — kept per line so a partial failure is legible. */
interface LineResult {
  slug: string;
  name: string;
  /** Which seller it went to: the whole point of the split is that it is visible. */
  seller: string;
  reference?: string;
  error?: string;
}

/**
 * Checkout: the one place a purchase is assembled. The listing page sells, this
 * page collects — quantities for every line in the cart plus the single
 * destination they all ship to.
 *
 * There is no multi-line order in the API (an order is one listing from one
 * seller), so submitting posts one request per line and reports each outcome.
 * Lines that succeed leave the cart; lines that failed stay in it to retry.
 */
export function CheckoutPage() {
  const { t } = useI18n();
  // `user` is guaranteed by the route's ProtectedRoute — there is no guest cart.
  const { user, roles } = useAuth();
  const { fmtCents } = useCurrency();
  const { lines, setLine, remove, count } = useCart();
  useDocumentTitle(t('page.checkout.title'));
  // Which button leads. Set by the listing page's Buy now / Request quote, so
  // the buyer lands on the action they clicked; both are always available.
  const intent = (useLocation().state as { intent?: 'buy' | 'quote' } | null)?.intent ?? 'buy';

  const [delivery, setDelivery] = useState<{ city: string; country: string } | null>(null);
  // Every free-text delivery field. Undefined means untouched, which is what
  // lets a field fall back to the profile seed below; typing it empty still wins.
  type Field = 'name' | 'phone' | 'email' | 'market' | 'address' | 'location' | 'postcode';
  const [form, setForm] = useState<Partial<Record<Field, string>>>({});
  const [notice, setNotice] = useState('');
  const [results, setResults] = useState<LineResult[] | null>(null);

  // Prices, stock and MOQ are re-read rather than trusted from storage — the
  // cart persists across sessions, and a stale price must never be checked out.
  const products = useQueries({
    queries: lines.map((l) => ({
      queryKey: ['product', l.slug],
      queryFn: () => api.products.get(l.slug),
      staleTime: 60e3,
      retry: 0,
    })),
  });

  // Seeds the destination from the buyer's own registered place.
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.me.profile(),
    enabled: !!user,
    staleTime: 300e3,
  });
  // The account's own country is often the legacy "🇮🇳 India" display form. Seed
  // the canonical name, and seed NOTHING when it does not resolve ("🇦🇪 UAE" is
  // not a country name in the dataset): the order's country is what routes the
  // shipment and filters every provider list, so an unmatchable string is worse
  // than an empty box the required-field guard makes the buyer fill.
  const deliverTo =
    delivery ?? {
      city: myProfile?.originCity ?? myProfile?.location ?? '',
      country: findCountry(myProfile?.originCountry ?? user?.country)?.name ?? '',
    };

  /**
   * Everything sign-up already asked for, carried straight through: name, email,
   * phone, market — plus city and country above. Only the street has no seed,
   * because registration never asks for one, and it is required below so the
   * buyer fills that gap once instead of the order shipping without it.
   */
  const seed: Partial<Record<Field, string>> = {
    name: user?.name,
    phone: myProfile?.phone ?? undefined,
    email: myProfile?.contactEmail ?? user?.email,
    market: myProfile?.market?.name ?? undefined,
  };
  const value = (key: Field) => form[key] ?? seed[key] ?? '';
  const set = (key: Field) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const trimmed = (key: Field) => value(key).trim() || undefined;

  const destination: OrderDelivery = {
    deliveryCity: deliverTo.city || undefined,
    deliveryCountry: deliverTo.country || undefined,
    deliveryAddress: trimmed('address'),
    deliveryPostcode: trimmed('postcode'),
    deliveryMarket: trimmed('market'),
    deliveryLocation: trimmed('location'),
    deliveryName: trimmed('name'),
    deliveryPhone: trimmed('phone'),
    deliveryEmail: trimmed('email'),
  };

  /** A cart line joined with the product it points at (undefined while loading). */
  const rows = lines.map((line, i) => ({ line, product: products[i]?.data as ApiProduct | undefined }));
  const loading = products.some((r) => r.isLoading);
  // Only lines whose listing actually resolved can be ordered; a delisted one is
  // shown with a remove button instead of being silently dropped.
  const orderable = rows.filter((r) => r.product);

  /**
   * Grouped by seller, because that is how the goods actually move: each seller
   * gets their own order, ships from their own yard and is paid separately, and
   * only ever sees their own lines. The buyer sees the same split here rather
   * than one undifferentiated list that hides how many shipments they just
   * committed to.
   */
  const sellers = orderable.reduce<{ id: string; name: string; rows: typeof orderable }[]>((groups, row) => {
    const id = row.product!.seller?.id ?? row.product!.seller?.name ?? 'unknown';
    const group = groups.find((g) => g.id === id);
    if (group) group.rows.push(row);
    else groups.push({ id, name: row.product!.seller?.name ?? t('page.checkout.unknownSeller'), rows: [row] });
    return groups;
  }, []);

  /** Estimated value in USD cents — null as soon as one line can't be priced. */
  const sum = (of: typeof orderable) =>
    of.reduce<number | null>((acc, { line, product }) => {
      if (acc === null || product?.priceCents == null) return null;
      const listingUnit = toUnit(product.unit);
      const inListingUnit = convertQty(line.qty, line.unit ? toUnit(line.unit) : listingUnit, listingUnit);
      return inListingUnit === undefined ? null : acc + product.priceCents * inListingUnit;
    }, 0);
  const total = sum(orderable);

  /**
   * Everything the carrier and the seller cannot do without. The account already
   * holds most of it from sign-up, so these are only ever empty when sign-up
   * never captured them (nobody registers a warehouse street) — and then they
   * have to be filled here, before anything is sent.
   */
  const REQUIRED: Field[] = ['name', 'phone', 'email', 'address'];
  const missing = new Set<Field | 'city' | 'country'>([
    ...REQUIRED.filter((k) => !trimmed(k)),
    ...(deliverTo.city ? [] : (['city'] as const)),
    ...(deliverTo.country ? [] : (['country'] as const)),
  ]);
  /** Set on the first submit attempt, so the form only turns red once asked. */
  const [showErrors, setShowErrors] = useState(false);
  const required = t('page.checkout.required');
  const errorOn = (key: Field | 'city' | 'country') => (showErrors && missing.has(key) ? required : undefined);

  const submit = useMutation({
    mutationFn: async (kind: 'buy' | 'quote') => {
      const out: LineResult[] = [];
      // Walked seller by seller, so every request carries only that seller's
      // line: each of them gets their own order, their own reference and their
      // own notification, and never sees what the buyer bought elsewhere.
      for (const group of sellers) {
        for (const { line, product } of group.rows) {
          const body = { productSlug: line.slug, qty: line.qty, unit: line.unit || undefined, ...destination };
          const base = { slug: line.slug, name: product!.name, seller: group.name };
          try {
            const order = kind === 'buy' ? await api.orders.place(body) : await api.orders.enquiry(body);
            out.push({ ...base, reference: order.reference });
          } catch (e) {
            // Per line: one seller rejecting on stock must not hide the four that
            // went through, which is what a single thrown error did.
            out.push({ ...base, error: errMessage(e, t('page.product.orderError')) });
          }
        }
      }
      return out;
    },
    onSuccess: (out) => {
      out.filter((r) => r.reference).forEach((r) => remove(r.slug));
      setResults(out);
    },
  });

  const start = (kind: 'buy' | 'quote') => {
    setNotice('');
    setResults(null);
    setShowErrors(true);
    // Effective roles, not the primary one — a seller granted `buyer` may order.
    if (!roles.includes('buyer')) return setNotice(t('page.product.onlyBuyers'));
    if (missing.size > 0) return setNotice(t('page.checkout.needDestination'));
    submit.mutate(kind);
  };

  if (count === 0 && !results) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center lg:px-6">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.checkout.emptyTitle')}</h1>
        <p className="mt-2 text-ink-soft">{t('page.checkout.emptyBody')}</p>
        <Link to="/market" className="mt-4 inline-block font-bold text-brand hover:underline">{t('page.product.browseMarket')}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <nav className="mb-5 flex items-center gap-2 text-sm text-ink-soft">
        <Link to="/" className="hover:text-brand">{t('page.product.home')}</Link> /
        <Link to="/market" className="hover:text-brand">{t('page.product.market')}</Link> /
        <span className="text-ink">{t('page.checkout.title')}</span>
      </nav>
      <h1 className="mb-5 font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.checkout.title')}</h1>

      {/* What each line did. Shown above everything: after a submit this is the
          only thing the buyer is looking for. */}
      {results && (
        <Card className="mb-5">
          <ul className="space-y-1.5 text-sm">
            {results.map((r) => (
              <li key={r.slug} className={r.reference ? 'text-status-success' : 'text-status-error'}>
                <b className="text-ink">{r.name}</b> <span className="text-ink-soft">({r.seller})</span>{' — '}
                {r.reference
                  ? submit.variables === 'quote'
                    ? t('page.product.quoteRequested', { ref: r.reference })
                    : t('page.product.orderPlaced', { ref: r.reference })
                  : r.error}
              </li>
            ))}
          </ul>
          {results.some((r) => r.reference) && (
            <Link to="/console/orders" className="mt-3 inline-block font-bold text-brand hover:underline">
              {t('page.checkout.viewOrders')}
            </Link>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-4">
          {/* Items, one card per seller — each card is one order, shipped and
              invoiced on its own. */}
          {loading && (
            <Card>
              <p className="text-sm text-ink-soft">{t('common:loading')}</p>
            </Card>
          )}
          {sellers.map((group) => (
            <Card key={group.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="min-w-0 break-words font-display text-lg font-bold text-ink">
                  <Icon name="shield" size={14} /> {group.name}
                </h2>
                <span className="text-sm text-ink-soft">
                  {t('page.checkout.items', { count: group.rows.length })}
                  {sum(group.rows) !== null && ` · ${fmtCents(sum(group.rows))}`}
                </span>
              </div>
              <ul className="mt-3 divide-y divide-surface-border">
                {group.rows.map(({ line, product }) => (
                  <li key={line.slug} className="py-4 first:pt-0">
                    <CheckoutLine line={line} product={product!} onChange={setLine} onRemove={remove} />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {/* Lines whose listing no longer resolves: shown so they can be
              removed rather than silently dropped from the order. */}
          {!loading && rows.some((r) => !r.product) && (
            <Card>
              <ul className="space-y-2 text-sm text-ink-soft">
                {rows
                  .filter((r) => !r.product)
                  .map(({ line }) => (
                    <li key={line.slug} className="flex items-center justify-between gap-3">
                      <span>{t('page.checkout.unavailable')}</span>
                      <button onClick={() => remove(line.slug)} className="font-bold text-status-error hover:underline">
                        {t('page.checkout.remove')}
                      </button>
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          {/* The destination every line ships to. Everything downstream —
              dispatch, the hire form, the transporter/loader/worker lists — is
              routed off this, which is why it is here. */}
          <Card>
            <h2 className="font-display text-lg font-bold text-ink">{t('page.checkout.contactHeading')}</h2>
            {/* Who signs for the goods. The account is the trading company; the
                person at the gate is someone else, and dispatch had no way to
                reach them. Base grid-cols-1 — three labelled fields never fit a
                phone, least of all in a long locale. */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label={t('page.checkout.contactName')}
                value={value('name')}
                onChange={(e) => set('name')(e.target.value)}
                error={errorOn('name')}
                maxLength={120}
              />
              <Input
                label={t('page.checkout.contactPhone')}
                type="tel"
                value={value('phone')}
                onChange={(e) => set('phone')(e.target.value)}
                error={errorOn('phone')}
                maxLength={40}
              />
              <Input
                label={t('page.checkout.contactEmail')}
                type="email"
                value={value('email')}
                onChange={(e) => set('email')(e.target.value)}
                error={errorOn('email')}
                maxLength={160}
              />
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-bold text-ink">{t('page.checkout.deliveryHeading')}</h2>
            {/* Widest-last, the way an address is written: the market and street
                get the truck to the gate, the city and country route it there. */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label={t('page.checkout.market')}
                value={value('market')}
                onChange={(e) => set('market')(e.target.value)}
                placeholder={t('page.checkout.marketPh')}
                maxLength={160}
              />
              <Input
                label={t('page.product.deliveryAddress')}
                value={value('address')}
                onChange={(e) => set('address')(e.target.value)}
                placeholder={t('page.product.deliveryAddressPh')}
                error={errorOn('address')}
                maxLength={240}
              />
              <Input
                label={t('page.checkout.location')}
                value={value('location')}
                onChange={(e) => set('location')(e.target.value)}
                placeholder={t('page.checkout.locationPh')}
                maxLength={160}
              />
              <CityInput
                label={t('site.deliverTo')}
                value={deliverTo.city}
                country={deliverTo.country || null}
                error={errorOn('city')}
                onChange={(city) => setDelivery({ ...deliverTo, city })}
              />
              <CountrySelect
                label={t('common:geo.country')}
                value={deliverTo.country}
                placeholder={t('common:geo.anyCountry')}
                error={errorOn('country')}
                // A city belongs to its country, so changing it clears the pick.
                onChange={(country) => setDelivery({ city: '', country })}
              />
              <Input label={t('page.product.postcode')} value={value('postcode')} onChange={(e) => set('postcode')(e.target.value)} maxLength={24} />
            </div>
          </Card>
        </div>

        {/* summary + actions */}
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <Card>
            <h2 className="font-display text-lg font-bold text-ink">{t('page.checkout.summary')}</h2>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-soft">{t('page.checkout.estTotal')}</span>
              <span className="font-display text-xl font-extrabold text-ink">{total === null ? '—' : fmtCents(total)}</span>
            </div>
            {/* How the cart splits: one order per listing, grouped by seller. */}
            <p className="mt-1 text-sm font-semibold text-ink">
              {t('page.checkout.splitLine', { orders: orderable.length, sellers: sellers.length })}
            </p>
            <p className="mt-1 text-xs text-ink-soft">{t('page.checkout.estNote')}</p>

            {/* Buy places the order at the listed price; quote raises an enquiry
                the seller answers with a price the buyer then accepts. */}
            <div className="mt-4 space-y-2">
              {(intent === 'quote' ? (['quote', 'buy'] as const) : (['buy', 'quote'] as const)).map((kind, i) => (
                <Button
                  key={kind}
                  fullWidth
                  variant={i === 0 ? 'primary' : 'outline'}
                  leftIcon={kind === 'buy' ? <Icon name="bag" size={16} /> : undefined}
                  disabled={submit.isPending || orderable.length === 0}
                  onClick={() => start(kind)}
                >
                  {submit.isPending && submit.variables === kind
                    ? t('page.product.placing')
                    : kind === 'buy'
                      ? t('page.checkout.placeOrders')
                      : t('page.product.requestQuote')}
                </Button>
              ))}
              {notice && <p className="text-xs text-status-error">{notice}</p>}
            </div>

            <div className="mt-4 rounded-md bg-brand-surface p-3 text-xs text-ink-soft">
              <div className="flex items-center gap-2 font-bold text-brand-dark">
                <Icon name="shield" size={14} />
                {t('page.product.safeDealProtected')}
              </div>
              {t('page.checkout.perSellerNote')}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** One cart line: what it is, how much of it, and in which metric. */
function CheckoutLine({
  line,
  product,
  onChange,
  onRemove,
}: {
  line: CartLine;
  product: ApiProduct;
  onChange: (slug: string, patch: Partial<CartLine>) => void;
  onRemove: (slug: string) => void;
}) {
  const { t } = useI18n();
  const { fmtPrice } = useCurrency();
  const card = toCardProduct(product);

  // Metrics the buyer may type their quantity in: every mass unit for a listing
  // priced by mass, and only its own for one sold by the bag or the piece.
  const listingUnit = toUnit(product.unit);
  const unitChoices = comparableUnits(listingUnit);
  const countBased = unitChoices.length === 1;
  const buyerUnit = line.unit ? toUnit(line.unit) : listingUnit;
  const min = minOrderQty(product.moq, listingUnit, buyerUnit);
  const converted = convertQty(line.qty, buyerUnit, listingUnit);
  const equivalent = buyerUnit !== listingUnit && converted !== undefined ? Math.round(converted * 1000) / 1000 : undefined;
  const [draft, setDraft] = useState(String(line.qty));

  return (
    <div className="flex flex-wrap items-start gap-3">
      <Link to={`/product/${card.id}`} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-surface text-3xl">
        {card.imageUrl ? <img src={card.imageUrl} alt="" className="h-full w-full object-cover" /> : card.emoji}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/product/${card.id}`} className="block min-w-0 break-words font-display font-bold text-ink hover:text-brand">
          {card.name}
        </Link>
        <p className="text-sm text-ink-soft">
          {card.flag} {card.seller} · {fmtPrice(card)}{unitSuffix(product.unit, t)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Typed freely and clamped to the listing's minimum on blur —
              clamping on every keystroke makes "500" impossible to type when
              the MOQ is 15. */}
          <input
            type="text"
            inputMode="decimal"
            aria-label={t('page.product.quantity')}
            min={min}
            step={countBased ? 1 : 'any'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const typed = Number(draft) || 0;
              const next = Math.max(min, countBased ? Math.trunc(typed) : typed);
              setDraft(String(next));
              onChange(line.slug, { qty: next });
            }}
            className="h-10 w-24 rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
          />
          <select
            value={buyerUnit}
            aria-label={t('page.product.quantityUnit')}
            // Switching metric restates the quantity rather than keeping the
            // number: 50 MT means 50,000 KG, not 50 KG (which is under every
            // MOQ this listing has and would just be rejected on submit).
            onChange={(e) => {
              const unit = toUnit(e.target.value);
              const restated = convertQty(line.qty, buyerUnit, unit) ?? line.qty;
              const qty = Math.max(minOrderQty(product.moq, listingUnit, unit), Math.round(restated * 1000) / 1000);
              setDraft(String(qty));
              onChange(line.slug, { unit, qty });
            }}
            className="h-10 w-28 shrink-0 rounded-md border border-surface-border px-2 text-sm outline-none focus:border-brand-leaf"
          >
            {unitChoices.map((u) => (
              <option key={u} value={u}>{t(`enums:unit.${u}`)}</option>
            ))}
          </select>
          <button onClick={() => onRemove(line.slug)} className="text-sm font-bold text-ink-soft hover:text-status-error">
            {t('page.checkout.remove')}
          </button>
        </div>
        {equivalent !== undefined && (
          <p className="mt-1 text-xs text-ink-soft">
            {t('page.product.unitEquivalent', { qty: equivalent, unit: t(`enums:unitShort.${listingUnit}`) })}
          </p>
        )}
      </div>
    </div>
  );
}
