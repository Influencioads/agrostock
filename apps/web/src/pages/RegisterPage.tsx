import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BrandMark, Button, Card, Combobox, Icon, Input, type IconName } from '@agrotraders/ui';
import { ALL_COUNTRIES } from '@agrotraders/geo';
import { isPendingVerification } from '@agrotraders/api-client';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../branding/BrandingProvider';
import { api } from '../lib/api';
import { useCityOptions } from '../lib/geo';
import { useI18n } from '../i18n';
import { TagInput } from '../components/TagInput';

/** Roles that fill in operational details (where they operate / supply, thresholds). */
const PROVIDER_ROLES = new Set(['transporter', 'loaderco', 'worker']);

// Self-registerable roles must match the API's PUBLIC_ROLES (admin is provisioned).
// Labels/descriptions are translated at render (console.role.<id> / page.register.roleDesc.<id>).
const roles: { id: string; icon: IconName }[] = [
  { id: 'buyer', icon: 'bag' },
  { id: 'seller', icon: 'store' },
  { id: 'transporter', icon: 'truck' },
  { id: 'loaderco', icon: 'worker' },
  { id: 'worker', icon: 'user' },
];

export function RegisterPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const { logoSrc } = useBranding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role');
  const initialRole = roles.some((r) => r.id === roleFromUrl) ? roleFromUrl! : 'buyer';

  const [form, setForm] = useState({ name: '', email: '', password: '', role: initialRole, country: '', phone: '', location: '', marketId: '' });
  const [ops, setOps] = useState({
    operatingCities: [] as string[],
    operatingCountries: [] as string[],
    supplyingCities: [] as string[],
    supplyingCountries: [] as string[],
    minWorkHours: '',
    minDistanceKm: '',
    minLoaders: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Set once the API says the account exists but still has to confirm its email.
  const [pendingEmail, setPendingEmail] = useState('');
  const [resent, setResent] = useState<'idle' | 'sending' | 'sent'>('idle');
  // Drafts drive the remote city search for the operating/supplying tag fields.
  const [cityDraft, setCityDraft] = useState('');

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => api.markets.list(),
    staleTime: 3600e3,
    retry: 1,
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // City lists are per-country and searched on the API. The signup city field
  // and the operating/supplying tag fields both hang off the chosen country.
  const { cities, loading: citiesLoading } = useCityOptions(form.country, form.location);
  const { cities: tagCities } = useCityOptions(form.country, cityDraft);
  const countryNames = ALL_COUNTRIES.map((c) => c.name);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError(t('page.register.pwTooShort'));
      return;
    }
    setBusy(true);
    try {
      const isProvider = PROVIDER_ROLES.has(form.role);
      const isTransporter = form.role === 'transporter';
      const isLoaderco = form.role === 'loaderco';
      const isWorker = form.role === 'worker';
      const numOrUndef = (v: string) => {
        const n = Number(v);
        return v.trim() && Number.isFinite(n) ? n : undefined;
      };
      const result = await register({
        ...form,
        phone: form.phone || undefined,
        location: form.location || undefined,
        marketId: form.marketId || undefined,
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
      // address, so we swap the form for a "check your inbox" panel instead.
      if (isPendingVerification(result)) {
        setPendingEmail(result.email);
        return;
      }
      // Otherwise registration signed the user in — land on the profile so
      // directories show them well.
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 409 ? t('page.register.emailTaken') : t('page.register.createFailed'));
    } finally {
      setBusy(false);
    }
  };

  const activeRole = roles.find((r) => r.id === form.role);

  const resend = async () => {
    setResent('sending');
    try {
      await api.auth.resendVerification(pendingEmail);
    } finally {
      // The endpoint never reveals whether the address exists, so there is
      // nothing to report either way — just confirm we sent the request.
      setResent('sent');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dock px-4 py-10">
      <div className="w-full max-w-xl">
        <Link to="/" className="mb-6 flex justify-center text-white">
          <BrandMark
            logoSrc={logoSrc}
            size="lg"
            suffixClassName="text-brand-leaf"
            glyphClassName="shadow-cta"
          />
        </Link>

        {pendingEmail ? (
          <Card className="p-7 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface text-brand-dark">
              <Icon name="message" size={22} />
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">
              {t('page.register.checkInboxTitle')}
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              {t('page.register.checkInboxBody', { email: pendingEmail })}
            </p>
            <div className="mt-5 space-y-3">
              <Button fullWidth variant="secondary" disabled={resent !== 'idle'} onClick={resend}>
                {resent === 'sent' ? t('page.register.resent') : t('page.register.resend')}
              </Button>
              <Link
                to="/login"
                className="block text-sm font-bold text-brand hover:text-brand-dark"
              >
                {t('common:signIn')}
              </Link>
            </div>
          </Card>
        ) : (
        <Card className="p-7">
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('page.register.title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('page.register.subtitle')}</p>

          {/* role picker */}
          <div className="mt-5">
            <span className="mb-2 block text-sm font-semibold text-ink">{t('page.register.registerAs')}</span>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((r) => {
                const selected = form.role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r.id }))}
                    aria-pressed={selected}
                    className={
                      'flex items-start gap-3 rounded-lg border p-3 text-start transition ' +
                      (selected
                        ? 'border-brand bg-brand-surface ring-1 ring-brand'
                        : 'border-surface-border bg-white hover:border-brand-leaf')
                    }
                  >
                    <span
                      className={
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md ' +
                        (selected ? 'bg-brand-gradient text-white' : 'bg-brand-surface text-brand-dark')
                      }
                    >
                      <Icon name={r.icon} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{t(`console.role.${r.id}`)}</span>
                      <span className="block text-xs text-ink-soft">{t(`page.register.roleDesc.${r.id}`)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Input
              label={t('page.register.fullName')}
              placeholder={activeRole?.id === 'buyer' ? 'Karim Trading' : 'Punjab Agro Exports'}
              value={form.name}
              onChange={set('name')}
              required
            />
            <Input label={t('page.register.email')} type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
            <Input
              label={t('page.register.password')}
              type="password"
              placeholder={t('page.register.passwordHint')}
              value={form.password}
              onChange={set('password')}
              required
            />
            {/* Two inputs side by side leave ~155px each on a phone, which
                truncates both the label and the placeholder. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">{t('page.register.country')}</span>
                <select
                  value={form.country}
                  // Cities belong to a country, so a country change invalidates
                  // whatever city was picked under the previous one.
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, location: '' }))}
                  className="h-11 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
                >
                  <option value="">{t('page.register.pickCountry')}</option>
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c.iso2} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <Combobox
                label={t('page.register.cityRegion')}
                placeholder={form.country ? t('page.register.phCity') : t('page.register.pickCountryFirst')}
                value={form.location}
                onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                options={cities}
                loading={citiesLoading}
                disabled={!form.country}
                // The API already filtered by the typed term — filtering again
                // locally would hide the tail of a 200-result page.
                filterLocally={false}
                emptyLabel={t('page.register.noCities')}
                hint={t('page.register.cityHint')}
              />
            </div>
            <Input
              label={t('page.register.phone')}
              placeholder="+91 98 7654 3210"
              value={form.phone}
              onChange={set('phone')}
            />
            {form.role === 'seller' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('page.register.yourMarket')}</span>
                <select
                  value={form.marketId}
                  onChange={set('marketId')}
                  className="h-10 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
                >
                  <option value="">{t('page.register.pickMarket')}</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.flag} {m.name} · {m.city}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {PROVIDER_ROLES.has(form.role) && (
              <div className="space-y-4 rounded-lg border border-surface-border bg-brand-surface/40 p-4">
                <div>
                  <span className="block text-sm font-bold text-ink">{t('page.register.opsTitle')}</span>
                  <span className="block text-xs text-ink-soft">{t('page.register.opsHint')}</span>
                </div>
                <TagInput
                  label={t('page.register.operatingCountries')}
                  value={ops.operatingCountries}
                  onChange={(v) => setOps((o) => ({ ...o, operatingCountries: v }))}
                  placeholder={t('page.register.phCountries')}
                  hint={t('page.register.tagHintPick')}
                  options={countryNames}
                />
                <TagInput
                  label={t('page.register.operatingCities')}
                  value={ops.operatingCities}
                  onChange={(v) => setOps((o) => ({ ...o, operatingCities: v }))}
                  placeholder={t('page.register.phCities')}
                  hint={form.country ? t('page.register.tagHintPick') : t('page.register.tagHint')}
                  options={tagCities}
                  onDraftChange={setCityDraft}
                />
                {(form.role === 'transporter' || form.role === 'loaderco') && (
                  <>
                    <TagInput
                      label={t('page.register.supplyingCountries')}
                      value={ops.supplyingCountries}
                      onChange={(v) => setOps((o) => ({ ...o, supplyingCountries: v }))}
                      placeholder={t('page.register.phCountries')}
                      hint={t('page.register.tagHintPick')}
                      options={countryNames}
                    />
                    <TagInput
                      label={t('page.register.supplyingCities')}
                      value={ops.supplyingCities}
                      onChange={(v) => setOps((o) => ({ ...o, supplyingCities: v }))}
                      placeholder={t('page.register.phPorts')}
                      hint={form.country ? t('page.register.tagHintPick') : t('page.register.tagHint')}
                      options={tagCities}
                      onDraftChange={setCityDraft}
                    />
                  </>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {form.role === 'transporter' && (
                    <Input
                      label={t('page.register.minDistanceKm')}
                      type="number"
                      min={0}
                      placeholder="50"
                      value={ops.minDistanceKm}
                      onChange={(e) => setOps((o) => ({ ...o, minDistanceKm: e.target.value }))}
                    />
                  )}
                  {(form.role === 'loaderco' || form.role === 'worker') && (
                    <Input
                      label={t('page.register.minWorkHours')}
                      type="number"
                      min={0}
                      placeholder="4"
                      value={ops.minWorkHours}
                      onChange={(e) => setOps((o) => ({ ...o, minWorkHours: e.target.value }))}
                    />
                  )}
                  {form.role === 'loaderco' && (
                    <Input
                      label={t('page.register.minLoaders')}
                      type="number"
                      min={0}
                      placeholder="5"
                      value={ops.minLoaders}
                      onChange={(e) => setOps((o) => ({ ...o, minLoaders: e.target.value }))}
                    />
                  )}
                </div>
              </div>
            )}

            {error && <p className="text-sm font-semibold text-status-error">{error}</p>}
            <Button type="submit" fullWidth disabled={busy} leftIcon={<Icon name="check" size={16} />}>
              {busy ? t('page.register.creating') : t('page.register.createAccount', { role: t(`console.role.${form.role}`) })}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-soft">
            {t('page.register.haveAccount')}{' '}
            <Link to="/login" className="font-bold text-brand hover:text-brand-dark">
              {t('common:signIn')}
            </Link>
          </p>
        </Card>
        )}
      </div>
    </div>
  );
}
