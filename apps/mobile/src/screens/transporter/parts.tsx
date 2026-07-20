import { type ReactNode } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Row, Txt } from '../../ui';
import { useI18n } from '../../i18n';
import { C, radius, space } from '../../theme/tokens';
import { assetUrl } from '../../lib/api';

/** A picked local image, in the shape the api-client's upload helpers expect. */
export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

/** Bottom-sheet-ish modal used by the transporter add/edit forms. */
export function FormModal({
  visible, title, onClose, onSubmit, submitting, submitLabel, canSubmit = true, children,
}: {
  visible: boolean; title: string; onClose: () => void; onSubmit: () => void;
  submitting?: boolean; submitLabel?: string; canSubmit?: boolean; children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '92%', paddingBottom: 12 }}>
          <Row style={{ justifyContent: 'space-between', padding: space.lg, paddingBottom: 8 }}>
            <Txt variant="h3">{title}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={C.inkSoft} /></Pressable>
          </Row>
          <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <Row gap={10} style={{ paddingHorizontal: space.lg, paddingTop: 8 }}>
            <View style={{ flex: 1 }}><Button title={t('mobile2.form.cancel')} variant="outline" full onPress={onClose} /></View>
            <View style={{ flex: 1 }}><Button title={submitLabel ?? t('mobile2.form.save')} full loading={submitting} disabled={!canSubmit} onPress={onSubmit} /></View>
          </Row>
        </View>
      </View>
    </Modal>
  );
}

/** Round/square photo picker. Holds the pick locally; the parent uploads on save. */
export function PhotoPicker({
  url, picked, onPick, round, size = 84,
}: { url?: string | null; picked?: PickedImage | null; onPick: (img: PickedImage) => void; round?: boolean; size?: number }) {
  const { t } = useI18n();
  const preview = picked?.uri ?? assetUrl(url) ?? undefined;
  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    onPick({ uri: a.uri, name: a.fileName || a.uri.split('/').pop() || 'photo.jpg', type: a.mimeType || 'image/jpeg' });
  }
  return (
    <Row gap={12}>
      <Pressable onPress={pick} style={{ width: size, height: size, borderRadius: round ? size / 2 : radius.md, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
        {preview ? <Image source={{ uri: preview }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="camera-outline" size={26} color={C.inkSoft} />}
      </Pressable>
      <Button title={preview ? t('mobile2.form.changePhoto') : t('mobile2.form.addPhoto')} variant="outline" size="sm" onPress={pick} />
    </Row>
  );
}
