import { BRAND } from '@agrotraders/types';
import { cn } from './cn';
import { Icon } from './Icon';

const SIZES = {
  sm: { box: 'h-9 w-9', icon: 20, text: 'text-base' },
  md: { box: 'h-10 w-10', icon: 22, text: 'text-xl' },
  lg: { box: 'h-11 w-11', icon: 24, text: 'text-2xl' },
} as const;

export interface BrandMarkProps {
  /** Fully-resolved logo URL. When absent, the built-in leaf glyph is drawn. */
  logoSrc?: string;
  size?: keyof typeof SIZES;
  /** Class for the highlighted second run of the wordmark. */
  suffixClassName?: string;
  /** Class applied to the glyph tile (e.g. `shadow-cta`). */
  glyphClassName?: string;
  /** Draw only the glyph, no wordmark. */
  glyphOnly?: boolean;
  /**
   * Replaces the size preset's type scale on the wordmark — e.g.
   * `text-[15px] sm:text-xl` to keep the full name readable on a narrow phone.
   * It REPLACES rather than adds because `cn` is plain `clsx`: two font-size
   * utilities would both land in the class list and Tailwind's stylesheet order
   * (not the class order) would silently decide the winner.
   */
  wordmarkClassName?: string;
  className?: string;
}

/**
 * The product wordmark. An admin-uploaded logo replaces the glyph when one is
 * set; otherwise we fall back to the leaf tile, so the mark never depends on an
 * upload existing.
 */
export function BrandMark({
  logoSrc,
  size = 'md',
  suffixClassName = 'text-brand',
  glyphClassName,
  glyphOnly = false,
  wordmarkClassName,
  className,
}: BrandMarkProps) {
  const s = SIZES[size];
  return (
    <span className={cn('flex shrink-0 items-center gap-2.5', className)}>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={BRAND.name}
          className={cn(s.box, 'rounded-md object-contain', glyphClassName)}
        />
      ) : (
        <span
          className={cn(
            s.box,
            'flex items-center justify-center rounded-md bg-brand-gradient text-white',
            glyphClassName,
          )}
        >
          <Icon name="leaf" size={s.icon} />
        </span>
      )}
      {!glyphOnly && (
        <span className={cn('font-display font-extrabold whitespace-nowrap', wordmarkClassName ?? s.text)}>
          {BRAND.prefix}
          <span className={suffixClassName}>{BRAND.suffix}</span>
        </span>
      )}
    </span>
  );
}
