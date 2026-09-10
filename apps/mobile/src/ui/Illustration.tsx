import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '../theme/tokens';

/**
 * The one image fallback: a sprout on a soft disc, drawn in the brand greens.
 * Replaces the per-listing emoji (and the old two-letter monograms) wherever
 * artwork is missing — product cards, rows, the gallery, category chips — so
 * every empty image well reads as the same quiet agricultural mark.
 */
export function ProduceMark({ size = 56, tint = C.mint }: { size?: number; tint?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no">
      <Circle cx={32} cy={32} r={32} fill={tint} />
      <Path d="M32 50 C32 42 32 34 32 27" stroke={C.green} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M32 39 C24 39 18 33 18 25 C26 25 32 31 32 39 Z" fill={C.leaf} />
      <Path d="M32 31 C32 23 38 17 46 17 C46 25 40 31 32 31 Z" fill={C.green} />
      <Path d="M21 51 Q32 47 43 51" stroke={C.green} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.45} />
    </Svg>
  );
}
