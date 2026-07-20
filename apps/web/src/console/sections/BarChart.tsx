import { useState } from 'react';
import { Card, AnimatedBar } from '@agrotraders/ui';
import { useI18n } from '../../i18n';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Localized short month name; falls back to English if ICU data is unavailable. */
function monthLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  } catch {
    return MONTHS_EN[d.getMonth()];
  }
}

/** Trailing `n` month labels ending with the current month. */
function lastMonths(n: number, locale: string): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthLabel(d, locale));
  }
  return out;
}

/** Reusable column chart with an 8M / 1Y range toggle. The last bar is mango. */
export function BarChart({
  title,
  caption,
  data8 = [],
  data12 = [],
  className,
}: {
  title: string;
  caption: string;
  data8?: number[];
  data12?: number[];
  className?: string;
}) {
  const { t, lang } = useI18n();
  const [range, setRange] = useState<'8M' | '1Y'>('8M');
  // Fall back to a fixed-length empty series so the axis still renders while loading.
  const raw = range === '8M' ? data8 : data12;
  const series = raw.length ? raw : new Array(range === '8M' ? 8 : 12).fill(0);
  const labels = lastMonths(series.length, lang);
  const max = Math.max(1, ...series);
  const hasData = series.some((v) => v > 0);

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <p className="text-xs text-ink-soft">
            {caption} · {t('console.chart.lastMonths', { count: series.length })}
          </p>
        </div>
        <div className="flex rounded-lg bg-surface-bg p-0.5">
          {(['8M', '1Y'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                'rounded-md px-3 py-1 text-xs font-bold transition ' +
                (range === r ? 'bg-brand-dock text-white' : 'text-ink-soft hover:text-ink')
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {hasData ? (
        <div className="mt-6 flex h-44 items-end gap-2">
          {series.map((v, i) => {
            const last = i === series.length - 1;
            // Normalize to a 0–100 bar height so any absolute values fit.
            return (
              <div key={i} className="flex flex-1 items-end self-stretch">
                <AnimatedBar
                  size={Math.max(2, Math.round((v / max) * 100))}
                  axis="height"
                  delay={i * 0.04}
                  className="w-full rounded-t-md"
                  style={{
                    background: last
                      ? 'linear-gradient(180deg,#FFA000,#F57C00)'
                      : 'linear-gradient(180deg,#53B86A,#249653)',
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 flex h-44 items-center justify-center text-sm text-ink-soft">
          {t('console.chart.noData')}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        {labels.map((m, i) => (
          <span key={i} className="flex-1 text-center text-[11px] text-ink-soft">
            {m}
          </span>
        ))}
      </div>
    </Card>
  );
}
