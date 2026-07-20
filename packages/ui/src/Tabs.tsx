import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from './cn';
import { SPRING } from './motion';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Pill tab group (green active state) — active pill slides between tabs. */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  const reduce = useReducedMotion();
  const layoutId = useId();
  return (
    <div
      className={cn(
        // Tabs size to their content, so a longer translated label set can exceed
        // the parent. Scroll the strip instead of overflowing the page.
        'inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-brand-surface p-1',
        className,
      )}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              'relative shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-bold transition-colors',
              active ? 'text-white' : 'text-ink-soft hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={reduce ? undefined : `tab-pill-${layoutId}`}
                className="absolute inset-0 rounded-md bg-brand-gradient shadow-cta"
                transition={SPRING}
              />
            )}
            <span className="relative z-10">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
