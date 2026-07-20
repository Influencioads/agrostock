import { Icon } from '@agrotraders/ui';
import type { ApiReviewSummary } from '@agrotraders/api-client';
import { useI18n } from '../../i18n';

type BreakdownKey = keyof ApiReviewSummary['breakdown'];

/** A row of 5 stars, filled up to `n`. */
function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} className={i <= n ? 'text-mango-deep' : 'text-surface-border'} />
      ))}
    </span>
  );
}

/**
 * Renders a review summary: average + count, a 5-row breakdown bar, and the
 * individual reviews. Bare content — wrap it in a <Card> where it's used.
 */
export function ReviewList({ summary }: { summary: ApiReviewSummary }) {
  const { t } = useI18n();

  if (summary.count === 0) {
    return <p className="text-sm text-ink-soft">{t('console.reviews.none')}</p>;
  }

  const bars = ([5, 4, 3, 2, 1] as const).map((s) => ({ s, c: summary.breakdown[`${s}` as BreakdownKey] ?? 0 }));
  const max = Math.max(1, ...bars.map((b) => b.c));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-6">
        <div className="text-center">
          <div className="font-display text-4xl font-extrabold text-ink">{summary.avg.toFixed(1)}</div>
          <div className="mt-1 flex justify-center">
            <Stars n={Math.round(summary.avg)} />
          </div>
          <div className="mt-1 text-xs text-ink-soft">{t('console.reviews.count', { count: summary.count })}</div>
        </div>
        <div className="min-w-[180px] flex-1 space-y-1">
          {bars.map(({ s, c }) => (
            <div key={s} className="flex items-center gap-2 text-xs text-ink-soft">
              <span className="w-3 text-end font-numeric">{s}</span>
              <Icon name="star" size={11} className="text-mango-deep" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-surface">
                <div className="h-full rounded-full bg-mango-deep" style={{ width: `${(c / max) * 100}%` }} />
              </div>
              <span className="w-6 text-end font-numeric">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {summary.list.map((r) => (
          <div key={r.id} className="border-b border-surface-border pb-4 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">{r.rater?.name ?? t('console.reviews.anon')}</span>
              <span className="text-xs text-ink-soft">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Stars n={r.stars} />
              {r.editedByAuthorAt && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  {t('console.reviews.edited')}
                </span>
              )}
            </div>
            {r.text && <p className="mt-1 text-sm text-ink-soft">{r.text}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
