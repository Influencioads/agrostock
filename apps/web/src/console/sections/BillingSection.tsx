import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiBillingCycle, ApiBillingOverview, ApiGateway, ApiPaymentProvider, ApiPlan, ApiQuotaRow } from '@agrotraders/api-client';
import { BILLING_CYCLES } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { errMessage } from './order-parts';

/**
 * The customer's billing screen: current plan, quota meters, checkout and
 * payment history.
 *
 * The meters exist so the upgrade prompt arrives BEFORE the wall, not at it —
 * "42 of 50 listings used" is the whole mechanism. A quota the platform cannot
 * count yet is rendered as a plain included line rather than a fake meter.
 */

function QuotaMeter({ row }: { row: ApiQuotaRow }) {
  const { t } = useI18n();
  const label = t(`billing.limit.${row.key}`);

  if (row.limit === null) {
    return (
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-ink">{label}</span>
        <Badge tone="green">{t('billing.unlimited')}</Badge>
      </div>
    );
  }
  if (!row.enforced) {
    return (
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-ink">{label}</span>
        <span className="font-numeric text-ink-soft">{row.limit}</span>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((row.used / Math.max(row.limit, 1)) * 100));
  const over = row.used > row.limit;
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className={`font-numeric ${over ? 'font-bold text-status-error' : 'text-ink-soft'}`}>
          {t('billing.usedOf', { used: row.used, limit: row.limit })}
          {row.addon > 0 && <span className="text-brand-dark"> (+{row.addon})</span>}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
        <div
          className={`h-full rounded-full ${over ? 'bg-status-error' : pct >= 80 ? 'bg-mango' : 'bg-brand-leaf'}`}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>
      {over && <p className="mt-1 text-xs text-status-error">{t('billing.overLimit')}</p>}
    </div>
  );
}

/** Gateway picker + the actual purchase. Redirects to the acquirer's page. */
function Checkout({
  plan,
  cycle,
  gateways,
  onCancel,
}: {
  plan: ApiPlan;
  cycle: ApiBillingCycle;
  gateways: ApiGateway[];
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const { fmtMinor } = useCurrency();
  const [provider, setProvider] = useState<ApiPaymentProvider | null>(gateways[0]?.provider ?? null);
  const [error, setError] = useState('');

  const price = plan.prices.find((p) => p.cycle === cycle);

  const start = useMutation({
    mutationFn: () => api.billing.subscribe({ planId: plan.id, cycle, provider: provider! }),
    onSuccess: (intent) => {
      // The acquirer's hosted page is a full-page redirect, not an iframe: the
      // 3-D Secure step will not run inside one.
      if (intent.confirmationUrl) window.location.href = intent.confirmationUrl;
      else setError(t('billing.noRedirect'));
    },
    onError: (e) => setError(errMessage(e, t('billing.checkoutFailed'))),
  });

  if (gateways.length === 0) {
    return (
      <Card className="mt-3 border-mango">
        <p className="font-semibold text-ink">{t('billing.noGatewaysTitle')}</p>
        <p className="mt-1 text-sm text-ink-soft">{t('billing.noGatewaysBody')}</p>
        <Button className="mt-3" variant="ghost" onClick={onCancel}>
          {t('common:cancel')}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mt-3">
      <h4 className="font-display text-lg font-bold text-ink">
        {t('billing.confirmTitle', { plan: plan.name, cycle: t(`billing.cycle.${cycle}`) })}
      </h4>
      {price && <p className="mt-1 font-numeric text-2xl font-extrabold text-ink">{fmtMinor(price.amountMinor, price.currency)}</p>}
      <p className="mt-1 text-xs text-ink-soft">{t('billing.chargedInRubles')}</p>

      <div className="mt-3 space-y-2">
        {gateways.map((g) => (
          <label key={g.provider} className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-border p-3 hover:border-brand-leaf">
            <input type="radio" name="provider" checked={provider === g.provider} onChange={() => setProvider(g.provider)} />
            <span className="flex-1 font-semibold text-ink">{g.label}</span>
            {g.testMode && <Badge tone="warn">{t('billing.testMode')}</Badge>}
            {g.supportsRecurring && <Badge tone="slate">{t('billing.autoRenews')}</Badge>}
          </label>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-status-error">{error}</p>}

      <div className="mt-4 flex gap-2">
        <Button disabled={!provider || start.isPending} onClick={() => start.mutate()}>
          {start.isPending ? t('billing.redirecting') : t('billing.payNow')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('common:cancel')}
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-soft">{t('billing.cancelAnytime')}</p>
    </Card>
  );
}

export function BillingSection() {
  const { t } = useI18n();
  const { user, activeRole } = useAuth();
  const { fmtMinor } = useCurrency();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [chosen, setChosen] = useState<{ plan: ApiPlan; cycle: ApiBillingCycle } | null>(null);
  const [cycle, setCycle] = useState<ApiBillingCycle>('yearly');

  const role = activeRole || user?.role || 'buyer';

  const { data: overview, isLoading } = useQuery<ApiBillingOverview>({ queryKey: ['billing-overview'], queryFn: () => api.billing.overview() });
  const { data: plans = [] } = useQuery<ApiPlan[]>({ queryKey: ['plans', role], queryFn: () => api.billing.plans({ role }) });
  const { data: gateways = [] } = useQuery<ApiGateway[]>({ queryKey: ['gateways'], queryFn: () => api.billing.gateways() });

  // Arriving from the pricing page with ?plan=…&cycle=… goes straight to checkout.
  const deepPlan = params.get('plan');
  useEffect(() => {
    if (!deepPlan || plans.length === 0) return;
    const plan = plans.find((p) => p.id === deepPlan);
    if (plan) {
      const c = (params.get('cycle') as ApiBillingCycle) ?? 'yearly';
      setCycle(c);
      setChosen({ plan, cycle: c });
    }
    const next = new URLSearchParams(params);
    next.delete('plan');
    next.delete('cycle');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepPlan, plans.length]);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['billing-overview'] });
  const cancel = useMutation({
    mutationFn: () => api.billing.cancel({ role }),
    onSuccess: invalidate,
  });
  const resume = useMutation({
    mutationFn: () => api.billing.resume({ role }),
    onSuccess: invalidate,
  });

  const current = overview?.subscriptions.find((s) => s.role === role);
  const entitlement = overview?.entitlements[role];
  const meters = overview?.usage[role] ?? [];
  const upgrades = useMemo(
    () => plans.filter((p) => p.active && p.tier > (entitlement?.tier ?? 0) && p.prices.length > 0).sort((a, b) => a.tier - b.tier),
    [plans, entitlement],
  );

  if (isLoading) return <Card>{t('billing.loading')}</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-soft">{t('billing.currentPlan')}</p>
            <h3 className="font-display text-2xl font-extrabold text-ink">{entitlement?.planName ?? t('billing.free')}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {current ? (
                <>
                  <Badge tone={current.status === 'active' ? 'green' : current.status === 'past_due' ? 'warn' : 'slate'}>
                    {t(`billing.status.${current.status}`)}
                  </Badge>
                  <span className="text-sm text-ink-soft">
                    {current.cancelAtPeriodEnd
                      ? t('billing.endsOn', { date: new Date(current.currentPeriodEnd).toLocaleDateString() })
                      : t('billing.renewsOn', { date: new Date(current.currentPeriodEnd).toLocaleDateString() })}
                  </span>
                  {current.discountPercent > 0 && <Badge tone="gold">−{current.discountPercent}%</Badge>}
                </>
              ) : (
                <Badge tone="slate">{t('billing.status.free')}</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {current && current.cancelAtPeriodEnd && (
              <Button variant="ghost" disabled={resume.isPending} onClick={() => resume.mutate()}>
                {t('billing.resume')}
              </Button>
            )}
            {current && !current.cancelAtPeriodEnd && current.status !== 'expired' && (
              <Button variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                {t('billing.cancelPlan')}
              </Button>
            )}
            <Link to="/pricing">
              <Button variant="ghost">{t('billing.comparePlans')}</Button>
            </Link>
          </div>
        </div>

        {current?.status === 'past_due' && (
          <div className="mt-3 rounded-lg border border-mango bg-mango/5 p-3">
            <p className="font-semibold text-ink">{t('billing.pastDueTitle')}</p>
            <p className="text-sm text-ink-soft">{t('billing.pastDueBody')}</p>
          </div>
        )}
      </Card>

      {meters.length > 0 && (
        <Card>
          <h3 className="mb-2 font-display text-lg font-bold text-ink">{t('billing.usageTitle')}</h3>
          <div className="divide-y divide-surface-border">
            {meters.map((row) => (
              <QuotaMeter key={row.key} row={row} />
            ))}
          </div>
        </Card>
      )}

      {upgrades.length > 0 && !chosen && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="font-display text-lg font-bold text-ink">{t('billing.upgradeTitle')}</h3>
            <div className="ml-auto inline-flex rounded-lg border border-surface-border bg-white p-1">
              {BILLING_CYCLES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c as ApiBillingCycle)}
                  className={`rounded-md px-3 py-1.5 text-sm font-bold ${c === cycle ? 'bg-brand-leaf text-white' : 'text-ink-soft'}`}
                >
                  {t(`billing.cycle.${c}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {upgrades.map((p) => {
              const price = p.prices.find((x) => x.cycle === cycle);
              return (
                <div key={p.id} className="rounded-lg border border-surface-border p-4">
                  <div className="font-display text-lg font-bold text-ink">{p.name}</div>
                  {price ? (
                    <>
                      <div className="mt-1 font-numeric text-2xl font-extrabold text-ink">{fmtMinor(price.amountMinor, price.currency)}</div>
                      <div className="text-sm text-ink-soft">
                        {cycle === 'monthly'
                          ? t('billing.perMonth')
                          : t('billing.perMonthEquivalent', { amount: fmtMinor(price.perMonthMinor, price.currency) })}
                      </div>
                      <Button className="mt-3 w-full" onClick={() => setChosen({ plan: p, cycle })}>
                        {t('billing.choose')}
                      </Button>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-ink-soft">{t('billing.cycleUnavailable')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {chosen && <Checkout plan={chosen.plan} cycle={chosen.cycle} gateways={gateways} onCancel={() => setChosen(null)} />}

      {overview && overview.addons.length > 0 && (
        <Card>
          <h3 className="mb-2 font-display text-lg font-bold text-ink">{t('billing.addonsTitle')}</h3>
          <div className="space-y-2">
            {overview.addons.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm">
                <span className="text-ink">{t(`billing.addon.${a.kind}`)}</span>
                <span className="text-ink-soft">
                  {a.expiresAt ? t('billing.until', { date: new Date(a.expiresAt).toLocaleDateString() }) : t('billing.permanent')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {overview && overview.payments.length > 0 && (
        <Card>
          <h3 className="mb-2 font-display text-lg font-bold text-ink">{t('billing.historyTitle')}</h3>
          <div className="divide-y divide-surface-border">
            {overview.payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <Icon name="wallet" className="text-ink-soft" />
                <span className="text-ink">{t(`billing.purpose.${p.purpose}`)}</span>
                <span className="text-ink-soft">{new Date(p.createdAt).toLocaleDateString()}</span>
                <span className="ml-auto font-numeric font-bold text-ink">{fmtMinor(p.amountMinor, p.currency)}</span>
                <Badge tone={p.status === 'succeeded' ? 'green' : p.status === 'pending' ? 'warn' : 'error'}>
                  {t(`billing.payment.${p.status}`)}
                </Badge>
                {p.status === 'pending' && p.confirmationUrl && (
                  <a href={p.confirmationUrl}>
                    <Button variant="ghost">{t('billing.finishPayment')}</Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
