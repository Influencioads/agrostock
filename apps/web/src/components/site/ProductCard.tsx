import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Icon } from '@agrotraders/ui';
import type { Product } from '../../mock/data';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { useWishlist } from '../../lib/useWishlist';
import { chatBus } from '../../chat/chatBus';
import { countryFlag, countryLabel } from '@agrotraders/api-client';
import { isDeliveryOption, toUnit, unitSuffix } from '@agrotraders/types';

const cardText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : fallback;
  }
  return fallback;
};

export function ProductCard({ p }: { p: Product }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { fmtPrice } = useCurrency();
  // F02: the heart is a real wishlist toggle; the Buy button navigates to the
  // product page. Both are separated from the card's image/title links so we
  // never nest interactive controls inside an anchor.
  const { canSave, isSaved, toggle } = useWishlist();
  const saved = p.productId ? isSaved(p.productId) : false;
  const onToggleSave = () => {
    if (!p.productId) return;
    if (!canSave) {
      navigate('/login');
      return;
    }
    toggle(p.productId);
  };
  const name = cardText(p.name, 'Product');
  const flag = cardText(p.flag);
  const seller = cardText(p.seller);
  const emoji = cardText(p.emoji, '🌾');
  const grade = cardText(p.grade);
  // F29: only show a star rating backed by real reviews. An unrated listing
  // (ratingCount 0/undefined) shows nothing rather than the cosmetic "4.8"
  // default the legacy `rating` string carries.
  const rated = (p.ratingCount ?? 0) > 0;
  const rating = rated ? (p.ratingAvg ?? 0).toFixed(1) : '';
  const unit = unitSuffix(cardText(p.unit), t);
  const qty = cardText(p.qty);
  const moq = cardText(p.moq);
  const rawDelivery = cardText(p.delivery);
  // Structured listings carry a `DELIVERY_OPTIONS` id; legacy ones free text.
  const delivery = isDeliveryOption(rawDelivery) ? t(`enums:delivery.${rawDelivery}`) : rawDelivery;
  const priceProduct = { ...p, name, price: cardText(p.price), unit };

  const location = [p.city, countryLabel(p.country, lang)].filter(Boolean).join(', ');
  // Managed inventory: a number is the real on-hand count, null/undefined means
  // the seller does not track stock (so we say "in stock", never "0").
  const stockLabel =
    typeof p.stockQty === 'number'
      ? p.stockQty > 0
        // Canonical, or a legacy row would read "12 /MT in stock".
        ? t('site.stockCount', { count: p.stockQty, unit: toUnit(cardText(p.unit)) })
        : t('site.outOfStock')
      : t('site.inStock');

  // "Product details": the first few category-specific specs the seller filled
  // in. The API renders these — label, unit and locale included — because a card
  // has no category tree to resolve the field definitions from.
  // A `false` answer is dropped: the card is a highlights strip, and "No" is not
  // a highlight (the product page still shows it).
  const details = (p.attributeSpecs ?? [])
    .filter((spec) => p.attributes?.[spec.key] !== false)
    .slice(0, 3)
    .map((spec) => spec.value);
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-surface-border bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(11,61,46,0.12)]">
      <Link to={`/product/${p.id}`} className="relative flex h-36 items-center justify-center overflow-hidden bg-brand-surface text-5xl">
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
              el.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span className={p.imageUrl ? 'hidden' : ''}>{emoji}</span>
        <div className="absolute start-2 top-2 flex flex-col gap-1">
          {/* F30: paid placements must be disclosed to the buyer. */}
          {p.sponsored && <Badge tone="slate">{t('site.sponsored')}</Badge>}
          {p.offer && <Badge tone="mango">{t('site.offer')}</Badge>}
          {p.auction && <Badge tone="info">{t('site.auction')}</Badge>}
        </div>
      </Link>
      {/* F02: real save control, a sibling of the link (never nested in it). */}
      {p.productId && (
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? t('site.removeFromSaved') : t('site.addToSaved')}
          title={saved ? t('site.removeFromSaved') : t('site.addToSaved')}
          className={
            'absolute end-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 transition hover:text-status-error ' +
            (saved ? 'text-status-error' : 'text-ink-soft')
          }
        >
          <Icon name="heart" size={15} className={saved ? 'fill-current' : ''} />
        </button>
      )}

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span>{flag}</span>
          <span className="truncate">{seller}</span>
          {p.verified && <Icon name="shield" size={13} className="text-brand" />}
        </div>
        <Link to={`/product/${p.id}`} className="mt-1 line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink hover:text-brand">
          {name}
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {grade && <Badge tone="slate">{grade}</Badge>}
          {/* Both sides of the deal/price choice are labelled — the absence of a
              "Safe Deal" badge used to be the only signal a listing was direct. */}
          <Badge tone={p.safe ? 'green' : 'slate'} icon={p.safe ? <Icon name="shield" size={11} /> : undefined}>
            {p.safe ? t('site.safeDeal') : t('site.directDeal')}
          </Badge>
          <Badge tone={p.negotiable ? 'mango' : 'slate'}>
            {p.negotiable ? t('site.negotiable') : t('site.fixedPrice')}
          </Badge>
          {rated && (
            <Badge tone="mango" icon={<Icon name="star" size={11} />}>
              {rating}
            </Badge>
          )}
        </div>

        {details.length > 0 && (
          <div className="mt-2 truncate text-xs text-ink-soft" title={details.join(' · ')}>
            {details.join(' · ')}
          </div>
        )}

        <div className="mt-2 space-y-0.5 text-xs text-ink-soft">
          {location && (
            <div className="flex items-center gap-1 truncate">
              <Icon name="mapPin" size={12} className="shrink-0" />
              <span className="truncate">{countryFlag(p.country)} {location}</span>
            </div>
          )}
          {p.marketName && (
            <div className="truncate" title={p.marketName}>🏪 {p.marketName}</div>
          )}
          {/* Availability is the only bold line under the name — it is what a
              buyer scanning a grid of cards is actually comparing. */}
          <div className="font-normal text-ink">{stockLabel}</div>
          <div className="truncate">{t('site.availableLine', { qty, moq, delivery })}</div>
        </div>

        {/* Wraps: in the homepage's 2-up mobile grid the card is ~171px wide,
            where price + Buy on one line overflows. */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-2 pt-3">
          <div className="min-w-0">
            <span className="font-display text-lg font-extrabold text-ink">{fmtPrice(priceProduct)}</span>
            <span className="text-xs text-ink-soft">{unit}</span>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {/* Two CTAs: buy the listing, or talk to the seller first. The chat
                needs a real seller id, so mock/offline cards only get Buy. */}
            {p.sellerId && (
              <Button
                size="sm"
                variant="outline"
                aria-label={t('site.chatNamed', { name: seller })}
                title={t('site.chatSeller')}
                onClick={() => chatBus.openCommunityDm(p.sellerId!, seller)}
              >
                <Icon name="message" size={15} />
              </Button>
            )}
            <Button
              size="sm"
              leftIcon={<Icon name="bag" size={15} />}
              aria-label={t('site.buyNamed', { name })}
              onClick={() => navigate(`/product/${p.id}`)}
            >
              {t('site.buy')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
