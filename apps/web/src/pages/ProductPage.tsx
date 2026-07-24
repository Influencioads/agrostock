import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import { countryFlag } from '@agrotraders/api-client';
import { getAttributeFields, unitSuffix } from '@agrotraders/types';
import { attrKey } from '@agrotraders/i18n';
import { api, toCardProduct } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { chatBus } from '../chat/chatBus';
import { AuctionRoom } from '../components/site/AuctionRoom';
import { ProductCard } from '../components/site/ProductCard';
import { ReviewList } from '../console/components/ReviewList';
import { resolveProductLoad } from './productResolution';
import { ErrorState } from '../components/ErrorState';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const thumbs = ['🌾', '📦', '🚢', '📄', '🏭'];

export function ProductPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fmtPrice } = useCurrency();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(50);
  const [notice, setNotice] = useState('');

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

  // Real category-specific attributes captured on this listing → labelled rows.
  const attrRows = (() => {
    // Schema labels and select/multiselect values are English constants, so they
    // render through the generated `attrs` catalog; free-text values arrive
    // already localized from the API. Unknown text falls back to itself.
    const aLabel = (s: string) => t(`attrs:label.${attrKey(s)}`, { defaultValue: s });
    const aOpt = (s: string) => t(`attrs:option.${attrKey(s)}`, { defaultValue: s });
    const cat = apiProduct?.category && typeof apiProduct.category === 'object' ? (apiProduct.category as { name?: string }).name : undefined;
    const sub = apiProduct?.subcategory && typeof apiProduct.subcategory === 'object' ? (apiProduct.subcategory as { name?: string }).name : undefined;
    const vals = (apiProduct?.attributes ?? {}) as Record<string, unknown>;
    return getAttributeFields(cat, sub)
      .map((f) => {
        const v = vals[f.key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
        const value = Array.isArray(v)
          ? v.map((x) => aOpt(String(x))).join(', ')
          : f.type === 'boolean'
            ? v ? t('common:yes') : t('common:no')
            : f.type === 'select'
              ? aOpt(String(v))
              : f.unit
                ? `${v} ${f.unit}`
                : String(v);
        return { label: aLabel(f.label), value };
      })
      .filter((r): r is { label: string; value: string } => r !== null);
  })();

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

  // Live product reviews (keyed by the real product id, not the slug).
  const { data: reviewSummary } = useQuery({
    queryKey: ['reviews', 'product', apiProduct?.id],
    queryFn: () => api.reviews.forProduct(apiProduct!.id),
    enabled: !!apiProduct?.id,
  });

  const place = useMutation({
    mutationFn: () => {
      if (!product) throw new Error('Product is not available');
      return api.orders.place({ productSlug: product.id, qty });
    },
    onSuccess: (o) => setNotice(`✓ ${t('page.product.orderPlaced', { ref: (o as { reference: string }).reference })}`),
    onError: () => setNotice(t('page.product.orderError')),
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
      return api.orders.enquiry({ productSlug: product.id, qty });
    },
    onSuccess: (o) => setNotice(`✓ ${t('page.product.quoteRequested', { ref: (o as { reference: string }).reference })}`),
    onError: (e) => setNotice(e instanceof Error && e.message === 'Sign in required' ? '' : t('page.product.orderError')),
  });

  const onBuy = () => {
    setNotice('');
    if (!user) return navigate('/login', { state: { from: `/product/${id}` } });
    if (user.role !== 'buyer') return setNotice(t('page.product.onlyBuyers'));
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
            const photos = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
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
                      {hasPhotos ? <img src={tile} alt="" className="h-full w-full object-cover" /> : tile}
                    </button>
                  ))}
                </div>
                <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl bg-brand-surface text-8xl">
                  {hasPhotos ? (
                    <img src={tiles[current]} alt={product.name} className="h-full w-full object-cover" />
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
              {product.safe && <Badge tone="green">{t('site.safeDeal')}</Badge>}
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
              {product.flag} {product.seller} · {t('page.product.availLine', { qty: product.qty, moq: product.moq })}
              {product.sellerId && (
                <button
                  onClick={() => chatBus.openCommunityDm(product.sellerId!, product.seller)}
                  className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-dark"
                >
                  <Icon name="message" size={13} /> {t('page.product.chatSeller')}
                </button>
              )}
            </p>
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
                {t('page.product.locatedIn', { location: [product.city, product.country].filter(Boolean).join(', ') })}
              </p>
            )}
            {product.supplyCountries && product.supplyCountries.length > 0 && (
              <div className="mt-2">
                <span className="text-sm font-semibold text-ink">{t('page.product.suppliesTo')}</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {product.supplyCountries.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-pill bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-dark">
                      {countryFlag(c)} {c}
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
                  <div key={r.label} className="flex justify-between border-b border-surface-border py-2 text-sm">
                    <dt className="text-ink-soft">{r.label}</dt>
                    <dd className="text-end font-semibold text-ink">{r.value}</dd>
                  </div>
                ))}
              </dl>
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
              <span className="text-ink-soft">{unitSuffix(product.unit)}</span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{t('page.product.deliveryLine', { delivery: product.delivery })}</p>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('page.product.quantityMt')}</span>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="h-10 w-full rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
              />
            </label>

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

            <div className="mt-4 rounded-md bg-brand-surface p-3 text-xs text-ink-soft">
              <div className="flex items-center gap-2 font-bold text-brand-dark">
                <Icon name="shield" size={14} /> {t('page.product.safeDealProtected')}
              </div>
              {t('page.product.escrowNote')}
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
