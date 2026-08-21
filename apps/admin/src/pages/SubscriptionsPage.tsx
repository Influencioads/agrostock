import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Stat, Table } from '@agrotraders/ui';
import type { ApiAdminSubscription, ApiBillingSettings, ApiRevenueSummary } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useFormat } from '../lib/useFormat';
import { useI18n } from '../i18n';

/**
 * Subscription oversight and the platform billing switches.
 *
 * The revenue block exists so the commercial plan's projections can be checked
 * against reality — MRR, ARR and churn measured from live subscriptions rather
 * than from cash collected, which is the basis those projections are stated in.
 */

const STATUS_TONE: Record<string, 'green' | 'warn' | 'error' | 'slate'> = {
  active: 'green',
  past_due: 'warn',
  canceled: 'warn',
  expired: 'slate',
};

/** Commission and dunning switches — the levers the plan turns on over time. */
function SettingsCard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery<ApiBillingSettings>({ queryKey: ['billing-settings'], queryFn: () => api.admin.billingSettings() });
  const [draft, setDraft] = useState<Partial<ApiBillingSettings>>({});

  const save = useMutation({
    mutationFn: (body: Partial<ApiBillingSettings>) => api.admin.updateBillingSettings(body),
    onSuccess: () => {
      setDraft({});
      toast.success(t('subs.settingsSaved'));
      void qc.invalidateQueries({ queryKey: ['billing-settings'] });
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  if (!data) return null;
  const merged = { ...data, ...draft };
  const dirty = Object.keys(draft).length > 0;
  // Basis points are the storage unit; percent is what an operator thinks in.
  const pct = (bps: number) => String(bps / 100);
  const bps = (v: string) => Math.round((Number(v.replace(',', '.')) || 0) * 100);

  return (
    <Card className="mb-4">
      <h3 className="mb-1 font-display text-lg font-bold text-ink">{t('subs.settingsTitle')}</h3>
      <p className="mb-3 text-sm text-ink-soft">{t('subs.settingsHint')}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label={t('subs.orderCommission')}
          inputMode="decimal"
          value={pct(merged.orderCommissionBps)}
          onChange={(e) => setDraft({ ...draft, orderCommissionBps: bps(e.target.value) })}
        />
        <Input
          label={t('subs.escrowCommission')}
          inputMode="decimal"
          value={pct(merged.escrowCommissionBps)}
          onChange={(e) => setDraft({ ...draft, escrowCommissionBps: bps(e.target.value) })}
        />
        <Input
          label={t('subs.dunningRetries')}
          inputMode="numeric"
          value={String(merged.dunningRetries)}
          onChange={(e) => setDraft({ ...draft, dunningRetries: Number(e.target.value) || 0 })}
        />
        <Input
          label={t('subs.dunningInterval')}
          inputMode="numeric"
          value={String(merged.dunningIntervalHours)}
          onChange={(e) => setDraft({ ...draft, dunningIntervalHours: Number(e.target.value) || 1 })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={merged.commissionEnabled}
            onChange={(e) => setDraft({ ...draft, commissionEnabled: e.target.checked })}
          />
          {t('subs.commissionEnabled')}
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={merged.quotasEnforced} onChange={(e) => setDraft({ ...draft, quotasEnforced: e.target.checked })} />
          {t('subs.quotasEnforced')}
        </label>
        <Input
          className="max-w-xs"
          label={t('subs.platformAccount')}
          placeholder={t('subs.platformAccountHint')}
          value={merged.platformUserId ?? ''}
          onChange={(e) => setDraft({ ...draft, platformUserId: e.target.value || null })}
        />
      </div>

      {dirty && (
        <div className="mt-3 flex gap-2">
          <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
            {save.isPending ? t('subs.saving') : t('subs.saveSettings')}
          </Button>
          <Button variant="ghost" onClick={() => setDraft({})}>
            {t('common:cancel')}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Per-account discount with an expiry — the 50% early-adopter offer runs on this. */
function DiscountEditor({ sub, onDone }: { sub: ApiAdminSubscription; onDone: () => void }) {
  const { t } = useI18n();
  const [percent, setPercent] = useState(String(sub.discountPercent));
  const [until, setUntil] = useState(sub.discountUntil ? sub.discountUntil.slice(0, 10) : '');

  const save = useMutation({
    mutationFn: () =>
      api.admin.setSubscriptionDiscount(sub.id, {
        discountPercent: Number(percent) || 0,
        discountUntil: until ? new Date(until).toISOString() : null,
      }),
    onSuccess: () => {
      toast.success(t('subs.discountSaved'));
      onDone();
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input label={t('subs.discountPercent')} inputMode="numeric" value={percent} onChange={(e) => setPercent(e.target.value)} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">{t('subs.discountUntil')}</span>
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="h-11 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
        />
      </label>
      <Button disabled={save.isPending} onClick={() => save.mutate()}>
        {t('subs.applyDiscount')}
      </Button>
      <Button variant="ghost" onClick={onDone}>
        {t('common:cancel')}
      </Button>
    </div>
  );
}

export function SubscriptionsPage() {
  const { t } = useI18n();
  const { minor, number, date } = useFormat();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const { data: revenue } = useQuery<ApiRevenueSummary>({ queryKey: ['billing-revenue'], queryFn: () => api.admin.revenue() });
  const { data: subs = [], isLoading } = useQuery<ApiAdminSubscription[]>({
    queryKey: ['admin-subscriptions', status, q],
    queryFn: () => api.admin.subscriptions({ status: status || undefined, q: q || undefined }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    void qc.invalidateQueries({ queryKey: ['billing-revenue'] });
  };

  const act = useMutation<unknown, unknown, { id: string; kind: 'cancel' | 'renew' }>({
    mutationFn: ({ id, kind }) => (kind === 'cancel' ? api.admin.cancelSubscription(id) : api.admin.renewSubscription(id)),
    onSuccess: () => {
      toast.success(t('subs.actionDone'));
      invalidate();
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  return (
    <div>
      <PageHeader title={t('page.subscriptions.title')} subtitle={t('page.subscriptions.subtitle')} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={t('subs.mrr')} value={revenue ? minor(revenue.mrrMinor, revenue.currency) : '—'} />
        <Stat label={t('subs.arr')} value={revenue ? minor(revenue.arrMinor, revenue.currency) : '—'} />
        <Stat label={t('subs.paidAccounts')} value={revenue ? number(revenue.paidAccounts) : '—'} />
        <Stat label={t('subs.pastDue')} value={revenue ? number(revenue.pastDue) : '—'} />
        <Stat label={t('subs.churn')} value={revenue ? `${revenue.churnPercent30d}%` : '—'} />
      </div>

      {revenue && revenue.byRole.length > 0 && (
        <Card className="mb-4">
          <h3 className="mb-2 font-display text-lg font-bold text-ink">{t('subs.mrrByRole')}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {revenue.byRole.map((r) => (
              <div key={r.role} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
                <span className="text-sm text-ink">{t(`enums:role.${r.role}`)}</span>
                <span className="font-numeric text-sm font-bold text-ink">
                  {minor(r.mrrMinor, revenue.currency)} <span className="text-ink-soft">({r.paid})</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <SettingsCard />

      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder={t('subs.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
          >
            <option value="">{t('subs.allStatuses')}</option>
            {['active', 'past_due', 'canceled', 'expired'].map((s) => (
              <option key={s} value={s}>
                {t(`subs.status.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="text-ink-soft">{t('common:loading')}</p>
        ) : subs.length === 0 ? (
          <p className="text-ink-soft">{t('subs.none')}</p>
        ) : (
          <Table<Record<string, unknown>>
            getKey={(row) => (row as unknown as ApiAdminSubscription).id}
            rows={subs as unknown as Record<string, unknown>[]}
            columns={[
              {
                key: 'account',
                header: t('subs.account'),
                render: (row) => {
                  const s2 = row as unknown as ApiAdminSubscription;
                  return (
                    <>
                      <div className="font-semibold text-ink">{s2.user.name}</div>
                      <div className="text-xs text-ink-soft">{s2.user.email}</div>
                    </>
                  );
                },
              },
              {
                key: 'plan',
                header: t('subs.plan'),
                render: (row) => {
                  const s2 = row as unknown as ApiAdminSubscription;
                  return (
                    <>
                      {s2.planName}
                      <div className="text-xs text-ink-soft">{t(`enums:role.${s2.role}`)}</div>
                    </>
                  );
                },
              },
              {
                key: 'cycle',
                header: t('subs.cycle'),
                render: (row) => t(`plans.cycle.${(row as unknown as ApiAdminSubscription).cycle}`),
              },
              {
                key: 'status',
                header: t('subs.statusCol'),
                render: (row) => {
                  const s2 = row as unknown as ApiAdminSubscription;
                  return (
                    <>
                      <Badge tone={STATUS_TONE[s2.status] ?? 'slate'}>{t(`subs.status.${s2.status}`)}</Badge>
                      {s2.dunningAttempts > 0 && (
                        <div className="text-xs text-status-warning">{t('subs.retry', { n: s2.dunningAttempts })}</div>
                      )}
                    </>
                  );
                },
              },
              {
                key: 'renews',
                header: t('subs.renews'),
                render: (row) => {
                  const s2 = row as unknown as ApiAdminSubscription;
                  return (
                    <>
                      {date(s2.currentPeriodEnd)}
                      {s2.cancelAtPeriodEnd && <div className="text-xs text-ink-soft">{t('subs.endsThen')}</div>}
                    </>
                  );
                },
              },
              {
                key: 'amount',
                header: t('subs.amount'),
                align: 'right',
                render: (row) => {
                  const s2 = row as unknown as ApiAdminSubscription;
                  return (
                    <span className="font-numeric">
                      {minor(s2.amountMinor, s2.currency)}
                      {s2.discountPercent > 0 && <div className="text-xs text-brand-dark">-{s2.discountPercent}%</div>}
                    </span>
                  );
                },
              },
              {
                key: 'actions',
                header: '',
                render: (row) => {
                  const s2 = row as unknown as ApiAdminSubscription;
                  return (
                    <>
                      <div className="flex flex-wrap gap-1">
                        <Button variant="ghost" onClick={() => setEditing(editing === s2.id ? null : s2.id)}>
                          {t('subs.discount')}
                        </Button>
                        <Button variant="ghost" disabled={act.isPending} onClick={() => act.mutate({ id: s2.id, kind: 'renew' })}>
                          {t('subs.renewNow')}
                        </Button>
                        {s2.status !== 'expired' && (
                          <Button variant="ghost" disabled={act.isPending} onClick={() => act.mutate({ id: s2.id, kind: 'cancel' })}>
                            {t('subs.cancel')}
                          </Button>
                        )}
                      </div>
                      {editing === s2.id && (
                        <div className="mt-2">
                          <DiscountEditor
                            sub={s2}
                            onDone={() => {
                              setEditing(null);
                              invalidate();
                            }}
                          />
                        </div>
                      )}
                    </>
                  );
                },
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
