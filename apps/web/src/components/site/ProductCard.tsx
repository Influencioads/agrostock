import { Link } from 'react-router-dom';
import { Badge, Button, Icon } from '@agrotraders/ui';
import { socialProof } from '@agrotraders/api-client';
import type { Product } from '../../mock/data';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';

export function ProductCard({ p }: { p: Product }) {
  const { t } = useI18n();
  const { fmtPrice } = useCurrency();
  const proof = socialProof(p.id);
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-surface-border bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(11,61,46,0.12)]">
      <Link to={`/product/${p.id}`} className="relative flex h-36 items-center justify-center overflow-hidden bg-brand-surface text-5xl">
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
              el.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span className={p.imageUrl ? 'hidden' : ''}>{p.emoji}</span>
        <div className="absolute start-2 top-2 flex flex-col gap-1">
          {p.offer && <Badge tone="mango">{t('site.offer')}</Badge>}
          {p.auction && <Badge tone="info">{t('site.auction')}</Badge>}
        </div>
        <button className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink-soft hover:text-status-error">
          <Icon name="heart" size={15} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span>{p.flag}</span>
          <span className="truncate">{p.seller}</span>
          {p.verified && <Icon name="shield" size={13} className="text-brand" />}
        </div>
        <Link to={`/product/${p.id}`} className="mt-1 line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink hover:text-brand">
          {p.name}
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="slate">{p.grade}</Badge>
          {p.safe && (
            <Badge tone="green" icon={<Icon name="shield" size={11} />}>
              {t('site.safeDeal')}
            </Badge>
          )}
          <Badge tone="mango" icon={<Icon name="star" size={11} />}>
            {p.rating}
          </Badge>
        </div>

        <div className="mt-2 text-xs text-ink-soft">
          {t('site.availableLine', { qty: p.qty, moq: p.moq, delivery: p.delivery })}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-orange">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange" />
          </span>
          {t('site.proofLine', { watching: proof.watching, ordered: proof.orderedLastMonth })}
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <span className="font-display text-lg font-extrabold text-ink">{fmtPrice(p)}</span>
            <span className="text-xs text-ink-soft">{p.unit}</span>
          </div>
          <Button size="sm" leftIcon={<Icon name="bag" size={15} />}>
            {t('site.buy')}
          </Button>
        </div>
      </div>
    </div>
  );
}
