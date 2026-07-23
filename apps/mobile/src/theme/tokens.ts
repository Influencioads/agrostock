import type { TextStyle } from 'react-native';

/**
 * Flat color palette for React Native, tuned to the AgroStock design prototype.
 *
 * These are the prototype's exact CSS-variable values (`--br`, `--bg`, `--ink`,
 * …) rather than the raw shared-token hexes: the mobile app is redesigned to
 * match that prototype pixel for pixel, and its greens sit a touch deeper and
 * its page a touch warmer than web/admin. The names are kept stable so every
 * screen that already reads `C.green`, `C.surface`, `C.ink`, … keeps working;
 * only the values move. `colors` is retained for the odd screen that still
 * wants a raw shared hue.
 */
export const C = {
  /** Deepest brand green — splash, gradients, dark chrome. `--brd` */
  evergreen: '#0B3D2E',
  /** @deprecated Historical mid-green; kept for callers. Use `green`/`evergreen`. */
  dark: '#146B3A',
  /** Primary green — CTAs, links, active states. `--br` */
  green: '#156C3B',
  /** Brighter leaf green — highlights, focus rings. `--brh` */
  leaf: '#3FA45F',
  /** Soft mint wash. */
  mint: '#DFF3E4',
  /** Selected / tinted surface — light-green card fills, chips, badges. `--brs` */
  surface: '#E1F0E4',
  /** Accent amber — the accent CTA and its glyphs. `--ac` */
  mango: '#E89A2B',
  /** Accent surface — light amber banners and pills. `--acs` */
  mangoSoft: '#FBEFDA',
  /** Accent ink — text/figures on amber. `--aci` */
  mangoDeep: '#8A5A10',
  orange: '#E89A2B',
  orangeSoft: '#FBEFDA',
  /** Dark gold — used for numerics/labels on light amber. `--aci` */
  gold: '#8A5A10',
  /** Primary text. `--ink` */
  ink: '#152A1D',
  /** Secondary text — labels, sublines. `--ink2` */
  inkSoft: '#4F6456',
  /** Page/card background alias. */
  bg: '#F3F7F3',
  /** Hairline / field border. `--bd` */
  border: '#DFE9E0',
  white: '#FFFFFF',
  success: '#2E8B57',
  warning: '#EF8E00',
  error: '#C94F45',
  info: '#2E7FA8',

  /* neutrals */
  /** Page backdrop behind white cards and grids. `--bg` */
  page: '#F3F7F3',
  /** 1px separator inside white surfaces — lighter than `border`. */
  hairline: '#E9F0EA',
  /** Muted text on white; lighter than `inkSoft` for placeholders/captions. `--ink3` */
  inkMuted: '#7F9486',
  /** Scrim behind sheets and modals. `--ov` */
  overlay: 'rgba(11,25,17,0.5)',
};

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
  /** Cards, banners and grid tiles — the prototype's soft 16px corner. */
  card: 16,
  /** Text fields, the search bar and small tiles. `--bd` fields are 14px. */
  input: 14,
  /** Selectable chips and small pills. */
  chip: 18,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/**
 * Elevation levels. Cards sit at `none` (they are separated by the page color
 * and hairlines, not by shadow); only things that genuinely float — sheets,
 * sticky action bars, the tab bar — cast one.
 */
export const elevation = {
  none: {},
  low: {
    shadowColor: '#0B3D2E',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 3,
  },
  /** Resting card lift — the prototype's `0 6px 20px rgba(15,40,25,.08)`. */
  card: {
    shadowColor: '#0F2819',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  /** The green glow under a primary CTA — `0 10px 24px rgba(21,108,59,.3)`. */
  cta: {
    shadowColor: '#156C3B',
    shadowOpacity: 0.3,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 9 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#0B3D2E',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;

/** @deprecated Superseded by `elevation`; kept until every screen has migrated. */
export const cardShadow = {
  shadowColor: '#0B3D2E',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Font families, registered by `theme/fonts.ts`. Manrope carries headings and
 * numerics, Inter carries body and UI text.
 *
 * Each constant names a single weight file, so styles set `fontFamily` WITHOUT
 * `fontWeight` — pairing the two makes Android synthesise extra boldness on an
 * already-bold face.
 */
export const font = {
  displaySemi: 'Manrope_600SemiBold',
  displayBold: 'Manrope_700Bold',
  displayExtra: 'Manrope_800ExtraBold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  /** IBM Plex Sans — figures only: prices, quantities, countdowns, IDs. */
  numMedium: 'IBMPlexSans_500Medium',
  numSemi: 'IBMPlexSans_600SemiBold',
  numBold: 'IBMPlexSans_700Bold',
} as const;

/**
 * The type scale. Density comes from tight line-heights and slightly negative
 * tracking on large text; `micro` goes the other way with positive tracking,
 * and pairs with `microLabel()` from `theme/casing.ts` for the caps treatment.
 */
export const type = {
  display: { fontFamily: font.displayExtra, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  h1: { fontFamily: font.displayExtra, fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  h2: { fontFamily: font.displayBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  h3: { fontFamily: font.displayBold, fontSize: 16, lineHeight: 21, letterSpacing: -0.1 },
  title: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 19 },
  body: { fontFamily: font.bodyRegular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.bodyRegular, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: font.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  /** Prices and figures — IBM Plex Sans's tabular numerals, per the prototype. */
  numeric: { fontFamily: font.numBold, fontSize: 15, lineHeight: 19, letterSpacing: -0.1 },
} satisfies Record<string, TextStyle>;

/**
 * @deprecated Weights are carried by the `font` families now. Setting both a
 * per-weight `fontFamily` and a `fontWeight` double-bolds on Android.
 */
export const weight = {
  regular: '400',
  semi: '600',
  bold: '700',
  extra: '800',
} as const;
