import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';
import { Button, Card, Input, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { BrandLogo } from '../../ui/BrandLogo';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const DEMOS = ['buyer', 'seller', 'transporter', 'loaderco', 'worker'];

export function SignIn() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, marginTop: 12 }}>
        <BrandLogo size={64} glyphOnly />
        <Txt variant="h2">{t('auth.signIn.title')}</Txt>
        <Txt variant="muted">{t('auth.signIn.subtitle')}</Txt>
      </View>

      <Card style={{ gap: 14 }}>
        <Input label={t('auth.signIn.emailOrPhone')} autoCapitalize="none" placeholder={t('auth.signIn.emailOrPhonePh')} value={email} onChangeText={setEmail} />
        <Input label={t('auth.password')} secureTextEntry placeholder={t('auth.passwordPh')} value={password} onChangeText={setPassword} />
        {err ? <Txt color={C.error} variant="small">{err}</Txt> : null}
        <Button title={t('auth.signIn.cta')} full loading={busy === 'login'} disabled={!email || !password} onPress={() => run(() => login(email, password), 'login')} />
        <Row style={{ justifyContent: 'center' }} gap={4}>
          <Txt variant="muted">{t('auth.signIn.newHere')}</Txt>
          <Pressable onPress={() => nav.navigate('SignUp')}><Txt color={C.green} variant="small">{t('auth.signIn.createAccount')}</Txt></Pressable>
        </Row>
      </Card>

      <View style={{ gap: 10 }}>
        <Txt variant="muted" style={{ textAlign: 'center' }}>{t('auth.signIn.demoTitle')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {DEMOS.map((r) => (
            <Pressable
              key={r}
              onPress={() => run(() => loginDemo(r), r)}
              style={{ borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, opacity: busy === r ? 0.5 : 1 }}
            >
              <Txt variant="small" color={C.ink}>{t(`enums:role.${r}`)}</Txt>
            </Pressable>
          ))}
        </View>
        <Txt variant="muted" style={{ textAlign: 'center' }}>{t('auth.signIn.demoHint', { password: 'password123' })}</Txt>
      </View>
    </Screen>
  );
}
