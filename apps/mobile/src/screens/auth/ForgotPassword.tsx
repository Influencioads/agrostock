import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';
import { Button, Input, Txt } from '../../ui';
import { C, space, type } from '../../theme/tokens';
import { BrandTile } from '../../ui/BrandLogo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Request a password-reset link. The link is opened on the web app to set a new password. */
export function ForgotPassword() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BrandTile size={64} />
          <Text style={s.title}>{t('auth.forgotPassword.title')}</Text>
          <Text style={s.subtitle}>{t('auth.forgotPassword.subtitle')}</Text>

          <View style={s.form}>
            {sent ? (
              <View style={s.notice}>
                <Txt>{t('auth.forgotPassword.sent')}</Txt>
              </View>
            ) : (
              <>
                <Input
                  label={t('auth.forgotPassword.email')}
                  icon="mail-outline"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <Button
                  title={busy ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.send')}
                  full
                  size="lg"
                  loading={busy}
                  disabled={!email}
                  onPress={() => void submit()}
                />
              </>
            )}
            <Pressable onPress={() => nav.goBack()} hitSlop={8} style={{ alignSelf: 'center', marginTop: space.sm }}>
              <Text style={s.link}>{t('auth.forgotPassword.back')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  title: { ...type.display, color: C.ink, marginTop: space.lg },
  subtitle: { ...type.body, fontSize: 15, color: C.inkSoft, marginTop: 4 },
  form: { marginTop: space.xxl, gap: space.lg },
  link: { ...type.title, fontSize: 14, color: C.green },
  notice: { backgroundColor: C.surface, borderRadius: 12, padding: space.lg },
});
