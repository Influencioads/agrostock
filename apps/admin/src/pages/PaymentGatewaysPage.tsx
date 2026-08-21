import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import type { ApiAdminGateway, ApiPaymentProvider } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useI18n } from '../i18n';

/**
 * Payment gateway configuration.
 *
 * Two rules shape this page:
 *  1. Secrets are write-only. The API returns masked values, so a saved field
 *     shows "••••4321" and is left alone unless the operator types a new value.
 *  2. Nothing can be switched on until it can actually take a payment — the API
 *     rejects enabling an incomplete gateway, and the toggle reflects that.
 */

/** Small controlled switch — @agrotraders/ui has no Switch export. */
function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? 'bg-brand-leaf' : 'bg-surface-border'
      }`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

/** One-click copy for the callback URLs the operator pastes into the provider. */
function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-md border border-surface-border bg-surface-subtle px-3 py-2">
      <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      <code className="min-w-0 flex-1 truncate font-numeric text-xs text-ink">{value}</code>
      <Button
        variant="ghost"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? t('gateways.copied') : t('gateways.copy')}
      </Button>
    </div>
  );
}

function GatewayCard({ gateway }: { gateway: ApiAdminGateway }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  // Only fields the operator has actually typed into. An untouched field is
  // never sent, so the stored secret survives a toggle change.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [showDocs, setShowDocs] = useState(false);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-gateways'] });

  const save = useMutation({
    mutationFn: (body: { enabled?: boolean; testMode?: boolean; credentials?: Record<string, string> }) =>
      api.admin.updateGateway(gateway.provider, body),
    onSuccess: () => {
      setEdits({});
      toast.success(t('gateways.saved'));
      invalidate();
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  const check = useMutation({
    mutationFn: () => api.admin.testGateway(gateway.provider),
    onSuccess: (r) => (r.ok ? toast.success(r.message) : toast.error(r.message)),
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  const dirty = Object.keys(edits).length > 0;

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold text-ink">{gateway.label}</h3>
            {gateway.enabled ? <Badge tone="green">{t('gateways.live')}</Badge> : <Badge tone="slate">{t('gateways.off')}</Badge>}
            {gateway.testMode && <Badge tone="warn">{t('gateways.test')}</Badge>}
            {!gateway.configured && <Badge tone="error">{t('gateways.incomplete')}</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {gateway.supportsRecurring ? t('gateways.recurringYes') : t('gateways.recurringNo')}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          {t('gateways.testMode')}
          <Toggle on={gateway.testMode} label={t('gateways.testMode')} onChange={(v) => save.mutate({ testMode: v })} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          {t('gateways.enabled')}
          <Toggle
            on={gateway.enabled}
            label={t('gateways.enabled')}
            disabled={!gateway.configured && !gateway.enabled}
            onChange={(v) => save.mutate({ enabled: v })}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {gateway.credentialFields.map((f) => (
          <Input
            key={f.key}
            label={t(`gateways.field.${f.label}`)}
            type={f.secret && edits[f.key] !== undefined ? 'password' : 'text'}
            autoComplete="off"
            passwordLabels={{ show: t('common:showPassword'), hide: t('common:hidePassword') }}
            placeholder={gateway.credentials[f.key] ?? f.example ?? ''}
            value={edits[f.key] ?? ''}
            onChange={(e) => setEdits({ ...edits, [f.key]: e.target.value })}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft">{t('gateways.secretHint')}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={!dirty || save.isPending} onClick={() => save.mutate({ credentials: edits })}>
          {save.isPending ? t('gateways.saving') : t('gateways.saveCredentials')}
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setEdits({})}>
            {t('common:cancel')}
          </Button>
        )}
        <Button variant="ghost" disabled={!gateway.configured || check.isPending} onClick={() => check.mutate()}>
          {check.isPending ? t('gateways.testing') : t('gateways.testConnection')}
        </Button>
        <Button variant="ghost" onClick={() => setShowDocs((v) => !v)}>
          <Icon name="file" /> {showDocs ? t('gateways.hideSetup') : t('gateways.showSetup')}
        </Button>
      </div>

      {showDocs && (
        <div className="mt-4 space-y-3 rounded-lg border border-surface-border bg-surface-subtle p-4">
          <div>
            <h4 className="mb-1 font-semibold text-ink">{t('gateways.setupTitle')}</h4>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
              <li>{t(`gateways.steps.${gateway.provider}.1`)}</li>
              <li>{t(`gateways.steps.${gateway.provider}.2`)}</li>
              <li>{t(`gateways.steps.${gateway.provider}.3`)}</li>
              <li>{t('gateways.steps.common.enable')}</li>
            </ol>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-ink">{t('gateways.callbackTitle')}</h4>
            <p className="mb-2 text-sm text-ink-soft">{t('gateways.callbackHint')}</p>
            <div className="space-y-2">
              {gateway.callbackUrls.map((c) => (
                <CopyRow key={c.kind} label={t(`gateways.callback.${c.kind}`)} value={c.url} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <a className="font-semibold text-brand-dark underline" href={gateway.docsUrl} target="_blank" rel="noreferrer noopener">
              {t('gateways.apiDocs')} ↗
            </a>
            <a className="font-semibold text-brand-dark underline" href={gateway.dashboardUrl} target="_blank" rel="noreferrer noopener">
              {t('gateways.merchantDashboard')} ↗
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}

export function PaymentGatewaysPage() {
  const { t } = useI18n();
  const { data: gateways = [], isLoading } = useQuery<ApiAdminGateway[]>({
    queryKey: ['admin-gateways'],
    queryFn: () => api.admin.billingGateways(),
  });

  const liveCount = gateways.filter((g) => g.enabled).length;

  return (
    <div>
      <PageHeader title={t('page.gateways.title')} subtitle={t('page.gateways.subtitle')} />

      {liveCount === 0 && !isLoading && (
        <Card className="mb-4 border-mango bg-mango/5">
          <div className="flex gap-3">
            <Icon name="shield" className="mt-0.5 text-mango" />
            <div>
              <p className="font-semibold text-ink">{t('gateways.noneLiveTitle')}</p>
              <p className="text-sm text-ink-soft">{t('gateways.noneLiveBody')}</p>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card>{t('common:loading')}</Card>
      ) : (
        gateways.map((g) => <GatewayCard key={g.provider as ApiPaymentProvider} gateway={g} />)
      )}
    </div>
  );
}
