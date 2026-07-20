import type { SVGProps } from 'react';

/**
 * Rounded line-icon set. The core glyphs are ported verbatim from the
 * AgroTraders design (`ic()` path data) so the build matches the reference;
 * the rest are common UI additions in the same 24px / round-join style.
 */
export const ICON_PATHS = {
  // ── from the design ─────────────────────────────────────────────
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  store: 'M3 9l1.5-5h15L21 9M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M3 9h18',
  bag: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0',
  box: 'M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  gauge: 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2a10 10 0 1 0 7 17M12 7v0M19 19l-2.5-2.5',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM11 18h2',
  palette:
    'M12 22a10 10 0 1 1 0-20c5 0 9 3.5 9 8 0 3-2.5 4-4.5 4H14a2 2 0 0 0-1.5 3.3A1.5 1.5 0 0 1 12 22ZM7.5 11.5v.01M11 7.5v.01M16 8.5v.01',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18.5a2 2 0 1 0 0 1M18.5 18.5a2 2 0 1 0 0 1',
  worker: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M9 8 7 5h10l-2 3',
  shield: 'M12 2 4 5v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V5l-8-3ZM9 12l2 2 4-4',
  wallet:
    'M3 7a2 2 0 0 1 2-2h14v4M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M21 9v5h-5a2.5 2.5 0 0 1 0-5h5Z',
  gavel: 'm14 12-8.5 8.5a2.1 2.1 0 0 1-3-3L11 9M11 8l5 5M14.5 5.5l4 4M9.5 10.5l4 4M17 3l4 4',
  chart: 'M3 3v18h18M7 14l3-4 3 3 5-7',
  admin: 'M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4ZM12 8v4l3 2',
  // ── common additions ────────────────────────────────────────────
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 18.8 6.6 19.9l1-6.1L3.2 9.5l6.1-.9Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  heart: 'M12 21C5 14 2 10.5 2 7.5A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 10 2.5c0 3-3 6.5-10 13.5Z',
  filter: 'M3 5h18M6 12h12M10 19h4',
  menu: 'M3 6h18M3 12h18M3 18h18',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  mapPin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 7v5l3 2',
  leaf: 'M12 2c0 5-3 7-3 11a3 3 0 0 0 6 0c0-4-3-6-3-11ZM5 13c2 0 4 2 4 5M19 13c-2 0-4 2-4 5',
  message: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-1L3 20l1.1-4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z',
  file: 'M6 2h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM13 2v5h5M9 13h6M9 17h6',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

/**
 * Glyphs that point somewhere. Logical CSS properties mirror layout in RTL but
 * never rotate an arrow, so these are flipped explicitly under `dir="rtl"`.
 * Non-directional glyphs (search, star, truck…) must NOT be flipped.
 */
const DIRECTIONAL: ReadonlySet<string> = new Set(['chevronLeft', 'chevronRight', 'arrowLeft', 'arrowRight']);

export function Icon({ name, size = 20, strokeWidth = 2, className, ...rest }: IconProps) {
  const rtlAware = DIRECTIONAL.has(name) ? 'rtl:-scale-x-100' : undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[rtlAware, className].filter(Boolean).join(' ') || undefined}
      {...rest}
    >
      {ICON_PATHS[name]
        .split('M')
        .filter(Boolean)
        .map((d, i) => (
          <path key={i} d={'M' + d} />
        ))}
    </svg>
  );
}
