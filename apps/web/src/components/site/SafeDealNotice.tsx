import { Link } from 'react-router-dom';
import { Icon } from '@agrotraders/ui';
import { useI18n } from '../../i18n';

/**
 * "Protected by Safe Deal" — the standing notice on every auction and bid
 * surface.
 *
 * Deliberately NOT dismissible and not collapsible: escrow is mandatory on these
 * flows, so this is a statement of how the trade settles, not an announcement a
 * user can acknowledge and hide. There is no close button and no persisted
 * state — it renders on every visit.
 *
 * `tone="hero"` is the light-on-dark variant for the auction hero band;
 * `tone="card"` is the default light card used inside page bodies.
 */
export function SafeDealNotice({ tone = 'card', className = '' }: { tone?: 'card' | 'hero'; className?: string }) {
  const { t } = useI18n();
  const steps = [t('site.safeDealLockStep1'), t('site.safeDealLockStep2'), t('site.safeDealLockStep3')];
  const hero = tone === 'hero';

  return (
    <section
      // `role="note"` rather than `alert`: it is persistent context, not an
      // interruption, so a screen reader announces it in document order.
      role="note"
      aria-label={t('site.safeDealLockTitle')}
      className={
        (hero
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-brand-leaf/40 bg-brand-surface/60 text-ink') +
        ' rounded-xl border p-3.5 ' +
        className
      }
    >
      <div className="flex items-center gap-2">
        <Icon name="shield" size={16} className={hero ? 'shrink-0 text-brand-leaf' : 'shrink-0 text-brand'} />
        <span className="font-display text-sm font-extrabold">{t('site.safeDealLockTitle')}</span>
      </div>
      <p className={'mt-1 text-xs ' + (hero ? 'text-white/80' : 'text-ink-soft')}>{t('site.safeDealLockSub')}</p>
      <ol className={'mt-2 space-y-1 text-xs ' + (hero ? 'text-white/90' : 'text-ink-soft')}>
        {steps.map((step, i) => (
          <li key={step} className="flex gap-2">
            <span
              className={
                'mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ' +
                (hero ? 'bg-white/20 text-white' : 'bg-brand text-white')
              }
            >
              {i + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
      <Link
        to="/safe-deal"
        className={
          'mt-2 inline-flex items-center gap-1 text-xs font-bold ' +
          (hero ? 'text-brand-leaf hover:text-white' : 'text-brand hover:text-brand-dark')
        }
      >
        {t('site.safeDealLockLink')} <Icon name="chevronRight" size={12} />
      </Link>
    </section>
  );
}
