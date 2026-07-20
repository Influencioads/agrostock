import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone = 'green' | 'gold' | 'mango' | 'warn' | 'error' | 'info' | 'slate';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
}

const TONES: Record<BadgeTone, string> = {
  green: 'text-brand-dark bg-brand-surface border-[#bfe0c9]',
  gold: 'text-gold bg-mango-soft border-[#efe0bf]',
  mango: 'text-orange bg-mango-soft border-[#f3d9a8]',
  warn: 'text-status-warning bg-[#FBF3E2] border-[#f0e0bc]',
  error: 'text-status-error bg-[#FBE9E6] border-[#f3d3ce]',
  info: 'text-status-info bg-[#E6F0F4] border-[#c9dfe9]',
  slate: 'text-ink-soft bg-[#F0EFEA] border-surface-border',
};

/** Status chip — matches the design's `chip()` helper. */
export function Badge({ tone = 'green', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        // Stays on one line, but `max-w-full` + `truncate` stop a long translated
        // status from widening its row and forcing page-level overflow.
        'inline-flex max-w-full items-center gap-1 truncate whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
