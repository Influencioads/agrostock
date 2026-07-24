import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Icon } from '@agrotraders/ui';
import type { Product } from '../../mock/data';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { useWishlist } from '../../lib/useWishlist';
import { unitSuffix } from '@agrotraders/types';

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
  const { t } = useI18n();
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
  const unit = unitSuffix(cardText(p.unit));
  const qty = cardText(p.qty);
  const moq = cardText(p.moq);
  const delivery = cardText(p.delivery);
  const priceProduct = { ...p, name, price: cardText(p.price), unit };
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
          <Badge tone="slate">{grade}</Badge>
          {p.safe && (
            <Badge tone="green" icon={<Icon name="shield" size={11} />}>
              {t('site.safeDeal')}
            </Badge>
          )}
          {rated && (
            <Badge tone="mango" icon={<Icon name="star" size={11} />}>
              {rating}
            </Badge>
          )}
        </div>

        <div className="mt-2 text-xs text-ink-soft">
          {t('site.availableLine', { qty, moq, delivery })}
        </div>

        {/* Wraps: in the homepage's 2-up mobile grid the card is ~171px wide,
            where price + Buy on one line overflows. */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-2 pt-3">
          <div className="min-w-0">
            <span className="font-display text-lg font-extrabold text-ink">{fmtPrice(priceProduct)}</span>
            <span className="text-xs text-ink-soft">{unit}</span>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            leftIcon={<Icon name="bag" size={15} />}
            aria-label={t('site.buyNamed', { name })}
            onClick={() => navigate(`/product/${p.id}`)}
          >
            {t('site.buy')}
          </Button>
        </div>
      </div>
    </div>
  );
}
