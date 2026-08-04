import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import { countryFlag, countryLabel, findCountry, type OrderDelivery } from '@agrotraders/api-client';
import { comparableUnits, convertQty, isDeliveryOption, parseQtyIn, toUnit, unitSuffix } from '@agrotraders/types';
import { api, toCardProduct } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { chatBus } from '../chat/chatBus';
import { AuctionRoom } from '../components/site/AuctionRoom';
import { ProductCard } from '../components/site/ProductCard';
import { ReviewList } from '../console/components/ReviewList';
import { errMessage } from '../console/sections/order-parts';
import { resolveProductLoad } from './productResolution';
import { ErrorState } from '../components/ErrorState';
import { CountrySelect } from '@agrotraders/ui/ProductForm';
import { CityInput } from '../components/GeoInputs';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const thumbs = ['🌾', '📦', '🚢', '📄', '🏭'];

export function ProductPage() {
  const { t, lang } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { fmtPrice } = useCurrency();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(50);
  // The metric the BUYER types in. Empty until they pick one, which means "the
  // listing's own unit" — the API converts, so the price is always per the unit
  // the seller quoted no matter which one is typed here.
  const [qtyUnit, setQtyUnit] = useState('');
  const [notice, setNotice] = useState('');
  // Where the goods are going. Captured here because the order had no destination
  // at all before, which left dispatch and every hire guessing at `buyer.country`.
  // Defaults to the buyer's own registered place, so the common case is one glance.
  const [delivery, setDelivery] = useState<{ city: string; country: string } | null>(null);
  // Street + postcode, typed per order — a buyer's warehouse is not their profile
  // address, so there is nothing to seed this from.
  const [address, setAddress] = useState({ line: '', postcode: '' });
  const [brokenPhotos, setBrokenPhotos] = useState<Set<string>>(() => new Set());

  const markBrokenPhoto = (src: string) => {
    setBrokenPhotos((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  };

  const { data: apiProduct, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.products.get(id!),
    enabled: !!id,
    retry: 0,
  });
  // Prefer the live product; fall back to a mock only when it matches the slug
  // (offline resilience) — never silently show an unrelated product.
  const load = resolveProductLoad(apiProduct ? toCardProduct(apiProduct) : undefined, isLoading, isError);
  const product = load.product;
  // E10: per-product <title> so crawlers/tabs/shares distinguish listings.
  useDocumentTitle(product?.name);

  // Seeds the delivery fields from the buyer's own place — they can change it per
  // order, and the value is what routes the shipment and filters the providers.
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.me.profile(),
    enabled: !!user,
    staleTime: 300e3,
  });
  // The account's own country is often the legacy "🇮🇳 India" display form; the
  // order stores a country and the city lookup is scoped by one, so seed the
  // canonical name rather than a decorated string nothing downstream matches.
  const ownCountry = myProfile?.originCountry ?? user?.country ?? '';
  const deliverTo =
    delivery ?? { city: myProfile?.originCity ?? myProfile?.location ?? '', country: findCountry(ownCountry)?.name ?? ownCountry };

  // Metrics the buyer may type their quantity in: every mass unit for a listing
  // priced by mass, and only its own for one sold by the bag or the piece —
  // there is no honest conversion from a count to a weight.
  const listingUnit = toUnit(product?.unit);
  const unitChoices = comparableUnits(listingUnit);
  const countBased = unitChoices.length === 1;
  const buyerUnit = qtyUnit ? toUnit(qtyUnit) : listingUnit;
  const converted = convertQty(qty, buyerUnit, listingUnit);
  const equivalent =
    buyerUnit !== listingUnit && converted !== undefined ? Math.round(converted * 1000) / 1000 : undefined;
  // The listing's minimum order, restated in the metric the buyer is typing in.
  // The API rejects anything under it, so the field never offers a quantity that
  // cannot be ordered — it used to be printed next to the price and nothing else.
  const minQty = Math.max(
    Math.round((convertQty(parseQtyIn(product?.moq, listingUnit) ?? 0, listingUnit, buyerUnit) ?? 0) * 1000) / 1000,
    countBased ? 1 : 0.01,
  );
  useEffect(() => setQty((q) => Math.max(q, minQty)), [minQty]);

  // Category-specific attributes captured on this listing, rendered by the API:
  // label and value both arrive localized and formatted, because the field
  // definitions live in the DB and this page has no category tree loaded.
  const attrRows = apiProduct?.attributeSpecs ?? [];

  // Related products: same category (and market when known), excluding this one.
  const { data: related = [] } = useQuery({
    queryKey: ['related', product?.category, product?.marketSlug, product?.id],
    queryFn: async () => {
      if (!product) return [];
      const list = (await api.products.list({ category: product.category || undefined })).map(toCardProduct);
      const sameMarket = list.filter((p) => p.id !== product.id && p.marketSlug && p.marketSlug === product.marketSlug);
      const rest = list.filter((p) => p.id !== product.id && !sameMarket.includes(p));
      return [...sameMarket, ...rest].slice(0, 4);
    },
    enabled: load.state === 'ready',
  });

  // When this seller is reachable. Every listing of theirs shows it, because the
  // question "will anyone answer if I message now?" is asked at the listing, not
  // on the profile page a buyer has to go looking for. Cached per seller, so
  // browsing their catalogue costs one request.
  const { data: sellerProfile } = useQuery({
    queryKey: ['public-profile', product?.sellerId],
    queryFn: () => api.directory.profile(product!.sellerId!),
    enabled: !!product?.sellerId,
    staleTime: 300e3,
    retry: 0,
  });
  const sellerHours = sellerProfile?.profile;

  // Live product reviews (keyed by the real product id, not the slug).
  const { data: reviewSummary } = useQuery({
    queryKey: ['reviews', 'product', apiProduct?.id],
    queryFn: () => api.reviews.forProduct(apiProduct!.id),
    enabled: !!apiProduct?.id,
  });

  // Where the goods go — the same shape for a purchase and for an enquiry.
  const destination: OrderDelivery = {
    deliveryCity: deliverTo.city || undefined,
    deliveryCountry: deliverTo.country || undefined,
    deliveryAddress: address.line.trim() || undefined,
    deliveryPostcode: address.postcode.trim() || undefined,
  };

  const place = useMutation({
    mutationFn: () => {
      if (!product) throw new Error('Product is not available');
      return api.orders.place({
        productSlug: product.id,
        qty,
        unit: qtyUnit || undefined,
        ...destination,
      });
    },
    onSuccess: (o) => setNotice(`✓ ${t('page.product.orderPlaced', { ref: (o as { reference: string }).reference })}`),
    // Show WHY it failed — a rejection the buyer can act on (under the minimum
    // order, not enough stock) was flattened into one generic sentence.
    onError: (e) => setNotice(errMessage(e, t('page.product.orderError'))),
  });

  /**
   * WEB-04: "Request Quote" now raises a real enquiry (the seller answers with a
   * price, which the buyer then accepts) instead of being an inert button. Uses
   * the same guards as Buy now.
   */
  const enquire = useMutation({
    mutationFn: () => {
      if (!user) {
        navigate('/login', { state: { from: `/product/${id}` } });
        throw new Error('Sign in required');
      }
      if (!product) throw new Error('Product is not available');
      return api.orders.enquiry({
        productSlug: product.id,
        qty,
        unit: qtyUnit || undefined,
        ...destination,
      });
    },
    onSuccess: (o) => setNotice(`✓ ${t('page.product.quoteRequested', { ref: (o as { reference: string }).reference })}`),
    onError: (e) =>
      setNotice(e instanceof Error && e.message === 'Sign in required' ? '' : errMessage(e, t('page.product.orderError'))),
  });

  const onBuy = () => {
    setNotice('');
    if (!user) return navigate('/login', { state: { from: `/product/${id}` } });
    // Effective roles, not the primary one — a seller granted `buyer` may order.
    if (!roles.includes('buyer')) return setNotice(t('page.product.onlyBuyers'));
    if (!product) return setNotice(t('page.product.orderError'));
    place.mutate();
  };

  if (load.state === 'loading') {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-ink-soft">{t('common:loading')}</div>;
  }

  // F28: a failed fetch offers a retry instead of masquerading as a 404.
  if (load.state === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 lg:px-6">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  if (load.state === 'not-found' || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center lg:px-6">
        <h1 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.product.notFound')}</h1>
        <p className="mt-2 text-ink-soft">{t('page.product.notFoundBody')}</p>
        <Link to="/market" className="mt-4 inline-block font-bold text-brand hover:underline">{t('page.product.browseMarket')}</Link>
      </div>
    );
  }

  // Live auctions get the bespoke bidding room (big countdown, open bid history).
  if (product.auction) return <AuctionRoom slug={id!} product={product} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <nav className="mb-5 flex items-center gap-2 text-sm text-ink-soft">
        <Link to="/" className="hover:text-brand">{t('page.product.home')}</Link> /
        <Link to="/market" className="hover:text-brand">{t('page.product.market')}</Link> /
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        {/* left: gallery + info */}
        <div>
          {/* Real photos when the seller uploaded any; emoji placeholders otherwise. */}
          {(() => {
            const storedPhotos = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
            const photos = storedPhotos.filter((src) => !brokenPhotos.has(src));
            const hasPhotos = photos.length > 0;
            const tiles = hasPhotos ? photos : thumbs;
            const current = Math.min(active, tiles.length - 1);
            return (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[80px_1fr]">
                <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
                  {tiles.map((tile, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      aria-label={`View image ${i + 1}`}
                      className={
                        'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-2xl ' +
                        (i === current ? 'border-brand bg-brand-surface' : 'border-surface-border bg-white')
                      }
                    >
                      {hasPhotos ? (
                        <img
                          src={tile}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={() => markBrokenPhoto(tile)}
                        />
                      ) : tile}
                    </button>
                  ))}
                </div>
                {/* Photos are stored as 1080×1080 squares, so the stage is square too — contain
                    keeps the whole product visible even for non-square legacy/mock images. */}
                <div className="flex aspect-square w-full max-w-[540px] items-center justify-center overflow-hidden rounded-xl bg-brand-surface text-8xl">
                  {hasPhotos ? (
                    <img
                      src={tiles[current]}
                      alt={product.name}
                      width={1080}
                      height={1080}
                      className="h-full w-full object-contain"
                      onError={() => markBrokenPhoto(tiles[current])}
                    />
                  ) : (
                    tiles[current]
                  )}
                </div>
              </div>
            );
          })()}

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              {product.verified && (
                <Badge tone="green" icon={<Icon name="shield" size={11} />}>
                  {t('page.product.verifiedSeller')}
                </Badge>
              )}
              {/* Both states are labelled — see ProductCard. */}
              <Badge tone={product.safe ? 'green' : 'slate'}>{product.safe ? t('site.safeDeal') : t('site.directDeal')}</Badge>
              <Badge tone={product.negotiable ? 'mango' : 'slate'}>
                {product.negotiable ? t('site.negotiable') : t('site.fixedPrice')}
              </Badge>
              {/* F29: only show a rating backed by real reviews — never the
                  cosmetic legacy "4.8" fallback. */}
              {reviewSummary && reviewSummary.count > 0 && (
                <Badge tone="mango" icon={<Icon name="star" size={11} />}>
                  {reviewSummary.avg.toFixed(1)}
                </Badge>
              )}
              {product.offer && <Badge tone="mango">{t('site.offer')}</Badge>}
            </div>
            <h1 className="mt-3 min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{product.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-ink-soft">
              {product.flag} {product.seller} ·{' '}
              {/* Availability is the one thing bold under the name — a buyer
                  scanning the page is looking for how much there is. */}
              <b className="font-bold text-ink">{t('page.product.availLine', { qty: product.qty, moq: product.moq })}</b>
              {product.sellerId && (
                <button
                  onClick={() => chatBus.openCommunityDm(product.sellerId!, product.seller)}
                  className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-dark"
                >
                  <Icon name="message" size={13} /> {t('page.product.chatSeller')}
                </button>
              )}
            </p>
            {/* Sits with the chat button it qualifies: message outside these
                hours and you are waiting until tomorrow. */}
            {sellerHours?.availableFrom && sellerHours?.availableTo && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                <Icon name="clock" size={13} />
                {t('page.product.sellerHours', {
                  from: sellerHours.availableFrom,
                  to: sellerHours.availableTo,
                  tz: sellerHours.timezone ?? '',
                })}
              </p>
            )}
            {product.marketName && (
              <Link
                to={`/market?market=${product.marketSlug}`}
                className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-mango-soft px-3 py-1 text-xs font-bold text-mango-deep hover:brightness-95"
              >
                <Icon name="mapPin" size={12} /> {product.marketName}
              </Link>
            )}
            {(product.city || product.country) && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
                <Icon name="mapPin" size={13} />
                {t('page.product.locatedIn', { location: [product.city, countryLabel(product.country, lang)].filter(Boolean).join(', ') })}
              </p>
            )}
            {product.supplyCountries && product.supplyCountries.length > 0 && (
              <div className="mt-2">
                <span className="text-sm font-semibold text-ink">{t('page.product.suppliesTo')}</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {product.supplyCountries.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-pill bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-dark">
                      {countryFlag(c)} {countryLabel(c, lang)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* real category-specific attributes captured on this listing */}
          {attrRows.length > 0 && (
            <Card className="mt-6">
              <h3 className="font-display text-lg font-bold text-ink">{t('page.product.specifications')}</h3>
              <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                {attrRows.map((r) => (
                  <div key={r.key} className="flex justify-between border-b border-surface-border py-2 text-sm">
                    <dt className="text-ink-soft">{r.label}</dt>
                    <dd className="text-end font-semibold text-ink">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {/* Seller's own remarks. Rendered verbatim (whitespace kept) — it is
              prose they wrote, not a formatted field. */}
          {apiProduct?.notes && (
            <Card className="mt-4">
              <h3 className="font-display text-lg font-bold text-ink">{t('page.product.notes')}</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{apiProduct.notes}</p>
            </Card>
          )}

          {/* No illustrative specs fallback: it rendered invented values (an Indian
              port/certification on every listing) that could not be honestly localized.
              Specs come only from real listing attributes, above. */}

          {/* F29: the invented per-facet "quality score" bars (fixed 92–96%
              demo values shown on every listing) were removed — they implied
              audited quality metrics the platform does not measure. */}

          {/* reviews */}
          <Card className="mt-4">
            <h3 className="font-display text-lg font-bold text-ink">{t('page.product.buyerReviews')}</h3>
            <div className="mt-3">
              {!apiProduct ? (
                <p className="text-sm text-ink-soft">{t('console.reviews.none')}</p>
              ) : reviewSummary ? (
                <ReviewList summary={reviewSummary} />
              ) : (
                <p className="text-sm text-ink-soft">{t('common:loading')}</p>
              )}
            </div>
          </Card>
        </div>

        {/* right: sticky purchase panel */}
        <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
          <Card>
            <div className="flex items-end gap-2">
              <span className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{fmtPrice(product)}</span>
              <span className="text-ink-soft">{unitSuffix(product.unit, t)}</span>
            </div>
            {/* VAT sits directly under the price it qualifies. */}
            {apiProduct?.vatExtra && <p className="mt-1 text-sm font-bold text-ink">{t('page.product.vatExtra')}</p>}
            <p className="mt-1 text-sm text-ink-soft">
              {t('page.product.deliveryLine', {
                delivery: isDeliveryOption(product.delivery) ? t(`enums:delivery.${product.delivery}`) : product.delivery,
              })}
            </p>
            {/* Bold: stock is the one line on this panel a buyer scans for. */}
            <p className="mt-1 text-sm font-bold text-ink">
              {typeof product.stockQty === 'number'
                ? product.stockQty > 0
                  ? t('site.stockCount', { count: product.stockQty, unit: toUnit(product.unit) })
                  : t('site.outOfStock')
                : t('site.inStock')}
            </p>

            {/* Quantity in whatever metric the buyer works in. The price stays
                quoted per the seller's unit, so the equivalent is spelled out
                rather than left for the buyer to do in their head. */}
            <div className="mt-4">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('page.product.quantity')}</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={minQty}
                  step={countBased ? 1 : 'any'}
                  value={qty}
                  onChange={(e) => {
                    const nextQty = Number(e.target.value);
                    setQty(Math.max(minQty, countBased ? Math.trunc(nextQty) : nextQty));
                  }}
                  className="h-10 w-full min-w-0 rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
                />
                <select
                  value={buyerUnit}
                  onChange={(e) => setQtyUnit(e.target.value)}
                  aria-label={t('page.product.quantityUnit')}
                  className="h-10 w-28 shrink-0 rounded-md border border-surface-border px-2 text-sm outline-none focus:border-brand-leaf"
                >
                  {unitChoices.map((u) => (
                    <option key={u} value={u}>{t(`enums:unit.${u}`)}</option>
                  ))}
                </select>
              </div>
              {equivalent !== undefined && (
                <p className="mt-1 text-xs text-ink-soft">
                  {t('page.product.unitEquivalent', {
                    qty: equivalent,
                    unit: t(`enums:unitShort.${listingUnit}`),
                  })}
                </p>
              )}
            </div>

            {/* The order's destination. Everything downstream — dispatch, the hire
                form, the transporter/loader/worker lists — is routed off this. */}
            {/* Base grid-cols-1: two labelled fields side by side are too tight in
                this panel on a phone, and a long locale's label wraps out of it. */}
            {/* Country first, then the city inside it — and both are typeable.
                The country was a native <select>, which only jumps to the letter
                you press: unusable at 200 entries. */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <CountrySelect
                label={t('common:geo.country')}
                value={deliverTo.country}
                placeholder={t('common:geo.anyCountry')}
                // A city belongs to its country, so changing it clears the pick.
                onChange={(country) => setDelivery({ city: '', country })}
              />
              <CityInput
                label={t('site.deliverTo')}
                value={deliverTo.city}
                country={deliverTo.country || null}
                onChange={(city) => setDelivery({ ...deliverTo, city })}
              />
            </div>

            {/* The street. A town name routes a shipment to the right city and
                leaves the driver to find the gate — dispatch needs a line it can
                deliver against. Kept per order: a trader's warehouse changes. */}
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('page.product.deliveryAddress')}</span>
                <input
                  value={address.line}
                  onChange={(e) => setAddress({ ...address, line: e.target.value })}
                  placeholder={t('page.product.deliveryAddressPh')}
                  maxLength={240}
                  className="h-10 w-full min-w-0 rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('page.product.postcode')}</span>
                <input
                  value={address.postcode}
                  onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                  maxLength={24}
                  className="h-10 w-full min-w-0 rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
                />
              </label>
            </div>

            <div className="mt-3 space-y-2">
              <Button fullWidth leftIcon={<Icon name="bag" size={16} />} onClick={onBuy} disabled={place.isPending}>
                {place.isPending ? t('page.product.placing') : t('page.product.buyNow')}
              </Button>
              {notice && (
                <p className={'text-xs ' + (notice.startsWith('✓') ? 'text-status-success' : 'text-status-error')}>{notice}</p>
              )}
              {/* WEB-04: these three CTAs had no onClick at all — prominent dead
                  controls on the transactional panel. Quote raises a real enquiry;
                  the logistics buttons go to the matching directories. */}
              <Button
                fullWidth
                variant="outline"
                disabled={enquire.isPending}
                onClick={() => enquire.mutate()}
              >
                {t('page.product.requestQuote')}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" leftIcon={<Icon name="truck" size={14} />} onClick={() => navigate('/transporters')}>
                  {t('page.product.transport')}
                </Button>
                <Button variant="outline" size="sm" leftIcon={<Icon name="worker" size={14} />} onClick={() => navigate('/loaders')}>
                  {t('page.product.loaders')}
                </Button>
              </div>
            </div>

            {/* Escrow protection is per-listing: promising it on a direct-deal
                listing would be a straight lie to the buyer. */}
            <div className="mt-4 rounded-md bg-brand-surface p-3 text-xs text-ink-soft">
              <div className="flex items-center gap-2 font-bold text-brand-dark">
                <Icon name="shield" size={14} />
                {product.safe ? t('page.product.safeDealProtected') : t('site.directDeal')}
              </div>
              {product.safe ? t('page.product.escrowNote') : t('page.product.directDealNote')}
            </div>
          </Card>
        </aside>
      </div>

      {/* related products */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">{t('page.product.related')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
