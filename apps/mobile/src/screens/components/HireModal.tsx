import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, Input, Row, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useI18n } from '../../i18n';
import { CityField } from './GeoFields';

export interface HireTarget {
  targetType: 'transporter' | 'loaderco' | 'worker';
  targetUserId: string;
  workerId?: string;
  name: string;
}

const BLANK = { message: '', fromCity: '', toCity: '', cargo: '', location: '', workersNeeded: '1', budget: '' };

/** Bottom-sheet style direct-hire form → POST /hires. */
/**
 * Pass `orderId` to source logistics from inside one of the seller's orders — on
 * accept the minted Trip attaches back to the order so dispatch/OTP keeps working.
 * Pass `initial` (from `orderLogistics(order)`) so the route and cargo arrive
 * filled in; the server applies the same fallbacks, so these are editable.
 */
export function HireModal({
  target,
  orderId,
  initial,
  onClose,
}: {
  target: HireTarget;
  orderId?: string;
  initial?: Partial<typeof BLANK>;
  onClose: () => void;
}) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useI18n();
  const { user } = useAuth();
  const [f, setF] = useState({ ...BLANK, ...initial });
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const send = useMutation({
    mutationFn: () =>
      api.hires.create({
        targetType: target.targetType,
        targetUserId: target.targetUserId,
        workerId: target.workerId,
        message: f.message || undefined,
        fromCity: f.fromCity || undefined,
        toCity: f.toCity || undefined,
        cargo: f.cargo || undefined,
        location: f.location || undefined,
        workersNeeded: Number(f.workersNeeded) || undefined,
        budgetCents: f.budget ? Math.round(Number(f.budget) * 100) : undefined,
        orderId,
      }),
    onSuccess: (h) => setDone(h.reference),
  });

  const isTransport = target.targetType === 'transporter';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '85%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{t('compX.hire.title.' + target.targetType)}</Txt>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.inkSoft} />
            </Pressable>
          </Row>
          <Txt variant="muted">{t('compX.hire.instant', { name: target.name })}</Txt>

          {done ? (
            <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
              <Txt style={{ fontSize: 34 }}>✅</Txt>
              <Txt variant="title">{t('compX.hire.requestSent', { ref: done })}</Txt>
              <Txt variant="muted" style={{ textAlign: 'center' }}>{t('compX.hire.trackHint')}</Txt>
              <Button title={t('compX.hire.done')} full onPress={onClose} />
            </Card>
          ) : !user ? (
            <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
              <Txt variant="muted">{t('compX.hire.signInPrompt')}</Txt>
              <Button title={t('compX.hire.signIn')} onPress={() => { onClose(); nav.navigate('SignIn', {}); }} />
            </Card>
          ) : (
            <>
              {isTransport ? (
                <>
                  <Row gap={10}>
                    {/* No country on a hire — the pickers search every country. */}
                    <View style={{ flex: 1 }}><CityField label={t('compX.hire.from')} placeholder={t('pubX.ph.cityMundra')} value={f.fromCity} onChange={set('fromCity')} /></View>
                    <View style={{ flex: 1 }}><CityField label={t('compX.hire.to')} placeholder={t('pubX.ph.cityDubai')} value={f.toCity} onChange={set('toCity')} /></View>
                  </Row>
                  <Input label={t('compX.hire.cargo')} placeholder={t('pubX.ph.cargoBasmati50')} value={f.cargo} onChangeText={set('cargo')} />
                </>
              ) : (
                <>
                  <Input label={t('compX.hire.location')} placeholder={t('pubX.ph.locationTerminal')} value={f.location} onChangeText={set('location')} />
                  {target.targetType === 'loaderco' && (
                    <Input label={t('compX.hire.workersNeeded')} keyboardType="numeric" value={f.workersNeeded} onChangeText={set('workersNeeded')} />
                  )}
                </>
              )}
              <Input label={t('compX.hire.budget')} keyboardType="numeric" placeholder="4200" value={f.budget} onChangeText={set('budget')} />
              <Input label={t('compX.hire.message')} placeholder={t('compX.hire.messagePlaceholder')} value={f.message} onChangeText={set('message')} multiline />
              {send.isError ? (
                <Txt color={C.error} variant="small">
                  {(send.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('compX.hire.sendError')}
                </Txt>
              ) : null}
              <Button title={send.isPending ? t('compX.hire.sending') : t('compX.hire.send')} icon="checkmark" full loading={send.isPending} onPress={() => send.mutate()} />
            </>
          )}
          <View style={{ height: radius.xl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
