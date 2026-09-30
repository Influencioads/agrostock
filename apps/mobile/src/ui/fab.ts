import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/**
 * Geometry of the floating chat button (`chat/ChatFab.tsx`), in dp above the
 * bottom safe-area inset. `bottom` clears the 64dp tab bar and `Screen` footer
 * action bars alike, so one offset works on tabbed and pushed screens.
 */
export const FAB = { bottom: 64 + 16, size: 56 };

/**
 * Bottom padding a scroller needs so its last row can scroll clear of the
 * floating chat button. Inside the tabs the tab bar already takes part of that
 * height; on pushed screens the context is undefined, so the whole of it counts.
 */
export function useFabClearance(): number {
  const insets = useSafeAreaInsets();
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  return Math.max(32, insets.bottom + FAB.bottom + FAB.size + 8 - tabBar);
}
