import type { TextStyle } from 'react-native';
import { currentLang } from '../i18n';

/**
 * Scripts with no letter case. `textTransform: 'uppercase'` is a no-op for them
 * at best, and for Persian/Arabic it can still disturb shaping of interleaved
 * Latin runs, so the micro-label treatment is simply skipped.
 */
const CASELESS = new Set(['ar', 'fa', 'hi', 'ja', 'zh-Hans']);

/** True when the active locale's script actually has upper/lower case. */
export function hasLetterCase(): boolean {
  return !CASELESS.has(currentLang());
}

/**
 * The uppercase micro-label treatment (small, spaced, all-caps) used for section
 * eyebrows, button labels and the "brand" slot on product cards. Degrades to
 * plain text — same size and weight, no tracking — in caseless scripts.
 */
export function microLabel(): TextStyle {
  return hasLetterCase() ? { textTransform: 'uppercase', letterSpacing: 0.6 } : {};
}
