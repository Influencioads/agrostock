import type { HTMLAttributes } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { cn } from './cn';
import { SPRING } from './motion';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  /** CSS-only hover lift (kept for backwards compat) */
  hoverable?: boolean;
  /** spring-based hover lift + tap feedback via framer-motion */
  interactive?: boolean;
}

export function Card({ padded = true, hoverable, interactive, className, children, ...rest }: CardProps) {
  const reduce = useReducedMotion();
  const base = cn(
    'rounded-lg border border-surface-border bg-white shadow-card',
    padded && 'p-5',
    hoverable && !interactive && 'transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(11,61,46,0.10)]',
    className,
  );

  if (interactive && !reduce) {
    return (
      <motion.div
        className={cn(base, 'cursor-pointer')}
        whileHover={{ y: -4, boxShadow: '0 14px 34px rgba(11,61,46,0.12)' }}
        whileTap={{ scale: 0.98 }}
        transition={SPRING}
        {...(rest as unknown as HTMLMotionProps<'div'>)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={base} {...rest}>
      {children}
    </div>
  );
}
