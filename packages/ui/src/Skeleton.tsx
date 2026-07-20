import { cn } from './cn';

export interface SkeletonProps {
  className?: string;
  /** number of stacked lines (each a bar). Ignored when children provided. */
  lines?: number;
  rounded?: 'md' | 'lg' | 'full';
}

/** Shimmering placeholder for loading states. Respects prefers-reduced-motion. */
export function Skeleton({ className, lines, rounded = 'md' }: SkeletonProps) {
  const radius = rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md';
  const bar = cn(
    'relative overflow-hidden bg-brand-surface',
    radius,
    "before:absolute before:inset-0 before:bg-shimmer before:animate-shimmer motion-reduce:before:animate-none",
  );
  if (lines && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={cn(bar, 'h-4', i === lines - 1 && 'w-2/3', className)} />
        ))}
      </div>
    );
  }
  return <div className={cn(bar, 'h-4', className)} />;
}
