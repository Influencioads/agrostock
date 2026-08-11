import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import type { ApiHireRequest, ApiMyServiceProfile } from '@agrotraders/api-client';
import { categoriesForRole, isServiceRole, SERVICE_PRICING_BASES } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { errMessage } from './order-parts';

/**
 * The service provider console — one component for all five roles.
 *
 * They differ only in which categories they may offer, which `categoriesForRole`
 * already encodes, so five near-identical dashboards would be five places to fix
 * the same bug. The role shows in the heading and scopes the category picker.
 */

/** The signed-in user's service role, or null if they hold none. */
function useServiceRole(): string | null {
  const { user } = useAuth();
  return [user?.role, ...(user?.roles ?? [])].find((r) => isServiceRole(r)) ?? null;
}

/* ── enquiries ──────────────────────────────────────────────────────────── */

/**
 * Customer enquiries, on the existing hire flow.
 *
 * Nothing here is new machinery: `/hires/incoming` plus accept/decline is what
 * transporters and loader companies have always used, so escrow, notifications
 * and invoicing behave identically for a packer.
 */
export function ServiceEnquiries() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { fmtCents } = useCurrency();
  const [error, setError] = useState('');

  const { data: hires = [], isLoading } = useQuery<ApiHireRequest[]>({
    queryKey: ['service-enquiries'],
    queryFn: () => api.hires.incoming(),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['service-enquiries'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
      action === 'accept' ? api.hires.accept(id) : api.hires.decline(id),
    onSuccess: refresh,
    onError: (e) => setError(errMessage(e, t('service.saveError'))),
  });

  const tone = (s: string) =>
    s === 'accepted' ? 'green' : s === 'declined' ? 'slate' : s === 'cancelled' ? 'slate' : 'warn';

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">{t('service.enquiries')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('service.enquiriesSub')}</p>
      </div>

      {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}

      {isLoading ? (
        <Card className="py-10 text-center text-ink-soft">{t('common:loading')}</Card>
      ) : hires.length === 0 ? (
        <Card className="py-12 text-center text-sm text-ink-soft">{t('service.noEnquiries')}</Card>
      ) : (
        <div className="space-y-3">
          {hires.map((h) => (
            <Card key={h.id} className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-bold text-ink">#{h.reference}</span>
                  <Badge tone={tone(h.status)}>{t(`service.${h.status}`, { defaultValue: h.status })}</Badge>
                </div>
                {h.message && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{h.message}</p>}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-soft">
                  {h.cargo && <span>{h.cargo}</span>}
                  {h.location && <span>📍 {h.location}</span>}
                  {h.neededDate && <span>{new Date(h.neededDate).toLocaleDateString()}</span>}
                  {h.budgetCents != null && <span className="font-semibold text-ink">{fmtCents(h.budgetCents)}</span>}
                </div>
              </div>
              {/* Only a pending enquiry is decidable — the API enforces the same,
                  so a stale tab cannot accept something already cancelled. */}
              {h.status === 'pending' && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: h.id, action: 'accept' })}>
                    {t('service.accept')}
                  </Button>
                  <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: h.id, action: 'decline' })}>
                    {t('service.decline')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── listing profile ────────────────────────────────────────────────────── */

/** What buyers see. Until `listed` is on, the provider is invisible in the directory. */
export function ServiceProfile() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const role = useServiceRole();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: profile } = useQuery<ApiMyServiceProfile>({
    queryKey: ['my-service-profile'],
    queryFn: () => api.services.myProfile(),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [cats, setCats] = useState<string[] | null>(null);
  /** Reads the edited value, falling back to what the server has. Keyed on the
   *  API shape so a typo is a type error, not a silently blank field. */
  const value = (k: keyof ApiMyServiceProfile, fallback = '') =>
    form[k] ?? (profile?.[k] == null ? fallback : String(profile[k]));
  /** Form-only field: the form edits whole currency units, the column is cents. */
  const priceFrom = form.priceFrom ?? (profile?.priceFromCents != null ? String(profile.priceFromCents / 100) : '');
  const categories = cats ?? profile?.categories ?? [];
  const offerable = categoriesForRole(role ?? '');

  const save = useMutation({
    mutationFn: () => {
      const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
      return api.services.updateMyProfile({
        companyName: value('companyName') || undefined,
        categories,
        citiesServed: value('citiesServed').split(',').map((c) => c.trim()).filter(Boolean),
        country: value('country') || undefined,
        capacityPerDay: num(value('capacityPerDay')),
        certifications: value('certifications').split(',').map((c) => c.trim()).filter(Boolean),
        minOrderQty: num(value('minOrderQty')),
        turnaroundDays: num(value('turnaroundDays')),
        pricingBasis: value('pricingBasis') || undefined,
        priceFromCents: priceFrom.trim() === '' ? undefined : Math.round(Number(priceFrom) * 100),
        blurb: value('blurb') || undefined,
      });
    },
    onSuccess: () => { setSaved(true); setError(''); qc.invalidateQueries({ queryKey: ['my-service-profile'] }); },
    onError: (e) => { setSaved(false); setError(errMessage(e, t('service.saveError'))); },
  });

  const toggleListed = useMutation({
    mutationFn: (listed: boolean) => api.services.updateMyProfile({ listed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-service-profile'] }),
    onError: (e) => setError(errMessage(e, t('service.saveError'))),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">{t('service.profileTitle')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('service.profileSub')}</p>
      </div>

      {/* Visibility first: it is the single thing that decides whether any of the
          rest of this form has an effect. */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-ink">
            <Icon name="shield" size={16} className={profile?.listed ? 'text-brand' : 'text-ink-soft'} />
            {profile?.listed ? t('service.listed') : t('service.notListed')}
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            {profile?.listed ? t('service.listedHint') : t('service.notListedHint')}
          </p>
        </div>
        <Button
          variant={profile?.listed ? 'outline' : 'accent'}
          disabled={toggleListed.isPending}
          onClick={() => toggleListed.mutate(!profile?.listed)}
        >
          {profile?.listed ? t('service.notListed') : t('service.listed')}
        </Button>
      </Card>

      <Card className="space-y-4">
        <Input label={t('console.productForm.name')} value={value('companyName')} onChange={set('companyName')} />

        {/* Scoped to the role: an accountant is never offered `blanching`, and the
            API narrows anything a stale client sends anyway. */}
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('service.categories')}</span>
          <div className="flex flex-wrap gap-2">
            {offerable.map((c) => {
              const on = categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCats(on ? categories.filter((x) => x !== c) : [...categories, c])}
                  className={
                    'rounded-full border px-3 py-1.5 text-sm font-semibold transition ' +
                    (on ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft hover:border-brand-leaf')
                  }
                >
                  {t(`enums:serviceCategory.${c}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t('service.cities')} placeholder="Bengaluru, Chennai" value={value('citiesServed')} onChange={set('citiesServed')} />
          <Input label={t('console.productForm.country')} value={value('country')} onChange={set('country')} />
          <Input label={t('service.capacity')} type="number" value={value('capacityPerDay')} onChange={set('capacityPerDay')} />
          <Input label={t('service.certifications')} placeholder="FSSAI, ISO 22000, HACCP" value={value('certifications')} onChange={set('certifications')} />
          <Input label={t('service.minOrder')} type="number" value={value('minOrderQty')} onChange={set('minOrderQty')} />
          <Input label={t('service.turnaround')} type="number" value={value('turnaroundDays')} onChange={set('turnaroundDays')} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('service.pricing')}</span>
            <select
              value={value('pricingBasis')}
              onChange={(e) => setForm((f) => ({ ...f, pricingBasis: e.target.value }))}
              className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-leaf"
            >
              <option value="">{t('service.onEnquiry')}</option>
              {SERVICE_PRICING_BASES.map((b) => (
                <option key={b} value={b}>{t(`enums:servicePricingBasis.${b}`)}</option>
              ))}
            </select>
          </label>
          <Input
            label={t('service.priceFrom', { amount: '', basis: '' }).trim() || t('service.pricing')}
            type="number"
            value={priceFrom}
            onChange={set('priceFrom')}
          />
        </div>

        <Input label={t('console.productForm.notes')} value={value('blurb')} onChange={set('blurb')} />

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        {saved && !error && <p className="text-sm font-semibold text-brand">{t('service.saved')}</p>}
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? t('console.transporter.saving') : t('service.save')}
        </Button>
      </Card>
    </div>
  );
}

/* ── dashboard ──────────────────────────────────────────────────────────── */

/** Landing screen: the numbers that matter, then straight into enquiries. */
export function ServiceProviderDashboard({ name }: { name: string }) {
  const { t } = useI18n();
  const role = useServiceRole();
  const { data: hires = [] } = useQuery<ApiHireRequest[]>({
    queryKey: ['service-enquiries'],
    queryFn: () => api.hires.incoming(),
  });
  const { data: profile } = useQuery<ApiMyServiceProfile>({
    queryKey: ['my-service-profile'],
    queryFn: () => api.services.myProfile(),
  });

  const count = (s: string) => hires.filter((h) => h.status === s).length;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink">
        {name} · {role ? t(`enums:serviceRole.${role}`) : t('service.providers')}
      </h1>

      {/* Not listed is the one thing worth interrupting for — nothing else on
          this screen can change until buyers can actually find them. */}
      {profile && !profile.listed && (
        <Card className="mt-4 border-mango-soft bg-mango-soft/30">
          <div className="font-display font-bold text-ink">{t('service.notListed')}</div>
          <p className="mt-0.5 text-sm text-ink-soft">{t('service.notListedHint')}</p>
        </Card>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['pending', 'accepted', 'declined'] as const).map((s) => (
          <Card key={s} className="text-center">
            <div className="font-display text-2xl font-extrabold text-ink">{count(s)}</div>
            <div className="text-sm text-ink-soft">{t(`service.${s}`)}</div>
          </Card>
        ))}
        <Card className="text-center">
          <div className="font-display text-2xl font-extrabold text-ink">{profile?.categories.length ?? 0}</div>
          <div className="text-sm text-ink-soft">{t('service.categories')}</div>
        </Card>
      </div>

      <div className="mt-8">
        <ServiceEnquiries />
      </div>
    </div>
  );
}
