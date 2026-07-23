import { useFonts } from 'expo-font';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans/700Bold';

/**
 * Manrope (display) + Inter (body) + IBM Plex Sans (numerics) — the three
 * families `packages/tokens` declares for web, mirrored on mobile so the app
 * matches the AgroStock design prototype. Weights are imported one subpath at a
 * time rather than from the package index, which eagerly `require()`s every
 * weight it ships.
 *
 * IBM Plex Sans carries figures — prices, quantities, the countdown timers —
 * whose tabular, even-width numerals read cleaner in dense trade data than
 * Manrope's more stylised set.
 *
 * IMPORTANT: with per-weight font files you set `fontFamily` and must NOT also
 * set `fontWeight` — Android would synthesise a second bolding pass on top of an
 * already-bold file. The type scale in `tokens.ts` follows that rule.
 */
export const fontAssets = {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
};

/**
 * Blocks the first render until the families are registered.
 *
 * Returns true on failure as well as success: an unresolvable family makes RN
 * fall back to the system font, so a font that fails to download is a cosmetic
 * regression, never a startup hang.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fontAssets);
  return loaded || !!error;
}
