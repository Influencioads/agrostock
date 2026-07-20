import { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiMarket } from '@agrotraders/api-client';
import { api, assetUrl } from '../lib/api';
import { errMessage } from '../lib/format';
import { useAuth } from '../auth/AuthProvider';
import { Avatar, Badge, Button, Card, Chip, Input, Loading, Row, Txt } from '../ui';
import { C, space } from '../theme/tokens';
import { useI18n } from '../i18n';

/**
 * Upload a real profile photo. The server re-encodes it to WebP under
 * `/uploads/avatars/` and returns the public path. Reuses the same picker +
 * `{uri,name,type}` multipart flow as the seller's product images.
 */
function AvatarUpload({ name, avatarUrl, onUploaded }: { name: string; avatarUrl?: string | null; onUploaded: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const src = assetUrl(avatarUrl);

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t('compX.profile.photoPermission')); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [1, 1] });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setError('');
    setBusy(true);
    try {
      await api.me.uploadAvatar({
        uri: asset.uri,
        name: asset.fileName || asset.uri.split('/').pop() || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      onUploaded();
    } catch (e) {
      setError(errMessage(e, t('compX.profile.uploadFailed')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Txt variant="label">{t('compX.profile.photoLabel')}</Txt>
      <Row gap={12}>
        {src ? (
          <Image source={{ uri: src }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: C.border }} />
        ) : (
          <Avatar name={name} size={64} />
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Button title={busy ? t('compX.profile.uploading') : src ? t('compX.profile.changePhoto') : t('compX.profile.uploadPhoto')} size="sm" variant="outline" disabled={busy} onPress={pick} />
          <Txt variant="muted">{t('compX.profile.photoHint')}</Txt>
        </View>
      </Row>
      {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
    </View>
  );
}

/**
 * Extended profile form. Contact fields are private — only admins see them in
 * full; directories show masked hints and users connect via chat.
 */
export function ProfileForm() {
  const { t } = useI18n();
  const { roles, user } = useAuth();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({
    bio: '', location: '', availableFrom: '', availableTo: '', timezone: '', languages: '',
    avatarEmoji: '', marketId: '', phone: '', whatsapp: '', contactEmail: '',
  });

  const { data: profile, isLoading } = useQuery({ queryKey: ['my-profile'], queryFn: () => api.me.profile() });
  const { data: markets = [] } = useQuery<ApiMarket[]>({ queryKey: ['markets'], queryFn: () => api.markets.list(), staleTime: 3600e3 });

  useEffect(() => {
    if (!profile) return;
    setF({
      bio: profile.bio ?? '',
      location: profile.location ?? '',
      availableFrom: profile.availableFrom ?? '',
      availableTo: profile.availableTo ?? '',
      timezone: profile.timezone ?? '',
      languages: profile.languages ?? '',
      avatarEmoji: profile.avatarEmoji ?? '',
      marketId: (profile.market?.id ?? profile.marketId ?? '') as string,
      phone: profile.phone ?? '',
      whatsapp: profile.whatsapp ?? '',
      contactEmail: profile.contactEmail ?? '',
    });
  }, [profile]);

  const set = (k: keyof typeof f) => (v: string) => {
    setSaved(false);
    setF((p) => ({ ...p, [k]: v }));
  };

  const save = async () => {
    setError('');
    try {
      await api.me.updateProfile(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')) as Partial<typeof f>);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || t('compX.profile.saveError'));
    }
  };

  if (isLoading) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading label={t('compX.profile.loading')} /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <Txt variant="h3">{t('compX.profile.publicTitle')}</Txt>
        <Txt variant="muted">{t('compX.profile.publicSub')}</Txt>
        <Input label={t('compX.profile.about')} placeholder={t('compX.profile.aboutPlaceholder')} value={f.bio} onChangeText={set('bio')} multiline />
        <Input label={t('compX.profile.from')} placeholder={t('pubX.ph.locationAmritsarIndia')} value={f.location} onChangeText={set('location')} />
        <AvatarUpload
          name={user?.name ?? t('compX.bid.you')}
          avatarUrl={profile?.avatarUrl}
          onUploaded={() => qc.invalidateQueries({ queryKey: ['my-profile'] })}
        />
        <Row gap={10}>
          <View style={{ flex: 1 }}><Input label={t('compX.profile.availableFrom')} placeholder="08:00" value={f.availableFrom} onChangeText={set('availableFrom')} /></View>
          <View style={{ flex: 1 }}><Input label={t('compX.profile.until')} placeholder="20:00" value={f.availableTo} onChangeText={set('availableTo')} /></View>
        </Row>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Input label={t('compX.profile.timezone')} placeholder="GMT+5:30" value={f.timezone} onChangeText={set('timezone')} /></View>
          <View style={{ flex: 1 }}><Input label={t('compX.profile.languages')} placeholder="EN · HI" value={f.languages} onChangeText={set('languages')} /></View>
        </Row>
        {roles.includes('seller') && (
          <View style={{ gap: 6 }}>
            <Txt variant="label">{t('compX.profile.yourMarket')}</Txt>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {markets.map((m) => (
                <Chip key={m.id} label={`${m.flag} ${m.name}`} active={f.marketId === m.id} onPress={() => { setSaved(false); setF((p) => ({ ...p, marketId: m.id })); }} />
              ))}
            </Row>
          </View>
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <Row gap={8}>
          <Txt variant="h3">{t('compX.profile.privateTitle')}</Txt>
          <Badge label={t('compX.profile.adminOnly')} tone="green" />
        </Row>
        <Txt variant="muted">{t('compX.profile.privateSub')}</Txt>
        <Input label={t('compX.profile.phone')} placeholder="+971 50 123 4567" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
        <Input label={t('compX.profile.whatsapp')} placeholder="+971 50 123 4567" keyboardType="phone-pad" value={f.whatsapp} onChangeText={set('whatsapp')} />
        <Input label={t('compX.profile.contactEmail')} autoCapitalize="none" keyboardType="email-address" placeholder="trade@company.com" value={f.contactEmail} onChangeText={set('contactEmail')} />
      </Card>

      {error ? <Txt color={C.error} variant="small">{error}</Txt> : null}
      <Button title={saved ? t('compX.profile.saved') : t('compX.profile.save')} icon="checkmark" full onPress={save} />
    </ScrollView>
  );
}
