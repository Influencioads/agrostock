import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, Card, Input } from '@agrotraders/ui';
import type { ApiEmailTemplate } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

const CATEGORY_ORDER = ['auth', 'orders', 'wallet', 'auctions', 'hire', 'loader', 'transport', 'reviews', 'account'];
const CATEGORY_LABEL: Record<string, string> = {
  auth: 'Sign-in & account',
  orders: 'Orders',
  wallet: 'Wallet & payments',
  auctions: 'Auctions',
  hire: 'Hiring',
  loader: 'Loading jobs',
  transport: 'Transport',
  reviews: 'Reviews',
  account: 'Account & verification',
};

interface Draft {
  subject: string;
  bodyHtml: string;
  ctaLabel: string;
}

function extractErr(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
}

/** Inline editor for a single email template: subject/body + preview + test send. */
function TemplateEditor({ tpl, onClose }: { tpl: ApiEmailTemplate; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>({
    subject: tpl.subject,
    bodyHtml: tpl.bodyHtml,
    ctaLabel: tpl.ctaLabel ?? '',
  });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-email-templates'] });

  const save = useMutation({
    mutationFn: () =>
      api.admin.updateEmailTemplate(tpl.key, {
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        ctaLabel: draft.ctaLabel,
      }),
    onSuccess: () => {
      toast.success(t('emailTpl.saved'));
      invalidate();
    },
    onError: (e) => toast.error(extractErr(e, t('emailTpl.save'))),
  });

  const preview = useMutation({
    mutationFn: () =>
      api.admin.previewEmailTemplate(tpl.key, {
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        ctaLabel: draft.ctaLabel,
      }),
    onSuccess: (r) => setPreviewHtml(r.html),
    onError: (e) => toast.error(extractErr(e, t('emailTpl.preview'))),
  });

  const test = useMutation({
    mutationFn: () => api.admin.testEmailTemplate(tpl.key, {}),
    onSuccess: (r) => {
      if (r.delivered) toast.success(t('emailTpl.testSent', { to: r.to }));
      else toast.error(t('emailTpl.testFailed'));
    },
    onError: (e) => toast.error(extractErr(e, t('emailTpl.testFailed'))),
  });

  const resetToDefault = () =>
    setDraft({ subject: tpl.defaultSubject, bodyHtml: tpl.defaultBodyHtml, ctaLabel: tpl.ctaLabel ?? '' });

  const insertVar = (v: string) => setDraft((d) => ({ ...d, bodyHtml: `${d.bodyHtml}{{${v}}}` }));

  const showCta = tpl.variables.includes('ctaUrl');

  return (
    <div className="mt-3 rounded-lg bg-brand-surface/50 p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Input
            label={t('emailTpl.subject')}
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          />
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">{t('emailTpl.body')}</label>
            <textarea
              value={draft.bodyHtml}
              onChange={(e) => setDraft({ ...draft, bodyHtml: e.target.value })}
              rows={9}
              spellCheck={false}
              className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 font-mono text-[13px] text-ink focus:border-brand-leaf focus:outline-none focus:ring-1 focus:ring-brand-leaf"
            />
          </div>
          {showCta && (
            <Input
              label={t('emailTpl.ctaLabel')}
              value={draft.ctaLabel}
              onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
            />
          )}
          <div>
            <p className="mb-1 text-sm font-semibold text-ink">{t('emailTpl.variables')}</p>
            <p className="mb-2 text-xs text-ink-soft">{t('emailTpl.varsHint')}</p>
            <div className="flex flex-wrap gap-1.5">
              {tpl.variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVar(v)}
                  className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-ink-soft ring-1 ring-surface-border hover:ring-brand-leaf"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">{t('emailTpl.previewTitle')}</p>
            <Button size="sm" variant="outline" disabled={preview.isPending} onClick={() => preview.mutate()}>
              {t('emailTpl.preview')}
            </Button>
          </div>
          <div className="h-[360px] overflow-hidden rounded-lg border border-surface-border bg-white">
            {previewHtml ? (
              <iframe title="preview" srcDoc={previewHtml} className="h-full w-full" sandbox="" />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-soft">
                {t('emailTpl.preview')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? t('emailTpl.saving') : t('emailTpl.save')}
        </Button>
        <Button variant="outline" disabled={test.isPending} onClick={() => test.mutate()}>
          {test.isPending ? t('emailTpl.sending') : t('emailTpl.sendTest')}
        </Button>
        <Button variant="ghost" onClick={resetToDefault}>
          {t('emailTpl.reset')}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t('emailTpl.close')}
        </Button>
      </div>
    </div>
  );
}

/** Admin-editable transactional email templates, grouped by category. */
export function EmailTemplatesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery<ApiEmailTemplate[]>({
    queryKey: ['admin-email-templates'],
    queryFn: () => api.admin.emailTemplates(),
    retry: 1,
  });
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggleEnabled = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      api.admin.updateEmailTemplate(key, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-email-templates'] }),
  });

  const grouped = useMemo(() => {
    const by: Record<string, ApiEmailTemplate[]> = {};
    for (const tpl of templates) (by[tpl.category] ??= []).push(tpl);
    return CATEGORY_ORDER.filter((c) => by[c]?.length).map((c) => ({ category: c, items: by[c] }));
  }, [templates]);

  const isEdited = (tpl: ApiEmailTemplate) => tpl.subject !== tpl.defaultSubject || tpl.bodyHtml !== tpl.defaultBodyHtml;

  return (
    <div>
      <PageHeader
        title={t('nav.emailTemplates')}
        subtitle={t('emailTpl.sub')}
        action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>}
      />

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, items }) => (
            <div key={category}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                {CATEGORY_LABEL[category] ?? category}
              </h3>
              <Card padded={false} className="divide-y divide-surface-border">
                {items.map((tpl) => {
                  const open = openKey === tpl.key;
                  return (
                    <div key={tpl.key} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                            {tpl.name}
                            {isEdited(tpl) ? (
                              <Badge tone="gold">{t('emailTpl.editedBadge')}</Badge>
                            ) : (
                              <Badge tone="slate">{t('emailTpl.defaultBadge')}</Badge>
                            )}
                          </div>
                          <div className="truncate text-xs text-ink-soft">{tpl.description || tpl.key}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={toggleEnabled.isPending}
                            onClick={() => toggleEnabled.mutate({ key: tpl.key, enabled: !tpl.enabled })}
                          >
                            {tpl.enabled ? t('emailTpl.disable') : t('emailTpl.enable')}
                          </Button>
                          <Button size="sm" onClick={() => setOpenKey(open ? null : tpl.key)}>
                            {open ? t('emailTpl.close') : t('emailTpl.edit')}
                          </Button>
                        </div>
                      </div>
                      {open && <TemplateEditor tpl={tpl} onClose={() => setOpenKey(null)} />}
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
