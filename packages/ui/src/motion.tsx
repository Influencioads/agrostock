import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  animate,
  type MotionProps,
  type Transition,
  type Variants,
} from 'framer-motion';
import { cn } from './cn';

/* ── Shared easing / timing ───────────────────────────────────────── */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 };

/* ── Variant presets ──────────────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE_OUT } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const staggerItem: Variants = fadeUp;

/** Page-transition variants (fade + small slide). */
export function usePageMotion(): MotionProps {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
    };
  }
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.28, ease: EASE_OUT },
  };
}

/* ── Reveal (scroll / mount entrance) ─────────────────────────────── */

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** entrance style — defaults to fadeUp */
  variant?: Variants;
  /** delay in seconds */
  delay?: number;
  as?: 'div' | 'section' | 'span' | 'li';
}

export function Reveal({ children, className, variant = fadeUp, delay = 0, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const MotionTag = motion[as] as typeof motion.div;

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      variants={variant}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </MotionTag>
  );
}

/* ── Stagger container + item ─────────────────────────────────────── */

export interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** trigger on scroll into view (default) or immediately on mount */
  onView?: boolean;
}

export function Stagger({ children, className, onView = true }: StaggerProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate={!onView || inView ? 'show' : 'hidden'}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/* ── Interactive (hover-lift + tap) ───────────────────────────────── */

export interface InteractiveProps extends MotionProps {
  children: ReactNode;
  className?: string;
  /** disable the hover lift (keep only tap) */
  lift?: boolean;
  onClick?: () => void;
}

export function Interactive({ children, className, lift = true, onClick, ...rest }: InteractiveProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={lift ? { y: -3 } : undefined}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ── AnimatedNumber (count-up) ────────────────────────────────────── */

export interface AnimatedNumberProps {
  value: number;
  /** decimal places */
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  /** thousands separators */
  format?: boolean;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1.1,
  className,
  prefix = '',
  suffix = '',
  format = true,
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });

  const render = (n: number) => {
    const fixed = n.toFixed(decimals);
    const out = format ? Number(fixed).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : fixed;
    return `${prefix}${out}${suffix}`;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || !inView) {
      el.textContent = render(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => {
        el.textContent = render(v);
      },
    });
    return () => controls.stop();
  }, [value, inView, reduce]);

  return <span ref={ref} className={className}>{render(reduce ? value : 0)}</span>;
}

/* ── AnimatedBar (grow-in column / progress) ──────────────────────── */

export interface AnimatedBarProps {
  /** 0–100 target size along `axis` */
  size: number;
  axis?: 'height' | 'width';
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

export function AnimatedBar({ size, axis = 'height', className, style, delay = 0 }: AnimatedBarProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const target = `${size}%`;

  if (reduce) {
    return <div ref={ref} className={className} style={{ ...style, [axis]: target }} />;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ [axis]: '0%' }}
      animate={inView ? { [axis]: target } : { [axis]: '0%' }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    />
  );
}

/* ── AnimatedProgress hook (spring value 0..1) ────────────────────── */

export function useProgressSpring(value: number) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const spring = useSpring(mv, { stiffness: 120, damping: 20 });
  const [, force] = useState(0);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    mv.set(value);
    force((n) => n + 1);
  }, [value, reduce, mv]);
  return spring;
}

/* ── Re-exports commonly needed at app level ──────────────────────── */

export { motion, AnimatePresence, MotionConfig, useReducedMotion, useInView } from 'framer-motion';
export type { Variants, Transition, MotionProps } from 'framer-motion';

/** Small helper to merge classnames alongside motion usage. */
export const mcn = cn;
