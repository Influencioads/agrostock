import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, label, hint, error, className, id, type, ...rest },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

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
          type={inputType}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-soft transition hover:bg-brand-surface hover:text-ink"
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
          </button>
        )}
      </span>
      {error ? (
        <span className="mt-1 block text-xs text-status-error">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>
      )}
    </label>
  );
});
