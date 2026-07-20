import { colors } from '@agrotraders/tokens';

/** Flat color palette for React Native, sourced from the shared design tokens. */
export const C = {
  evergreen: colors.brand.evergreen,
  dark: colors.brand.dark,
  green: colors.brand.DEFAULT,
  leaf: colors.brand.leaf,
  mint: colors.brand.mint,
  surface: colors.brand.surface,
  mango: colors.mango.DEFAULT,
  mangoSoft: colors.mango.soft,
  mangoDeep: colors.mango.deep,
  orange: colors.orange.DEFAULT,
  orangeSoft: colors.orange.soft,
  gold: colors.gold,
  ink: colors.ink.DEFAULT,
  inkSoft: colors.ink.soft,
  bg: colors.surface.bg,
  border: colors.surface.border,
  white: '#FFFFFF',
  success: colors.status.success,
  warning: colors.status.warning,
  error: colors.status.error,
  info: colors.status.info,
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/** Soft card shadow approximation for RN (iOS shadow + Android elevation). */
export const cardShadow = {
  shadowColor: '#0B3D2E',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

// Custom fonts (Manrope/Inter) are wired in M9; until then we lean on system
// fonts + weights so nothing depends on an unloaded family.
export const weight = {
  regular: '400',
  semi: '600',
  bold: '700',
  extra: '800',
} as const;
