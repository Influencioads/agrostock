import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-gradient text-white shadow-cta hover:brightness-105',
  secondary: 'bg-brand-surface text-brand-dark hover:bg-brand-mint',
  accent: 'bg-mango-gradient text-brand-evergreen shadow-mango hover:brightness-105',
  ghost: 'bg-transparent text-ink-soft hover:bg-brand-surface',
  outline: 'bg-white text-ink border border-surface-border hover:border-brand-leaf',
  danger: 'bg-status-error text-white hover:brightness-105',
};

// `min-h` rather than `h`: a translated label can be ~35% longer than English
// (and up to 2.5x for some strings), and a fixed height clips the wrap silently —
// no scrollbar, just cut-off text. Growing the button is always recoverable.
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-[13px] rounded-md',
  md: 'min-h-11 px-5 py-2 text-sm rounded-md',
  lg: 'min-h-12 px-6 py-2.5 text-base rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 text-center font-display font-bold leading-tight transition',
        'active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {/* Icons must not be squeezed away by a long label. */}
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
