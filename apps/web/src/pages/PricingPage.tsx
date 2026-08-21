import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiAddonSpec, ApiBillingCycle, ApiPlan } from '@agrotraders/api-client';
import { BILLING_CYCLES, cycleSavingPercent, PLAN_FEATURE_KEYS, PLAN_LIMIT_KEYS } from '@agrotraders/types';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/**
 * The public pricing page.
 *
 * Two decisions here come straight from the commercial plan and are worth more
 * than any copy on the page:
 *
 *  - **The cycle picker defaults to yearly.** The ~30% annual discount only earns
 *    its keep if customers actually take it, and defaults decide that.
 *  - **The per-month equivalent is shown next to the annual price**, so the
 *    yearly number never reads as a bigger ask than it is.
 *
 * Browsable signed-out on purpose: a price behind a login does not get sold.
 */

/** The six ladders, in the order the plan presents them. Supply first, demand last. */
const ROLE_TABS: { key: string; roles: string[] }[] = [
  { key: 'seller', roles: ['seller'] },
  { key: 'buyer', roles: ['buyer'] },
  { key: 'transporter', roles: ['transporter'] },
  { key: 'loaderco', roles: ['loaderco', 'workerco'] },
  { key: 'worker', roles: ['worker'] },
  // The five service roles share one ladder; `processor` carries an uplifted
  // Standard tier, so it gets its own tab rather than being averaged away.
  { key: 'services', roles: ['accountant', 'packer', 'fulfillment_partner', 'finance_partner'] },
  { key: 'processor', roles: ['processor'] },
];

function CycleToggle({ cycle, onChange }: { cycle: ApiBillingCycle; onChange: (c: ApiBillingCycle) => void }) {
  const { t } = useI18n();
  return (
    <div className="inline-flex rounded-lg border border-surface-border bg-white p-1">
      {BILLING_CYCLES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c as ApiBillingCycle)}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            c === cycle ? 'bg-brand-leaf text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {t(`pricing.cycle.${c}`)}
        </button>
      ))}
    </div>
  );
}

function PlanColumn({
  plan,
  cycle,
  highlight,
  onChoose,
}: {
  plan: ApiPlan;
  cycle: ApiBillingCycle;
  highlight: boolean;
  onChoose: (plan: ApiPlan) => void;
}) {
  const { t } = useI18n();
  const { fmtMinor } = useCurrency();

  const price = plan.prices.find((p) => p.cycle === cycle);
  const monthly = plan.prices.find((p) => p.cycle === 'monthly');
  const saving = price && monthly && cycle !== 'monthly' ? cycleSavingPercent(monthly.amountMinor, price.amountMinor, cycle) : 0;

  return (
    <Card className={highlight ? 'relative border-2 border-brand-leaf' : 'relative'}>
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge tone="green">{t('pricing.mostPopular')}</Badge>
        </span>
      )}

      <h3 className="font-display text-xl font-extrabold text-ink">{plan.name}</h3>

      <div className="mt-3">
        {price ? (
          <>
            <div className="font-numeric text-3xl font-extrabold text-ink">{fmtMinor(price.amountMinor, price.currency)}</div>
            <div className="mt-1 text-sm text-ink-soft">
              {cycle === 'monthly'
                ? t('pricing.perMonth')
                : /* The per-month equivalent, which is what makes a yearly price legible. */
                  t('pricing.perMonthEquivalent', { amount: fmtMinor(price.perMonthMinor, price.currency) })}
            </div>
            {saving > 0 && (
              <div className="mt-1">
                <Badge tone="gold">{t('pricing.save', { percent: saving })}</Badge>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="font-numeric text-3xl font-extrabold text-ink">{t('pricing.free')}</div>
            <div className="mt-1 text-sm text-ink-soft">{t('pricing.freeForever')}</div>
          </>
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {PLAN_LIMIT_KEYS.filter((k) => k in plan.limits).map((k) => {
          const n = plan.limits[k];
          return (
            <li key={k} className="flex items-start gap-2">
              <Icon name="check" className="mt-0.5 shrink-0 text-brand-leaf" />
              <span className="text-ink">
                <strong className="font-numeric">{n === null ? t('pricing.unlimited') : n}</strong>{' '}
                {/* `count` selects the plural form but is not printed — the number
                    above may be the word "Unlimited". 0 picks the many/other form,
                    which is the one that reads correctly after it. */}
                {t(`pricing.limit.${k}`, { count: n ?? 0 })}
              </span>
            </li>
          );
        })}
        {PLAN_FEATURE_KEYS.filter((k) => plan.features[k] && plan.features[k] !== 'none').map((k) => (
          <li key={k} className="flex items-start gap-2">
            <Icon name="check" className="mt-0.5 shrink-0 text-brand-leaf" />
            <span className="text-ink">
              {t(`pricing.feature.${k}`)}
              {typeof plan.features[k] === 'string' && (
                <span className="text-ink-soft"> — {t(`pricing.option.${String(plan.features[k])}`)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Button className="mt-5 w-full" variant={highlight ? 'primary' : 'ghost'} onClick={() => onChoose(plan)}>
        {price ? t('pricing.choose', { plan: plan.name }) : t('pricing.startFree')}
      </Button>
    </Card>
  );
}

export function PricingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { fmtMinor } = useCurrency();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  useDocumentTitle(t('pricing.title'));

  // Filters live in the URL so a specific tier is a shareable link.
  const tab = params.get('for') ?? 'seller';
  // Yearly by default — the single highest-leverage choice on this page.
  const cycle = (params.get('cycle') as ApiBillingCycle) ?? 'yearly';
  const [showAddons, setShowAddons] = useState(false);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const { data: plans = [], isLoading } = useQuery<ApiPlan[]>({ queryKey: ['plans'], queryFn: () => api.billing.plans() });
  const { data: addons = [] } = useQuery<ApiAddonSpec[]>({ queryKey: ['addons'], queryFn: () => api.billing.addons() });

  const active = ROLE_TABS.find((r) => r.key === tab) ?? ROLE_TABS[0];
  const columns = useMemo(() => {
    // A shared ladder shows ONE column set: take the first role in the group,
    // since every role in it carries identical quotas by construction.
    const role = active.roles[0];
    return plans.filter((p) => p.role === role && p.active).sort((a, b) => a.tier - b.tier);
  }, [plans, active]);

  const choose = (plan: ApiPlan) => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/console/billing?plan=${plan.id}&cycle=${cycle}`)}`);
      return;
    }
    navigate(`/console/billing?plan=${plan.id}&cycle=${cycle}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">{t('pricing.title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-ink-soft">{t('pricing.subtitle')}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {ROLE_TABS.map((r) => (
          <Button key={r.key} variant={r.key === tab ? 'primary' : 'ghost'} onClick={() => setParam('for', r.key)}>
            {t(`pricing.for.${r.key}`)}
          </Button>
        ))}
      </div>

      <div className="mt-5 flex flex-col items-center gap-2">
        <CycleToggle cycle={cycle} onChange={(c) => setParam('cycle', c)} />
        <p className="text-xs text-ink-soft">{t('pricing.cycleHint')}</p>
      </div>

      {isLoading ? (
        <Card className="mt-8">{t('pricing.loading')}</Card>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {columns.map((p) => (
            // The middle rung is the anchor — it is expected to carry roughly
            // three quarters of paid accounts, so it is the one highlighted.
            <PlanColumn key={p.id} plan={p} cycle={cycle} highlight={p.tier === 1 && columns.length > 2} onChoose={choose} />
          ))}
        </div>
      )}

      <section className="mt-10">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-surface-border bg-white px-4 py-3 text-left"
          onClick={() => setShowAddons((v) => !v)}
        >
          <span>
            <span className="font-display text-lg font-bold text-ink">{t('pricing.addonsTitle')}</span>
            <span className="ml-2 text-sm text-ink-soft">{t('pricing.addonsHint')}</span>
          </span>
          <Icon name="chevronDown" className={'transition-transform' + (showAddons ? ' rotate-180' : '')} />
        </button>

        {showAddons && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addons.map((a) => (
              <Card key={a.kind}>
                <div className="font-semibold text-ink">{t(`pricing.addon.${a.kind}`)}</div>
                <div className="mt-1 font-numeric text-xl font-extrabold text-ink">{fmtMinor(a.amountMinor, 'RUB')}</div>
                <div className="text-sm text-ink-soft">
                  {a.durationDays === null ? t('pricing.oneOff') : t('pricing.perDays', { days: a.durationDays })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 text-center text-xs text-ink-soft">{t('pricing.vatNote')}</p>
    </div>
  );
}
