import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Button, Card, Chip, Input, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { SIGNUP_ROLES } from './signupRoles';
import { TagInput } from '../components/TagInput';

const PROVIDER_ROLES = new Set(['transporter', 'loaderco', 'worker']);

type Nav = NativeStackNavigationProp<RootStackParamList>;
export function SignUp() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', country: '', role: 'buyer', phone: '', location: '' });
  const [ops, setOps] = useState({
    operatingCities: [] as string[],
    operatingCountries: [] as string[],
    supplyingCities: [] as string[],
    supplyingCountries: [] as string[],
    minWorkHours: '',
    minDistanceKm: '',
    minLoaders: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setOp = (k: keyof typeof ops) => (v: string | string[]) => setOps((o) => ({ ...o, [k]: v }));

  const isTransporter = form.role === 'transporter';
  const isLoaderco = form.role === 'loaderco';
  const isWorker = form.role === 'worker';
  const isProvider = PROVIDER_ROLES.has(form.role);

  async function submit() {
    setErr('');
    setBusy(true);
    const numOrUndef = (v: string) => {
      const n = Number(v);
      return v.trim() && Number.isFinite(n) ? n : undefined;
    };
    try {
      await register({
        ...form,
        phone: form.phone || undefined,
        location: form.location || undefined,
        // The generic country / city-region inputs double as the provider's home base.
        ...(isProvider && {
          originCity: form.location || undefined,
          originCountry: form.country || undefined,
          operatingCities: ops.operatingCities,
          operatingCountries: ops.operatingCountries,
        }),
        ...((isTransporter || isLoaderco) && {
          supplyingCities: ops.supplyingCities,
          supplyingCountries: ops.supplyingCountries,
        }),
        ...((isLoaderco || isWorker) && { minWorkHours: numOrUndef(ops.minWorkHours) }),
        ...(isTransporter && { minDistanceKm: numOrUndef(ops.minDistanceKm) }),
        ...(isLoaderco && { minLoaders: numOrUndef(ops.minLoaders) }),
      });
      if (nav.canGoBack()) nav.goBack();
      else nav.navigate('App');
    } catch {
      setErr(t('auth.signUp.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Txt variant="h2">{t('auth.signUp.title')}</Txt>
      <Card style={{ gap: 14 }}>
        <Input label={t('auth.signUp.fullName')} placeholder={t('auth.signUp.fullNamePh')} value={form.name} onChangeText={set('name')} />
        <Input label={t('auth.signUp.email')} autoCapitalize="none" keyboardType="email-address" placeholder={t('auth.signUp.emailPh')} value={form.email} onChangeText={set('email')} />
        <Input label={t('auth.password')} secureTextEntry placeholder={t('auth.passwordPh')} value={form.password} onChangeText={set('password')} />
        <Input label={t('auth.signUp.country')} placeholder={t('auth.signUp.countryPh')} value={form.country} onChangeText={set('country')} />
        <Input label={t('auth.signUp.cityRegion')} placeholder={t('auth.signUp.cityRegionPh')} value={form.location} onChangeText={set('location')} />
        <Input label={t('auth.signUp.phone')} keyboardType="phone-pad" placeholder={t('auth.signUp.phonePh')} value={form.phone} onChangeText={set('phone')} />
        <View style={{ gap: 8 }}>
          <Txt variant="label">{t('auth.signUp.iAmA')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SIGNUP_ROLES.map((r) => {
              const active = form.role === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setForm((f) => ({ ...f, role: r.id }))}
                  style={{
                    width: '48%',
                    borderWidth: 1,
                    borderColor: active ? C.green : C.border,
                    backgroundColor: active ? C.mint : C.white,
                    borderRadius: 12,
                    padding: 10,
                    gap: 4,
                  }}
                >
                  <Chip label={t(`enums:role.${r.labelKey}`)} active={active} />
                  <Txt variant="small" color={C.inkSoft}>{t(`auth.roleHelper.${r.id}`)}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
        {isProvider ? (
          <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
            <View style={{ gap: 2 }}>
              <Txt variant="label">{t('pubX.dir.opsTitle')}</Txt>
              <Txt variant="small" color={C.inkSoft}>{t('pubX.dir.opsHint')}</Txt>
            </View>
            <TagInput label={t('pubX.dir.operatingCountries')} value={ops.operatingCountries} onChange={setOp('operatingCountries')} placeholder={t('pubX.ph.opCountries')} />
            <TagInput label={t('pubX.dir.operatingCities')} value={ops.operatingCities} onChange={setOp('operatingCities')} placeholder={t('pubX.ph.opCities')} />
            {isTransporter || isLoaderco ? (
              <>
                <TagInput label={t('pubX.dir.supplyingCountries')} value={ops.supplyingCountries} onChange={setOp('supplyingCountries')} placeholder={t('pubX.ph.opCountries')} />
                <TagInput label={t('pubX.dir.supplyingCities')} value={ops.supplyingCities} onChange={setOp('supplyingCities')} placeholder={t('pubX.ph.supCities')} />
              </>
            ) : null}
            {isTransporter ? (
              <Input label={t('pubX.dir.opsMinDistance')} keyboardType="number-pad" placeholder="50" value={ops.minDistanceKm} onChangeText={setOp('minDistanceKm') as (v: string) => void} />
            ) : null}
            {isLoaderco || isWorker ? (
              <Input label={t('pubX.dir.opsMinHours')} keyboardType="number-pad" placeholder="4" value={ops.minWorkHours} onChangeText={setOp('minWorkHours') as (v: string) => void} />
            ) : null}
            {isLoaderco ? (
              <Input label={t('pubX.dir.opsMinLoaders')} keyboardType="number-pad" placeholder="5" value={ops.minLoaders} onChangeText={setOp('minLoaders') as (v: string) => void} />
            ) : null}
          </View>
        ) : null}
        {err ? <Txt color={C.error} variant="small">{err}</Txt> : null}
        <Button title={t('auth.signUp.cta')} full loading={busy} disabled={!form.name || !form.email || !form.password} onPress={submit} />
      </Card>
    </Screen>
  );
}
