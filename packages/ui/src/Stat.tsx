import type { ReactNode } from 'react';
import { cn } from './cn';
import { AnimatedNumber } from './motion';

export interface StatProps {
  label: string;
  value: ReactNode;
  delta?: string;
  up?: boolean;
  icon?: ReactNode;
  className?: string;
  /** when value is numeric, count it up on view (prefix/suffix wrap the number) */
  animate?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

/** KPI stat card — used across dashboards. */
export function Stat({ label, value, delta, up, icon, className, animate, prefix, suffix, decimals }: StatProps) {
  const numeric = animate && typeof value === 'number';
  return (
    // KPI tiles sit in tight grid columns (often 4 across), so every child must be
    // allowed to shrink/wrap rather than widen the track.
    <div className={cn('min-w-0 rounded-lg border border-surface-border bg-white p-5 shadow-card', className)}>
      <div className="flex items-start justify-between gap-2">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-surface text-brand-dark">
            {icon}
          </span>
        )}
        {delta && (
          <span className={cn('shrink-0 text-xs font-bold', up === false ? 'text-status-error' : 'text-status-success')}>
            {delta}
          </span>
        )}
      </div>
      <div className="mt-3 min-w-0 break-words font-display text-2xl font-extrabold text-ink">
        {numeric ? (
          <AnimatedNumber value={value as number} prefix={prefix} suffix={suffix} decimals={decimals} />
        ) : (
          value
        )}
      </div>
      <div className="mt-1 min-w-0 break-words text-sm text-ink-soft">{label}</div>
    </div>
  );
}
