import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, label, hint, error, className, id, ...rest },
  ref,
) {
  return (
    <label className="block" htmlFor={id}>
      {label && <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>}
      <span
        className={cn(
          'flex items-center gap-2 rounded-md border bg-white px-3',
          error ? 'border-status-error' : 'border-surface-border focus-within:border-brand-leaf',
        )}
      >
        {leftIcon && <span className="text-ink-soft">{leftIcon}</span>}
        <input
          ref={ref}
          id={id}
          className={cn('h-11 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft', className)}
          {...rest}
        />
      </span>
      {error ? (
        <span className="mt-1 block text-xs text-status-error">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>
      )}
    </label>
  );
});
