import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { navigationRef } from '../navigation/navigationRef';
import { useI18n } from '../i18n';
import { C, type } from '../theme/tokens';
import { FAB } from '../ui/fab';
import { useChatBadge } from './ChatBadgeContext';

/**
 * Where the button stays out of the way: the chat screens themselves (it would
 * only cover their composer), Checkout (its sticky bar IS the screen's action),
 * and the auth forms — iOS presents those as native modals above it anyway, so
 * this keeps Android the same.
 */
const HIDDEN_ON = new Set(['Community', 'Support', 'Checkout', 'SignIn', 'SignUp', 'ForgotPassword', 'OtpSignIn']);

/** Extra lift on routes that pin a bar above the tab bar: Browse's 46dp SORT | FILTER bar. */
const RAISE: Record<string, number> = { Browse: 46 };

/**
 * Floating chat button, bottom-start on every screen. Mounted once above the
 * navigator (App.tsx), so it tracks the focused route through `navigationRef`
 * rather than a screen's own navigation prop.
 */
export function ChatFab() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { unread, clear } = useChatBadge();
  const [route, setRoute] = useState<string>();
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const sync = () => setRoute(navigationRef.getCurrentRoute()?.name);
    sync();
    // v6 has no `ready` event; `options` fires as the first screen mounts.
    const offState = navigationRef.addListener('state', sync);
    const offOptions = navigationRef.addListener('options', sync);
    return () => {
      offState();
      offOptions();
    };
  }, []);

  // Out of the way while typing — it would otherwise sit over the focused field.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboard || (route && HIDDEN_ON.has(route))) return null;

  return (
    <Pressable
      onPress={() => {
        clear();
        if (navigationRef.isReady()) navigationRef.navigate('Community');
      }}
      style={({ pressed }) => [s.fab, { bottom: insets.bottom + FAB.bottom + (route ? RAISE[route] ?? 0 : 0) }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={t('hub.community')}
      hitSlop={6}
    >
      <Ionicons name="chatbubbles" size={24} color={C.white} />
      {unread > 0 ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute',
    start: 16,
    width: FAB.size,
    height: FAB.size,
    borderRadius: FAB.size / 2,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B3D2E',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -3,
    end: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: C.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.white,
  },
  badgeText: { ...type.micro, fontSize: 12, lineHeight: 14, color: C.white },
});
