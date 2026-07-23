import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, elevation, radius, space, type } from '../theme/tokens';

/**
 * The one bottom sheet every modal surface in the app is built from: backdrop,
 * grab handle, header row, scrolling body, optional sticky footer.
 *
 * `fullScreen` swaps the rounded partial sheet for a full-height panel — used by
 * the filter sheet, where a two-pane layout needs the whole viewport.
 */
export function Sheet({
  visible, onClose, title, children, footer, fullScreen = false, onBack, scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  fullScreen?: boolean;
  /** Shows a back chevron in the header (drill-down sheets). */
  onBack?: () => void;
  /** Set false when the body manages its own scrolling (e.g. a two-pane layout). */
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {!fullScreen ? <Pressable style={s.backdrop} onPress={onClose} /> : null}
      {/* `statusBarTranslucent` puts the modal behind the status bar, so a
          full-height panel has to inset its own header; a partial sheet starts
          well below it and doesn't. */}
      <View
        style={[
          s.panel,
          fullScreen ? s.panelFull : s.panelPartial,
          fullScreen ? { paddingTop: insets.top } : null,
        ]}
      >
        {!fullScreen ? <View style={s.handle} /> : null}

        {title !== undefined || onBack ? (
          <View style={s.header}>
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color={C.ink} />
              </Pressable>
            ) : null}
            <Text numberOfLines={1} style={{ ...type.h3, flex: 1 }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.inkSoft} />
            </Pressable>
          </View>
        ) : null}

        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xl }}>
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}

        {footer ? <View style={s.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.overlay },
  panel: { backgroundColor: C.white, ...elevation.sheet },
  panelPartial: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '86%' },
  panelFull: { flex: 1 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: C.hairline, marginTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
    backgroundColor: C.white,
  },
});
