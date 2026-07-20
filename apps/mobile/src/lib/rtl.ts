import { I18nManager } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

/**
 * Right-to-left helpers (Arabic).
 *
 * React Native mirrors `flexDirection: 'row'` and the logical `*Start`/`*End`
 * style props automatically once `I18nManager.forceRTL(true)` is set (see
 * `src/i18n/index.tsx`) — but it does NOT mirror:
 *   • icons — a "back" chevron keeps pointing the same way, and
 *   • `textAlign: 'left' | 'right'`, which have no logical equivalent in RN.
 * These helpers cover those two gaps. Everything else should simply use
 * `marginStart`/`marginEnd`/`paddingStart`/`paddingEnd` instead of Left/Right.
 *
 * Direction only changes after a full reload (forceRTL restarts the app), so
 * reading `I18nManager.isRTL` at call time is stable within a session.
 */
type IconName = keyof typeof Ionicons.glyphMap;

export const isRTL = (): boolean => I18nManager.isRTL;

/** Chevron pointing "back" (towards where the user came from). */
export const backChevron = (): IconName => (I18nManager.isRTL ? 'chevron-forward' : 'chevron-back');

/** Disclosure chevron pointing "onwards" (into detail). */
export const forwardChevron = (): IconName => (I18nManager.isRTL ? 'chevron-back' : 'chevron-forward');

/** `textAlign` that hugs the end of the line — RN has no logical 'end' value. */
export const alignEnd = (): 'left' | 'right' => (I18nManager.isRTL ? 'left' : 'right');
