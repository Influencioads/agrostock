import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiHireRequest, ApiMyServiceProfile } from '@agrotraders/api-client';
import { categoriesForRole, isServiceRole, SERVICE_PRICING_BASES } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, Chip, EmptyState, Input, Row, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { PickerField } from '../components/PickerSheet';

/**
 * The service provider console — one set of screens for all five roles, matching
 * the web console section for section.
 *
 * The roles differ only in which categories they may offer, which
 * `categoriesForRole` already encodes, so five near-identical screens would be
 * five places to fix the same bug. `ROLE_ALIAS` in sectionRegistryKeys.ts is what
 * points every service role at these.
 */

/** The signed-in user's service role, or null if they hold none. */
function useServiceRole(): string | null {
  const { user } = useAuth();
  return [user?.role, ...(user?.roles ?? [])].find((r) => isServiceRole(r)) ?? null;
}

/** The API's message if it sent one, else the caller's fallback. */
function errText(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

/* ── enquiries ──────────────────────────────────────────────────────────── */

/**
 * Customer enquiries, on the existing hire flow.
 *
 * Nothing here is new machinery: `/hires/incoming` plus accept/decline is what
 * transporters and loading companies have always used, so escrow, notifications
 * and invoicing behave identically for a packer.
 */
export function ServiceEnquiries() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { fmtCents } = useCurrency();

  const { data: hires = [], isLoading } = useQuery<ApiHireRequest[]>({
    queryKey: ['service-enquiries'],
    queryFn: () => api.hires.incoming(),
  });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
      action === 'accept' ? api.hires.accept(id) : api.hires.decline(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-enquiries'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const tone = (s: string) => (s === 'accepted' ? 'green' : s === 'pending' ? 'mango' : 'slate');

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }}>
      <View>
        <Txt variant="title">{t('service.enquiries')}</Txt>
        <Txt variant="muted">{t('service.enquiriesSub')}</Txt>
      </View>

      {decide.error ? <Txt style={{ color: C.error }}>{errText(decide.error, t('service.saveError'))}</Txt> : null}

      {isLoading ? (
        <SkeletonRows />
      ) : hires.length === 0 ? (
        <EmptyState icon="mail-outline" title={t('service.noEnquiries')} />
      ) : (
        hires.map((h) => (
          <Card key={h.id} style={{ gap: 8 }}>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              <Txt variant="title" style={{ flex: 1 }}>#{h.reference}</Txt>
              <Badge label={t(`service.${h.status}`, { defaultValue: h.status })} tone={tone(h.status)} />
            </Row>
            {h.message ? <Txt variant="muted">{h.message}</Txt> : null}
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              {h.cargo ? <Txt variant="small">{h.cargo}</Txt> : null}
              {h.location ? <Txt variant="small">📍 {h.location}</Txt> : null}
              {h.neededDate ? <Txt variant="small">{new Date(h.neededDate).toLocaleDateString()}</Txt> : null}
              {h.budgetCents != null ? <Txt variant="title">{fmtCents(h.budgetCents)}</Txt> : null}
            </Row>
            {/* Only a pending enquiry is decidable — the API enforces the same, so
                a stale screen cannot accept something already cancelled. */}
            {h.status === 'pending' ? (
              <Row gap={8}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('service.accept')}
                    size="sm"
                    full
                    disabled={decide.isPending}
                    onPress={() => decide.mutate({ id: h.id, action: 'accept' })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('service.decline')}
                    size="sm"
                    variant="outline"
                    full
                    disabled={decide.isPending}
                    onPress={() => decide.mutate({ id: h.id, action: 'decline' })}
                  />
                </View>
              </Row>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

/* ── listing profile ────────────────────────────────────────────────────── */

/** What buyers see. Until `listed` is on, the provider is invisible in the directory. */
export function ServiceProfile() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const role = useServiceRole();

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-service-profile'] });
  const save = useMutation({
    mutationFn: () => {
      const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
      const csv = (v: string) => v.split(',').map((c) => c.trim()).filter(Boolean);
      return api.services.updateMyProfile({
        companyName: value('companyName') || undefined,
        categories,
        citiesServed: csv(value('citiesServed')),
        country: value('country') || undefined,
        capacityPerDay: num(value('capacityPerDay')),
        certifications: csv(value('certifications')),
        minOrderQty: num(value('minOrderQty')),
        turnaroundDays: num(value('turnaroundDays')),
        pricingBasis: value('pricingBasis') || undefined,
        priceFromCents: priceFrom.trim() === '' ? undefined : Math.round(Number(priceFrom) * 100),
        blurb: value('blurb') || undefined,
      });
    },
    onSuccess: invalidate,
  });
  const toggleListed = useMutation({
    mutationFn: (listed: boolean) => api.services.updateMyProfile({ listed }),
    onSuccess: invalidate,
  });

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const field = (label: string, key: keyof ApiMyServiceProfile & string, numeric = false) => (
    <Input label={label} value={value(key)} onChangeText={set(key)} keyboardType={numeric ? 'number-pad' : 'default'} />
  );

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: 14 }}>
      <View>
        <Txt variant="title">{t('service.profileTitle')}</Txt>
        <Txt variant="muted">{t('service.profileSub')}</Txt>
      </View>

      {/* Visibility first: it is the single thing that decides whether any of the
          rest of this form has an effect. */}
      <Card style={{ gap: 8 }}>
        <Row gap={8}>
          <Ionicons name="shield-checkmark" size={18} color={profile?.listed ? C.green : C.inkSoft} />
          <Txt variant="title" style={{ flex: 1 }}>{profile?.listed ? t('service.listed') : t('service.notListed')}</Txt>
        </Row>
        <Txt variant="muted">{profile?.listed ? t('service.listedHint') : t('service.notListedHint')}</Txt>
        <Button
          title={profile?.listed ? t('service.notListed') : t('service.listed')}
          variant={profile?.listed ? 'outline' : 'primary'}
          disabled={toggleListed.isPending}
          onPress={() => toggleListed.mutate(!profile?.listed)}
        />
      </Card>

      <Card style={{ gap: 10 }}>
        {field(t('service.companyName'), 'companyName')}

        {/* Scoped to the role: an accountant is never offered `blanching`, and the
            API narrows anything a stale client sends anyway. */}
        <View style={{ gap: 6 }}>
          <Txt variant="muted">{t('service.categories')}</Txt>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {offerable.map((c) => (
              <Chip
                key={c}
                label={t(`enums:serviceCategory.${c}`, { defaultValue: c })}
                active={categories.includes(c)}
                onPress={() =>
                  setCats(categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c])
                }
              />
            ))}
          </Row>
        </View>

        {field(t('service.cities'), 'citiesServed')}
        {field(t('service.basedIn'), 'country')}
        {field(t('service.capacity'), 'capacityPerDay', true)}
        {field(t('service.certifications'), 'certifications')}
        {field(t('service.minOrder'), 'minOrderQty', true)}
        {field(t('service.turnaround'), 'turnaroundDays', true)}
        <PickerField
          label={t('service.pricing')}
          placeholder={t('service.onEnquiry')}
          value={value('pricingBasis')}
          displayValue={
            value('pricingBasis') ? t(`enums:servicePricingBasis.${value('pricingBasis')}`, { defaultValue: value('pricingBasis') }) : ''
          }
          options={SERVICE_PRICING_BASES.map((b) => ({
            value: b,
            label: t(`enums:servicePricingBasis.${b}`, { defaultValue: b }),
          }))}
          onChange={set('pricingBasis')}
        />
        <Input
          label={t('service.priceFrom', { amount: '', basis: '' }).trim() || t('service.pricing')}
          value={priceFrom}
          keyboardType="decimal-pad"
          onChangeText={set('priceFrom')}
        />
        <Input label={t('service.about')} value={value('blurb')} onChangeText={set('blurb')} multiline />

        {save.error ? <Txt style={{ color: C.error }}>{errText(save.error, t('service.saveError'))}</Txt> : null}
        {save.isSuccess && !save.error ? <Txt style={{ color: C.green }}>{t('service.saved')}</Txt> : null}
        <Button
          title={t('service.save')}
          loading={save.isPending}
          disabled={save.isPending}
          onPress={() => save.mutate()}
        />
      </Card>
    </ScrollView>
  );
}

/* ── dashboard ──────────────────────────────────────────────────────────── */

/** Landing tab: the numbers that matter, then straight into enquiries. */
export function ServiceDashboard() {
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
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }}>
      <Txt variant="h3">{role ? t(`enums:serviceRole.${role}`) : t('service.providers')}</Txt>

      {/* Not listed is the one thing worth interrupting for — nothing else here
          can change until buyers can actually find them. */}
      {profile && !profile.listed ? (
        <Card style={{ gap: 4, backgroundColor: C.surface }}>
          <Txt variant="title">{t('service.notListed')}</Txt>
          <Txt variant="muted">{t('service.notListedHint')}</Txt>
        </Card>
      ) : null}

      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {(['pending', 'accepted', 'declined'] as const).map((s) => (
          <Card key={s} style={{ flexGrow: 1, minWidth: 96, alignItems: 'center' }}>
            <Txt variant="h3">{count(s)}</Txt>
            <Txt variant="muted">{t(`service.${s}`)}</Txt>
          </Card>
        ))}
        <Card style={{ flexGrow: 1, minWidth: 96, alignItems: 'center' }}>
          <Txt variant="h3">{profile?.categories.length ?? 0}</Txt>
          <Txt variant="muted">{t('service.categories')}</Txt>
        </Card>
      </Row>
    </ScrollView>
  );
}
