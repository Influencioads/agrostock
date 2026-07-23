import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, type BadgeTone } from '@agrotraders/ui';
import type { ApiAdminInvoice } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { useFormat } from '../lib/useFormat';

const statusTone: Record<string, BadgeTone> = {
  draft: 'slate',
  issued: 'info',
  paid: 'green',
  void: 'error',
};

const STATUS_FILTERS = ['all', 'issued', 'paid', 'void', 'draft'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const humanize = (s: string) => s.replace(/_/g, ' ');

export function InvoicesPage() {
  const { t } = useI18n();
  const fmt = useFormat();
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');

  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => api.admin.invoices(),
    retry: 1,
  });

  const setStatusMut = useMutation({
    mutationFn: (id: string) => api.invoices.setStatus(id, 'void'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-invoices'] }),
  });

  const filtered = invoices.filter((inv) => {
    if (status !== 'all' && inv.status !== status) return false;
    if (q) {
      const hay = `${inv.number} ${inv.issuer?.name ?? ''} ${inv.recipient?.name ?? ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  async function openPdf(id: string) {
    // A fresh window opened synchronously dodges the popup blocker; we point it
    // at the tokenised URL once minted.
    const w = window.open('', '_blank');
    try {
      const url = await api.invoices.pdfUrl(id);
      if (w) w.location.href = url;
    } catch {
      w?.close();
    }
  }

  return (
    <div>
      <PageHeader
        title={t('page.invoices.title')}
        subtitle={t('page.invoices.subtitle', { count: invoices.length })}
        action={<Badge tone={isError ? 'warn' : 'green'}>{isError ? t('apiBadge.offline') : t('apiBadge.live')}</Badge>}
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-border p-4">
          <div className="flex gap-1 rounded-lg bg-brand-surface p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  'rounded-md px-3 py-1.5 text-sm font-bold capitalize transition ' +
                  (status === s ? 'bg-brand-gradient text-white' : 'text-ink-soft')
                }
              >
                {t(`invoicesAdmin.status.${s}`)}
              </button>
            ))}
          </div>
          <label className="flex w-full items-center gap-2 rounded-md border border-surface-border px-3 sm:ms-auto sm:w-auto">
            <Icon name="search" size={16} className="text-ink-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('invoicesAdmin.searchPh')}
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft sm:w-64"
            />
          </label>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-center text-ink-soft">{t('common:loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-ink-soft">{t('invoicesAdmin.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">{t('invoicesAdmin.colNumber')}</th>
                  <th className="px-5 py-3">{t('invoicesAdmin.colFromTo')}</th>
                  <th className="px-5 py-3">{t('invoicesAdmin.colKind')}</th>
                  <th className="px-5 py-3">{t('invoicesAdmin.colIssued')}</th>
                  <th className="px-5 py-3 text-end">{t('invoicesAdmin.colTotal')}</th>
                  <th className="px-5 py-3">{t('invoicesAdmin.colStatus')}</th>
                  <th className="px-5 py-3 text-end">{t('invoicesAdmin.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv: ApiAdminInvoice) => (
                  <tr key={inv.id} className="border-b border-surface-border/70 last:border-0 hover:bg-brand-surface/30">
                    <td className="px-5 py-3 font-numeric font-semibold text-ink">{inv.number}</td>
                    <td className="px-5 py-3 text-ink-soft">
                      {inv.issuer?.name ?? '—'} <span className="text-ink-soft/60">→</span> {inv.recipient?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="slate">{humanize(inv.kind)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{fmt.date(inv.issuedAt)}</td>
                    <td className="px-5 py-3 text-end font-numeric font-bold text-ink">{fmt.money(inv.totalCents)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone[inv.status] ?? 'slate'}>{t(`invoicesAdmin.status.${inv.status}`)}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openPdf(inv.id)} leftIcon={<Icon name="file" size={14} />}>
                          {t('invoicesAdmin.pdf')}
                        </Button>
                        {inv.status !== 'void' && inv.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={setStatusMut.isPending}
                            onClick={() => setStatusMut.mutate(inv.id)}
                          >
                            {t('invoicesAdmin.void')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
