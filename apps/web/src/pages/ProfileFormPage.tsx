import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import { GMT_OFFSETS, normalizeGmt } from '@agrotraders/geo';
import type { ApiMarket } from '@agrotraders/api-client';
import { api, assetUrl } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import { TagInput } from '../components/TagInput';

/**
 * Upload a real profile photo. The server re-encodes it to WebP under
 * `/uploads/avatars/` and returns the public path.
 */
function AvatarUpload({ name, avatarUrl, onUploaded }: { name: string; avatarUrl?: string | null; onUploaded: () => void }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | undefined>(undefined);

  const src = preview ?? assetUrl(avatarUrl);

  const pick = async (file: File) => {
    setError('');
    setBusy(true);
    // Optimistic local preview so the swap feels instant on slow uploads.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      await api.me.uploadAvatar(file);
      onUploaded();
    } catch (e) {
      setPreview(undefined);
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || t('page.profileForm.uploadError'));
    } finally {
      URL.revokeObjectURL(localUrl);
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('page.profileForm.profilePhoto')}</span>
      <div className="flex items-center gap-3">
        {src ? (
          <img src={src} alt={name} className="h-16 w-16 rounded-full border border-surface-border object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-surface font-display text-xl font-bold text-brand-dark">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? t('page.profileForm.uploading') : src ? t('page.profileForm.changePhoto') : t('page.profileForm.uploadPhoto')}
          </Button>
          <p className="mt-1 text-xs text-ink-soft">{t('page.profileForm.photoHint')}</p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
          e.target.value = '';
        }}
      />
      {error && <p className="mt-1 text-xs font-semibold text-status-error">{error}</p>}
    </div>
  );
}

/**
 * Extended profile form (also embedded in the console as the "Profile"
 * section). Contact fields are stored privately: only admins ever see them in
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
  // Operational fields (transporters / loader companies). Worker location lives on
  // the Worker row and is captured at sign-up, so it isn't edited here.
  const [ops, setOps] = useState({
    operatingCities: [] as string[],
    operatingCountries: [] as string[],
    supplyingCities: [] as string[],
    supplyingCountries: [] as string[],
    minWorkHours: '', minDistanceKm: '', minLoaders: '',
  });
  const isTransporter = roles.includes('transporter');
  const isLoaderco = roles.includes('loaderco');
  const showOps = isTransporter || isLoaderco;

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
    setOps({
      operatingCities: profile.operatingCities ?? [],
      operatingCountries: profile.operatingCountries ?? [],
      supplyingCities: profile.supplyingCities ?? [],
      supplyingCountries: profile.supplyingCountries ?? [],
      minWorkHours: profile.minWorkHours != null ? String(profile.minWorkHours) : '',
      minDistanceKm: profile.minDistanceKm != null ? String(profile.minDistanceKm) : '',
      minLoaders: profile.minLoaders != null ? String(profile.minLoaders) : '',
    });
  }, [profile]);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setSaved(false);
    setF((p) => ({ ...p, [k]: e.target.value }));
  };

  const setOpsField = <K extends keyof typeof ops>(k: K, v: (typeof ops)[K]) => {
    setSaved(false);
    setOps((p) => ({ ...p, [k]: v }));
  };

  const save = async () => {
    setError('');
    const numOrUndef = (v: string) => {
      const n = Number(v);
      return v.trim() && Number.isFinite(n) ? n : undefined;
    };
    const opsPayload = showOps
      ? {
          // Keep structured origin in step with the free-text "where from".
          originCity: f.location || undefined,
          operatingCities: ops.operatingCities,
          operatingCountries: ops.operatingCountries,
          supplyingCities: ops.supplyingCities,
          supplyingCountries: ops.supplyingCountries,
          ...(isLoaderco && {
            minWorkHours: numOrUndef(ops.minWorkHours),
            minLoaders: numOrUndef(ops.minLoaders),
          }),
          ...(isTransporter && { minDistanceKm: numOrUndef(ops.minDistanceKm) }),
        }
      : {};
    try {
      await api.me.updateProfile({
        ...(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')) as Partial<typeof f>),
        ...opsPayload,
      });
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || t('page.profileForm.saveError'));
    }
  };

  if (isLoading) return <Card className="py-14 text-center text-ink-soft">{t('page.profile.loading')}</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Icon name="user" size={18} /> {t('page.profileForm.publicProfile')}
        </h3>
        <p className="mt-0.5 text-sm text-ink-soft">{t('page.profileForm.publicSub')}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('page.profileForm.about')}</span>
            <textarea value={f.bio} onChange={set('bio')} rows={2} placeholder={t('page.profileForm.aboutPlaceholder')} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-leaf" />
          </label>
          <Input label={t('page.profileForm.whereFrom')} placeholder={t('page.profileForm.phLocation')} value={f.location} onChange={set('location')} />
          <AvatarUpload
            name={user?.name ?? t('page.profileForm.youFallback')}
            avatarUrl={profile?.avatarUrl}
            onUploaded={() => qc.invalidateQueries({ queryKey: ['my-profile'] })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('page.profileForm.availableFrom')} type="time" value={f.availableFrom} onChange={set('availableFrom')} />
            <Input label={t('page.profileForm.until')} type="time" value={f.availableTo} onChange={set('availableTo')} />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('page.profileForm.timezone')}</span>
            <select
              // normalizeGmt snaps legacy free-text ("GMT+05:30", "UTC+5:30") onto
              // a list value, so an existing profile shows its zone instead of blank.
              value={normalizeGmt(f.timezone)}
              onChange={set('timezone')}
              className="h-11 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
            >
              <option value="">{t('page.profileForm.pickTimezone')}</option>
              {GMT_OFFSETS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <Input label={t('page.profileForm.languages')} placeholder="EN · HI · PA" value={f.languages} onChange={set('languages')} />
          {roles.includes('seller') && (
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('page.profileForm.yourMarket')}</span>
              <select value={f.marketId} onChange={set('marketId')} className="h-10 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink">
                <option value="">{t('page.register.pickMarket')}</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.flag} {m.name} · {m.city}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </Card>

      {showOps && (
        <Card>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Icon name="mapPin" size={18} /> {t('page.register.opsTitle')}
          </h3>
          <p className="mt-0.5 text-sm text-ink-soft">{t('page.register.opsHint')}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TagInput
              label={t('page.register.operatingCountries')}
              value={ops.operatingCountries}
              onChange={(v) => setOpsField('operatingCountries', v)}
              placeholder={t('page.register.phCountries')}
              hint={t('page.register.tagHint')}
            />
            <TagInput
              label={t('page.register.operatingCities')}
              value={ops.operatingCities}
              onChange={(v) => setOpsField('operatingCities', v)}
              placeholder={t('page.register.phCities')}
              hint={t('page.register.tagHint')}
            />
            <TagInput
              label={t('page.register.supplyingCountries')}
              value={ops.supplyingCountries}
              onChange={(v) => setOpsField('supplyingCountries', v)}
              placeholder={t('page.register.phCountries')}
              hint={t('page.register.tagHint')}
            />
            <TagInput
              label={t('page.register.supplyingCities')}
              value={ops.supplyingCities}
              onChange={(v) => setOpsField('supplyingCities', v)}
              placeholder={t('page.register.phPorts')}
              hint={t('page.register.tagHint')}
            />
            {isTransporter && (
              <Input
                label={t('page.register.minDistanceKm')}
                type="number"
                min={0}
                placeholder="50"
                value={ops.minDistanceKm}
                onChange={(e) => setOpsField('minDistanceKm', e.target.value)}
              />
            )}
            {isLoaderco && (
              <>
                <Input
                  label={t('page.register.minWorkHours')}
                  type="number"
                  min={0}
                  placeholder="4"
                  value={ops.minWorkHours}
                  onChange={(e) => setOpsField('minWorkHours', e.target.value)}
                />
                <Input
                  label={t('page.register.minLoaders')}
                  type="number"
                  min={0}
                  placeholder="5"
                  value={ops.minLoaders}
                  onChange={(e) => setOpsField('minLoaders', e.target.value)}
                />
              </>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Icon name="shield" size={18} /> {t('page.profileForm.privateContact')}
        </h3>
        <p className="mt-0.5 text-sm text-ink-soft">
          <Badge tone="green" className="me-1.5">{t('page.profileForm.adminOnly')}</Badge>
          {t('page.profileForm.privateSub')}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label={t('page.profileForm.phone')} placeholder="+971 50 123 4567" value={f.phone} onChange={set('phone')} />
          <Input label={t('page.profileForm.whatsapp')} placeholder="+971 50 123 4567" value={f.whatsapp} onChange={set('whatsapp')} />
          <Input label={t('page.profileForm.contactEmail')} type="email" placeholder="trade@company.com" value={f.contactEmail} onChange={set('contactEmail')} />
        </div>
      </Card>

      {error && <p className="text-sm font-semibold text-status-error">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={save} leftIcon={<Icon name="check" size={16} />}>{t('page.profileForm.saveProfile')}</Button>
        {saved && <span className="text-sm font-semibold text-status-success">✓ {t('page.profileForm.saved')}</span>}
      </div>
    </div>
  );
}

/** Standalone /onboarding route wrapper. */
export function ProfileFormPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <h1 className="mb-1 min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.profileForm.completeTitle')}</h1>
      <p className="mb-6 text-ink-soft">{t('page.profileForm.completeSub')}</p>
      <ProfileForm />
    </div>
  );
}
