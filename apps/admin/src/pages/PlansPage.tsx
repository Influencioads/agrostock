import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, Card, Input } from '@agrotraders/ui';
import type { ApiBillingCycle, ApiPlan } from '@agrotraders/api-client';
import { BILLING_CYCLES, PLAN_FEATURE_KEYS, PLAN_FEATURE_OPTIONS, PLAN_LIMIT_KEYS } from '@agrotraders/types';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useFormat } from '../lib/useFormat';
import { useI18n } from '../i18n';

/**
 * The plan catalogue editor.
 *
 * Everything on this page is a database row, which is the whole point: a price
 * change, a quota bump or a feature toggle must be a form submit, not a
 * deployment. The published commercial plan is only the seed — "restore
 * defaults" puts it back if an experiment goes wrong.
 *
 * Prices are edited in RUBLES and stored in kopecks. Operators think in rubles;
 * asking them to type 249000 for ₽2 490 is how a price gets published wrong.
 */

const ROLE_TABS = [
  'seller',
  'buyer',
  'transporter',
  'loaderco',
  'workerco',
  'worker',
  'accountant',
  'packer',
  'processor',
  'fulfillment_partner',
  'finance_partner',
] as const;

/** Kopecks → the ruble string shown in the input (blank when unpriced). */
const toRubles = (minor: number | undefined) => (minor === undefined ? '' : String(minor / 100));

/** What the operator typed → kopecks, or null to remove the cycle entirely. */
function toMinor(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function PriceRow({ plan }: { plan: ApiPlan }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const priced = useMemo(
    () => Object.fromEntries(plan.prices.map((p) => [p.cycle, p.amountMinor])) as Partial<Record<ApiBillingCycle, number>>,
    [plan.prices],
  );
  const [draft, setDraft] = useState<Partial<Record<ApiBillingCycle, string>>>({});

  const save = useMutation({
    mutationFn: ({ cycle, amountMinor }: { cycle: ApiBillingCycle; amountMinor: number | null }) =>
      api.admin.setPlanPrice(plan.id, { cycle, amountMinor }),
    onSuccess: () => {
      setDraft({});
      toast.success(t('plans.priceSaved'));
      void qc.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {BILLING_CYCLES.map((cycle) => {
        const current = toRubles(priced[cycle]);
        const value = draft[cycle] ?? current;
        const dirty = value !== current;
        return (
          <div key={cycle}>
            <Input
              label={t(`plans.cycle.${cycle}`)}
              inputMode="decimal"
              placeholder={t('plans.notOffered')}
              value={value}
              onChange={(e) => setDraft({ ...draft, [cycle]: e.target.value })}
            />
            {dirty && (
              <Button
                className="mt-1.5"
                disabled={save.isPending}
                onClick={() => save.mutate({ cycle: cycle as ApiBillingCycle, amountMinor: toMinor(value) })}
              >
                {t('plans.savePrice')}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlanCard({ plan }: { plan: ApiPlan }) {
  const { t } = useI18n();
  const { minor } = useFormat();
  const qc = useQueryClient();
  const [name, setName] = useState(plan.name);
  const [limits, setLimits] = useState<Record<string, string>>(() =>
    Object.fromEntries(PLAN_LIMIT_KEYS.map((k) => [k, k in plan.limits ? (plan.limits[k] === null ? '' : String(plan.limits[k])) : 'off'])),
  );
  const [features, setFeatures] = useState<Record<string, boolean | string>>(() => ({ ...plan.features }));

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-plans'] });
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.admin.updatePlan(plan.id, body),
    onSuccess: () => {
      toast.success(t('plans.saved'));
      invalidate();
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  /** 'off' = the key is absent (not part of this plan); '' = unlimited. */
  const limitsPayload = () =>
    Object.fromEntries(
      Object.entries(limits)
        .filter(([, v]) => v !== 'off')
        .map(([k, v]) => [k, v.trim() === '' ? null : Number(v)]),
    );

  const monthly = plan.prices.find((p) => p.cycle === 'monthly');

  return (
    <Card className="mb-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={plan.tier === 0 ? 'slate' : plan.tier === 1 ? 'green' : 'gold'}>{t(`plans.tier.${plan.tier}`)}</Badge>
        <code className="font-numeric text-xs text-ink-soft">{plan.code}</code>
        {!plan.active && <Badge tone="error">{t('plans.inactive')}</Badge>}
        <span className="ml-auto text-sm text-ink-soft">
          {monthly ? t('plans.fromPerMonth', { amount: minor(monthly.amountMinor, monthly.currency) }) : t('plans.free')}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t('plans.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex items-end gap-2">
          <Button disabled={name === plan.name || update.isPending} onClick={() => update.mutate({ name })}>
            {t('plans.rename')}
          </Button>
          {plan.tier > 0 && (
            <Button variant="ghost" onClick={() => update.mutate({ active: !plan.active })}>
              {plan.active ? t('plans.deactivate') : t('plans.activate')}
            </Button>
          )}
        </div>
      </div>

      <h4 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-ink-soft">{t('plans.pricesTitle')}</h4>
      <PriceRow plan={plan} />

      <h4 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-ink-soft">{t('plans.quotasTitle')}</h4>
      <p className="mb-2 text-xs text-ink-soft">{t('plans.quotaHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PLAN_LIMIT_KEYS.map((k) => (
          <label key={k} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-ink" title={t(`plans.limit.${k}`)}>
              {t(`plans.limit.${k}`)}
            </span>
            <input
              className="h-9 w-24 rounded-md border border-surface-border bg-white px-2 text-right font-numeric text-sm text-ink"
              inputMode="numeric"
              placeholder={t('plans.unlimited')}
              value={limits[k] === 'off' ? '' : limits[k]}
              disabled={limits[k] === 'off'}
              onChange={(e) => setLimits({ ...limits, [k]: e.target.value })}
            />
            <input
              type="checkbox"
              aria-label={t('plans.appliesTo', { key: t(`plans.limit.${k}`) })}
              checked={limits[k] !== 'off'}
              onChange={(e) => setLimits({ ...limits, [k]: e.target.checked ? '' : 'off' })}
            />
          </label>
        ))}
      </div>

      <h4 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-ink-soft">{t('plans.featuresTitle')}</h4>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PLAN_FEATURE_KEYS.map((k) => {
          const options = (PLAN_FEATURE_OPTIONS as Record<string, readonly string[]>)[k];
          return (
            <label key={k} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink" title={t(`plans.feature.${k}`)}>
                {t(`plans.feature.${k}`)}
              </span>
              {options ? (
                <select
                  className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
                  value={String(features[k] ?? options[0])}
                  onChange={(e) => setFeatures({ ...features, [k]: e.target.value })}
                >
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {t(`plans.option.${o}`)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="checkbox"
                  checked={Boolean(features[k])}
                  onChange={(e) => setFeatures({ ...features, [k]: e.target.checked })}
                />
              )}
            </label>
          );
        })}
      </div>

      <div className="mt-4">
        <Button disabled={update.isPending} onClick={() => update.mutate({ limits: limitsPayload(), features })}>
          {update.isPending ? t('plans.saving') : t('plans.saveQuotas')}
        </Button>
      </div>
    </Card>
  );
}

export function PlansPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [role, setRole] = useState<string>('seller');

  const { data: plans = [], isLoading } = useQuery<ApiPlan[]>({
    queryKey: ['admin-plans'],
    queryFn: () => api.admin.billingPlans(),
  });

  const restore = useMutation({
    mutationFn: () => api.admin.restorePlanDefaults(),
    onSuccess: (r) => {
      toast.success(t('plans.restored', { count: r.plansCreated + r.plansUpdated }));
      void qc.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  const forRole = plans.filter((p) => p.role === role).sort((a, b) => a.tier - b.tier);

  return (
    <div>
      <PageHeader title={t('page.plans.title')} subtitle={t('page.plans.subtitle')} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ROLE_TABS.map((r) => (
          <Button key={r} variant={r === role ? 'primary' : 'ghost'} onClick={() => setRole(r)}>
            {t(`enums:role.${r}`)}
          </Button>
        ))}
        <Button
          className="ml-auto"
          variant="ghost"
          disabled={restore.isPending}
          onClick={() => {
            // Destructive to price edits, so confirm before overwriting them.
            if (window.confirm(t('plans.restoreConfirm'))) restore.mutate();
          }}
        >
          {restore.isPending ? t('plans.restoring') : t('plans.restoreDefaults')}
        </Button>
      </div>

      {isLoading ? (
        <Card>{t('common:loading')}</Card>
      ) : forRole.length === 0 ? (
        <Card>{t('plans.noneForRole')}</Card>
      ) : (
        forRole.map((p) => <PlanCard key={p.id} plan={p} />)
      )}
    </div>
  );
}
