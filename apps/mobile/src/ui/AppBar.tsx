import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, space, type } from '../theme/tokens';

export interface AppBarAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Unread/count bubble on the icon. Values over 99 render as "99+". */
  badge?: number;
  a11y?: string;
}

/**
 * The app's own header — a search-first bar that owns the status-bar area
 * instead of sitting below it, so the surface reads as immersive.
 *
 * Screens using this must set `headerShown: false` on their navigator entry and
 * render their body without a 'top' safe-area edge; the inset is applied here.
 */
export function AppBar({
  title, leading, search, onSearchPress, actions = [], onBack, tinted = false, children,
}: {
  title?: string;
  /** Rendered before the title (a logo, usually). */
  leading?: ReactNode;
  /** Placeholder for the tappable search pill. Omit to hide the pill entirely. */
  search?: string;
  onSearchPress?: () => void;
  actions?: AppBarAction[];
  onBack?: () => void;
  /** Brand-green bar (Home) rather than the default white. */
  tinted?: boolean;
  /** Extra row below the search pill — a tab strip, a filter chip row. */
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const fg = tinted ? C.white : C.ink;
  return (
    <View
      style={[
        s.bar,
        { paddingTop: insets.top + 6, backgroundColor: tinted ? C.evergreen : C.white },
        !tinted && s.barBorder,
      ]}
    >
      <View style={s.top}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={fg} />
          </Pressable>
        ) : null}
        {leading}
        {title ? (
          <Text numberOfLines={1} style={{ ...type.h3, color: fg, flex: 1 }}>{title}</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {actions.map((a) => (
          <Pressable key={a.icon} onPress={a.onPress} hitSlop={8} accessibilityLabel={a.a11y} style={s.action}>
            <Ionicons name={a.icon} size={22} color={fg} />
            {a.badge ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{a.badge > 99 ? '99+' : a.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {search !== undefined ? (
        <Pressable onPress={onSearchPress} style={s.search}>
          <Ionicons name="search" size={18} color={C.inkSoft} />
          <Text numberOfLines={1} style={{ ...type.body, color: C.inkMuted, flex: 1 }}>{search}</Text>
        </Pressable>
      ) : null}

      {children}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { paddingBottom: 10, gap: 10 },
  barBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space.lg },
  action: { padding: 2 },
  search: {
    marginHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    // Fully-rounded search pill, matching the prototype's rounded field.
    borderRadius: 23,
    paddingHorizontal: 15,
    height: 46,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: C.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: C.white, ...type.micro, fontSize: 9.5, lineHeight: 12 },
});
