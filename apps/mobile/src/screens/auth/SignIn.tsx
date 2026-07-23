import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';
import { Button, Input, Row, Txt } from '../../ui';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { BrandTile } from '../../ui/BrandLogo';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const DEMOS = ['buyer', 'seller', 'transporter', 'loaderco', 'worker'];

export function SignIn() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  async function run(fn: () => Promise<unknown>, tag: string) {
    setErr('');
    setBusy(tag);
    try {
      await fn();
      if (nav.canGoBack()) nav.goBack();
      else nav.navigate('App');
    } catch (e) {
      // Admins are blocked on mobile (see AuthProvider.login) — show that message.
      setErr(e instanceof Error && e.message.includes('admin.agrotraders.org') ? e.message : t('auth.signIn.invalid'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space.xl, paddingTop: space.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Light page, brand tile above the greeting — the prototype's login
              header, rather than a full-bleed evergreen band. */}
          <BrandTile size={64} />
          <Text style={s.title}>{t('auth.signIn.title')}</Text>
          <Text style={s.subtitle}>{t('auth.signIn.subtitle')}</Text>

          <View style={s.form}>
            <Input
              label={t('auth.signIn.emailOrPhone')}
              icon="call-outline"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder={t('auth.signIn.emailOrPhonePh')}
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label={t('auth.password')}
              icon="lock-closed-outline"
              secureTextEntry={!showPw}
              placeholder={t('auth.passwordPh')}
              value={password}
              onChangeText={setPassword}
              trailing={
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.inkMuted} />
                </Pressable>
              }
            />
            {err ? <Txt color={C.error} variant="small">{err}</Txt> : null}
            <Button
              title={t('auth.signIn.cta')}
              full
              size="lg"
              loading={busy === 'login'}
              disabled={!email || !password}
              onPress={() => run(() => login(email, password), 'login')}
            />
            <Row style={{ justifyContent: 'space-between' }}>
              <Pressable onPress={() => nav.navigate('OtpSignIn')} hitSlop={8}>
                <Text style={s.link}>{t('auth.signIn.otp')}</Text>
              </Pressable>
              <Pressable onPress={() => nav.navigate('ForgotPassword')} hitSlop={8}>
                <Text style={s.linkMuted}>{t('auth.signIn.forgot')}</Text>
              </Pressable>
            </Row>
            <Row style={{ justifyContent: 'center', marginTop: space.xs }} gap={5}>
              <Txt variant="muted">{t('auth.signIn.newHere')}</Txt>
              <Pressable onPress={() => nav.navigate('SignUp')} hitSlop={8}>
                <Text style={s.link}>{t('auth.signIn.createAccount')}</Text>
              </Pressable>
            </Row>
          </View>

          <View style={s.demo}>
            <Text style={[s.demoTitle, microLabel()]}>{t('auth.signIn.demoTitle')}</Text>
            <View style={s.demoRow}>
              {DEMOS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => run(() => loginDemo(r), r)}
                  style={[s.demoChip, busy === r && { opacity: 0.5 }]}
                >
                  <Text style={s.demoChipText}>{t(`enums:role.${r}`)}</Text>
                </Pressable>
              ))}
            </View>
            <Txt variant="muted" style={{ textAlign: 'center' }}>
              {t('auth.signIn.demoHint', { password: 'password123' })}
            </Txt>
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
  linkMuted: { ...type.body, fontSize: 14, color: C.inkSoft },
  demo: { marginTop: space.xxl, gap: space.md, alignItems: 'center' },
  demoTitle: { ...type.micro, color: C.inkMuted },
  demoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  demoChip: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  demoChipText: { ...type.caption, color: C.ink },
});
