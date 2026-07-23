import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { isPendingVerification, validateSignupPassword } from '@agrotraders/api-client';
import { ALL_COUNTRIES } from '@agrotraders/geo';
import { useAuth } from '../../auth/AuthProvider';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { Button, Card, Input, Screen, Txt } from '../../ui';
import { C, radius, space, type } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { SIGNUP_ROLES } from './signupRoles';
import { TagInput } from '../components/TagInput';
import { PickerField } from '../components/PickerSheet';

const COUNTRY_OPTIONS = ALL_COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` }));

const PROVIDER_ROLES = new Set(['transporter', 'loaderco', 'worker']);

/** Glyph per role, matching the prototype's role-card grid. */
const ROLE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  buyer: 'bag-handle-outline',
  seller: 'cube-outline',
  transporter: 'car-outline',
  loaderco: 'people-outline',
  worker: 'person-outline',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;
export function SignUp() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', country: '', role: 'buyer', phone: '', location: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
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
  // Set once the API says the account exists but still has to confirm its email.
  const [pendingEmail, setPendingEmail] = useState('');
  const [resent, setResent] = useState(false);
  // Drives the remote city search shared by the city field and the tag pickers.
  const [citySearch, setCitySearch] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setOp = (k: keyof typeof ops) => (v: string | string[]) => setOps((o) => ({ ...o, [k]: v }));

  // ~134k cities live on the API, not in the bundle - searched per country.
  const { data: cities = [], isFetching: citiesLoading } = useQuery({
    queryKey: ['geo-cities', form.country, citySearch],
    queryFn: () => api.geo.cities(form.country, citySearch || undefined),
    enabled: Boolean(form.country),
    staleTime: 3600e3,
    retry: 1,
  });
  const cityOptions = cities.map((c) => ({ value: c }));

  const isTransporter = form.role === 'transporter';
  const isLoaderco = form.role === 'loaderco';
  const isWorker = form.role === 'worker';
  const isProvider = PROVIDER_ROLES.has(form.role);

  async function submit() {
    setErr('');
    const passwordResult = validateSignupPassword(form.password, confirmPassword);
    if (passwordResult === 'too_short') {
      setErr(t('auth.signUp.passwordTooShort', { defaultValue: 'Password must be at least 8 characters.' }));
      return;
    }
    if (passwordResult === 'mismatch') {
      setErr(t('auth.signUp.passwordMismatch', { defaultValue: "Passwords don't match." }));
      return;
    }
    setBusy(true);
    const numOrUndef = (v: string) => {
      const n = Number(v);
      return v.trim() && Number.isFinite(n) ? n : undefined;
    };
    try {
      const result = await register({
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
      // With SMTP configured the account cannot sign in until it confirms its
      // address - the link opens the web app, then they sign in here.
      if (isPendingVerification(result)) {
        setPendingEmail(result.email);
        return;
      }
      if (nav.canGoBack()) nav.goBack();
      else nav.navigate('App');
    } catch {
      setErr(t('auth.signUp.error'));
    } finally {
      setBusy(false);
    }
  }

  if (pendingEmail) {
    return (
      <Screen>
        <Txt variant="h2">{t('auth.signUp.checkInboxTitle')}</Txt>
        <Card style={{ gap: 14 }}>
          <Txt color={C.inkSoft}>{t('auth.signUp.checkInboxBody', { email: pendingEmail })}</Txt>
          <Button
            title={resent ? t('auth.signUp.resent') : t('auth.signUp.resend')}
            variant="outline"
            full
            disabled={resent}
            onPress={async () => {
              // Always resolves - the endpoint never reveals whether the address exists.
              await api.auth.resendVerification(pendingEmail);
              setResent(true);
            }}
          />
          <Button title={t('auth.signIn.cta')} full onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('App'))} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Circular back affordance + display title + subline — the prototype's
          "Create account" header. */}
      {nav.canGoBack() ? (
        <Pressable onPress={() => nav.goBack()} hitSlop={8} style={s.back}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
      ) : null}
      <View style={{ gap: 4 }}>
        <Txt variant="display">{t('auth.signUp.cta')}</Txt>
        <Txt variant="body" color={C.inkSoft}>{t('auth.signUp.subtitle')}</Txt>
      </View>

      {/* Role picker — a two-column grid of icon cards, selected in light green. */}
      <View style={s.roleGrid}>
        {SIGNUP_ROLES.map((r) => {
          const active = form.role === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setForm((f) => ({ ...f, role: r.id }))}
              style={[s.roleCard, active ? s.roleCardActive : null]}
            >
              <Ionicons name={ROLE_ICON[r.id]} size={20} color={active ? C.green : C.inkSoft} />
              <Text style={[s.roleLabel, { color: active ? C.green : C.ink }]}>{t(`enums:role.${r.labelKey}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: space.lg }}>
        <Input label={t('auth.signUp.fullName')} placeholder={t('auth.signUp.fullNamePh')} value={form.name} onChangeText={set('name')} />
        <Input label={t('auth.signUp.email')} autoCapitalize="none" keyboardType="email-address" placeholder={t('auth.signUp.emailPh')} value={form.email} onChangeText={set('email')} />
        <Input label={t('auth.password')} secureTextEntry placeholder={t('auth.passwordPh')} value={form.password} onChangeText={set('password')} />
        <Input
          label={t('auth.signUp.confirmPassword', { defaultValue: 'Confirm password' })}
          secureTextEntry
          placeholder={t('auth.passwordPh')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={err === t('auth.signUp.passwordMismatch', { defaultValue: "Passwords don't match." }) ? err : undefined}
        />
        <PickerField
          label={t('auth.signUp.country')}
          placeholder={t('auth.signUp.countryPh')}
          value={form.country}
          displayValue={COUNTRY_OPTIONS.find((c) => c.value === form.country)?.label}
          options={COUNTRY_OPTIONS}
          // Cities belong to a country, so changing it invalidates the city pick.
          onChange={(v) => setForm((f) => ({ ...f, country: v, location: '' }))}
        />
        <PickerField
          label={t('auth.signUp.cityRegion')}
          placeholder={form.country ? t('auth.signUp.cityRegionPh') : t('auth.signUp.pickCountryFirst')}
          value={form.location}
          options={cityOptions}
          onChange={set('location')}
          onSearch={setCitySearch}
          loading={citiesLoading}
          disabled={!form.country}
          emptyLabel={t('auth.signUp.noCities')}
        />
        <Input label={t('auth.signUp.phone')} keyboardType="phone-pad" placeholder={t('auth.signUp.phonePh')} value={form.phone} onChangeText={set('phone')} />
        {isProvider ? (
          <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
            <View style={{ gap: 2 }}>
              <Txt variant="label">{t('pubX.dir.opsTitle')}</Txt>
              <Txt variant="small" color={C.inkSoft}>{t('pubX.dir.opsHint')}</Txt>
            </View>
            <TagInput label={t('pubX.dir.operatingCountries')} value={ops.operatingCountries} onChange={setOp('operatingCountries')} placeholder={t('pubX.ph.opCountries')} options={COUNTRY_OPTIONS} />
            <TagInput label={t('pubX.dir.operatingCities')} value={ops.operatingCities} onChange={setOp('operatingCities')} placeholder={t('pubX.ph.opCities')} options={form.country ? cityOptions : undefined} onSearch={setCitySearch} loading={citiesLoading} />
            {isTransporter || isLoaderco ? (
              <>
                <TagInput label={t('pubX.dir.supplyingCountries')} value={ops.supplyingCountries} onChange={setOp('supplyingCountries')} placeholder={t('pubX.ph.opCountries')} options={COUNTRY_OPTIONS} />
                <TagInput label={t('pubX.dir.supplyingCities')} value={ops.supplyingCities} onChange={setOp('supplyingCities')} placeholder={t('pubX.ph.supCities')} options={form.country ? cityOptions : undefined} onSearch={setCitySearch} loading={citiesLoading} />
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
      </View>

      <Button title={t('auth.signUp.cta')} full size="lg" loading={busy} disabled={!form.name || !form.email || !form.password || !confirmPassword} onPress={submit} />
      <Text style={s.terms}>{t('auth.signUp.terms')}</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  roleCard: {
    width: '47.5%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    height: 56,
  },
  roleCardActive: { borderColor: C.green, backgroundColor: C.surface },
  roleLabel: { ...type.title, fontSize: 15, color: C.ink },
  terms: { ...type.caption, color: C.inkMuted, textAlign: 'center', marginTop: 4 },
});
