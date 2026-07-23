import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthProvider';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';
import { Button, Input, Txt } from '../../ui';
import { C, space, type } from '../../theme/tokens';
import { BrandTile } from '../../ui/BrandLogo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Passwordless sign-in: request an emailed 6-digit code, then verify it. */
export function OtpSignIn() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { verifyOtp } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function requestCode() {
    setErr('');
    setBusy(true);
    try {
      await api.auth.requestOtp(email);
      setStep('code');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setErr('');
    setBusy(true);
    try {
      await verifyOtp(email, code.trim());
      if (nav.canGoBack()) nav.goBack();
      else nav.navigate('App');
    } catch (e) {
      setErr(e instanceof Error && e.message.includes('admin.agrotraders.org') ? e.message : t('auth.otpLogin.invalid'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BrandTile size={64} />
          <Text style={s.title}>{t('auth.otpLogin.title')}</Text>
          <Text style={s.subtitle}>{step === 'email' ? t('auth.otpLogin.subtitle') : t('auth.otpLogin.codeSent')}</Text>

          <View style={s.form}>
            {step === 'email' ? (
              <>
                <Input
                  label={t('auth.otpLogin.email')}
                  icon="mail-outline"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <Button
                  title={busy ? t('auth.otpLogin.sending') : t('auth.otpLogin.sendCode')}
                  full
                  size="lg"
                  loading={busy}
                  disabled={!email}
                  onPress={() => void requestCode()}
                />
              </>
            ) : (
              <>
                <Input
                  label={t('auth.otpLogin.code')}
                  icon="lock-closed-outline"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))}
                />
                {err ? <Txt color={C.error} variant="small">{err}</Txt> : null}
                <Button
                  title={busy ? t('auth.otpLogin.verifying') : t('auth.otpLogin.verify')}
                  full
                  size="lg"
                  loading={busy}
                  disabled={code.length < 6}
                  onPress={() => void verify()}
                />
                <Pressable onPress={() => void requestCode()} hitSlop={8} style={{ alignSelf: 'center' }}>
                  <Text style={s.link}>{t('auth.otpLogin.resend')}</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={() => nav.goBack()} hitSlop={8} style={{ alignSelf: 'center', marginTop: space.sm }}>
              <Text style={s.link}>{t('auth.otpLogin.usePassword')}</Text>
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
});
