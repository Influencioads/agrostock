import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiTranslationOverview } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useI18n } from '../i18n';

/**
 * Admin → Translation.
 *
 * Coverage is counted from the DATABASE, not by crawling the rendered site.
 * Every string a visitor reads in the wrong language comes from one of these
 * tables, and a count is exact where a page scan has to guess whether "HACCP"
 * is untranslated English or a code that must stay Latin.
 *
 * The master switch governs the unattended hourly sweep only. "Translate
 * everything now" is a human decision and runs regardless — turning the cron
 * off is not meant to lock an operator out of their own catalogue.
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

function CoverageBar({ percent }: { percent: number }) {
  const tone = percent >= 100 ? 'bg-brand-leaf' : percent >= 80 ? 'bg-mango' : 'bg-status-error';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

export function TranslationPage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ApiTranslationOverview>({
    queryKey: ['admin-translation'],
    queryFn: () => api.admin.translation(),
  });

  const done = (next: ApiTranslationOverview) => qc.setQueryData(['admin-translation'], next);

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => api.admin.setTranslationEnabled(enabled),
    onSuccess: (next) => {
      done(next);
      toast.success(t(next.autoTranslateEnabled ? 'translation.turnedOn' : 'translation.turnedOff'));
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  const run = useMutation({
    mutationFn: () => api.admin.runTranslation(),
    onSuccess: (next) => {
      done(next);
      toast.success(t('translation.ranOk', { count: next.lastRunFilled ?? 0 }));
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title={t('translation.title')} subtitle={t('translation.subtitle')} />
        <Card>{t('common.loading')}</Card>
      </div>
    );
  }

  const complete = data.totalMissing === 0;

  return (
    <div>
      <PageHeader title={t('translation.title')} subtitle={t('translation.subtitle')} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-ink">{t('translation.autoTitle')}</h2>
              {complete ? (
                <Badge tone="green">{t('translation.complete')}</Badge>
              ) : (
                <Badge tone="warn">{t('translation.missingN', { count: data.totalMissing })}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-soft">{t('translation.autoHelp')}</p>
            {!data.providerConfigured && (
              <p className="mt-2 text-sm text-status-error">{t('translation.noProvider')}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-soft">{t('translation.auto')}</span>
            <Toggle
              on={data.autoTranslateEnabled}
              label={t('translation.auto')}
              disabled={toggle.isPending}
              onChange={(v) => toggle.mutate(v)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-surface-border pt-4">
          <Button onClick={() => run.mutate()} disabled={run.isPending || !data.providerConfigured}>
            <Icon name={run.isPending ? 'clock' : 'check'} size={16} />
            {run.isPending ? t('translation.running') : t('translation.runNow')}
          </Button>
          <span className="text-xs text-ink-soft">
            {data.lastRunAt
              ? t('translation.lastRun', {
                  when: new Date(data.lastRunAt).toLocaleString(),
                  count: data.lastRunFilled ?? 0,
                })
              : t('translation.neverRun')}
          </span>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold text-ink">{t('translation.coverage')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('translation.coverageHelp')}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="pb-2 pr-4 font-semibold">{t('translation.source')}</th>
                <th className="pb-2 pr-4 font-semibold">{t('translation.rows')}</th>
                <th className="pb-2 pr-4 font-semibold">{t('translation.missingCol')}</th>
                <th className="pb-2 w-40 font-semibold">{t('translation.percent')}</th>
              </tr>
            </thead>
            <tbody>
              {data.coverage.map((row) => (
                <tr key={row.key} className="border-t border-surface-border">
                  <td className="py-2 pr-4 font-medium text-ink">{t(`translation.src.${row.key}`)}</td>
                  <td className="py-2 pr-4 font-numeric text-ink-soft">{row.total}</td>
                  <td className={`py-2 pr-4 font-numeric ${row.missing ? 'text-status-error' : 'text-ink-soft'}`}>
                    {row.missing}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <CoverageBar percent={row.percent} />
                      <span className="w-10 shrink-0 text-right font-numeric text-xs text-ink-soft">{row.percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
