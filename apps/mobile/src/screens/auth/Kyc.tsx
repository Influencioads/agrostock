import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiKycDocType, ApiMyKyc } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { Badge, Button, Card, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';

/** Display labels come from `pubX.kyc.doc.<type>`; these are the API doc types. */
const DOC_TYPES: { type: ApiKycDocType }[] = [
  { type: 'trade_license' },
  { type: 'government_id' },
  { type: 'bank_proof' },
  { type: 'tax_certificate' },
];

const statusTone: Record<string, 'green' | 'warn' | 'error'> = {
  verified: 'green',
  pending: 'warn',
  rejected: 'error',
};

/**
 * Business/identity verification. Users photograph their documents; the files
 * upload to the private KYC store and an admin reviews them. Documents can be
 * removed only while the record is still pending.
 */
export function Kyc() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [busyType, setBusyType] = useState<ApiKycDocType | null>(null);
  const { data } = useQuery<ApiMyKyc>({ queryKey: ['me-kyc'], queryFn: () => api.kyc.mine() });

  const status = data?.status ?? 'pending';
  const docs = data?.documents ?? [];
  const editable = status !== 'verified';

  const remove = useMutation({
    mutationFn: (id: string) => api.kyc.deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-kyc'] }),
    onError: (e) => Alert.alert(t('pubX.kyc.removeFailTitle'), errMessage(e, t('pubX.kyc.tryAgain'))),
  });

  async function capture(type: ApiKycDocType) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('pubX.kyc.permTitle'), t('pubX.kyc.permBody'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled) return;
    const asset = res.assets[0];
    setBusyType(type);
    try {
      await api.kyc.uploadDocument(type, {
        uri: asset.uri,
        name: asset.fileName || asset.uri.split('/').pop() || 'document.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      await qc.invalidateQueries({ queryKey: ['me-kyc'] });
    } catch (e) {
      Alert.alert(t('pubX.kyc.uploadFailTitle'), errMessage(e, t('pubX.kyc.uploadFailBody')));
    } finally {
      setBusyType(null);
    }
  }

  async function view(id: string) {
    try {
      await Linking.openURL(await api.kyc.docUrl(id));
    } catch (e) {
      Alert.alert(t('pubX.kyc.openFailTitle'), errMessage(e, t('pubX.kyc.tryAgain')));
    }
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="h2">{t('pubX.kyc.title')}</Txt>
        <Badge label={t('enums:kyc.' + status, { defaultValue: status })} tone={statusTone[status] ?? 'slate'} />
      </Row>
      <Txt variant="muted">{t('pubX.kyc.intro')}</Txt>

      {DOC_TYPES.map(({ type }) => {
        const uploaded = docs.filter((d) => d.type === type);
        return (
          <Card key={type} style={{ gap: 10 }}>
            <Row style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="document-attach-outline" size={22} color={C.dark} />
              </View>
              <Txt variant="title" style={{ flex: 1 }}>{t('pubX.kyc.doc.' + type)}</Txt>
              {editable && (
                <Button
                  title={busyType === type ? t('pubX.kyc.uploading') : uploaded.length ? t('pubX.kyc.replace') : t('pubX.kyc.upload')}
                  variant="outline"
                  size="sm"
                  icon="camera-outline"
                  disabled={busyType !== null}
                  onPress={() => capture(type)}
                />
              )}
            </Row>

            {uploaded.map((d) => (
              <Row key={d.id} style={{ alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 10, padding: 8 }}>
                <Ionicons name="checkmark-circle" size={18} color={C.green} />
                <Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>{d.originalName ?? d.mime}</Txt>
                <Button title={t('pubX.kyc.view')} variant="ghost" size="sm" onPress={() => view(d.id)} />
                {editable && (
                  <Button title={t('pubX.kyc.remove')} variant="ghost" size="sm" disabled={remove.isPending} onPress={() => remove.mutate(d.id)} />
                )}
              </Row>
            ))}
          </Card>
        );
      })}

      {status === 'pending' && docs.length > 0 && (
        <Txt variant="muted">{t('pubX.kyc.underReview')}</Txt>
      )}
    </Screen>
  );
}
