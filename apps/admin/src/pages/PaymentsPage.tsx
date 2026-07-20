import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Stat, Icon, Input, type BadgeTone } from '@agrotraders/ui';
import type { ApiAdminWallet } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useFormat } from '../lib/useFormat';

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const typeTone: Record<string, BadgeTone> = {
  topup: 'info',
  escrow_hold: 'warn',
  escrow_release: 'green',
  payout: 'green',
  refund: 'slate',
};

const usd = (cents: number) => '$' + (cents / 100).toLocaleString();

/** Quick preset ranges → {from,to} ISO dates. */
function presetRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === 'today') return { from: iso(now), to: iso(now) };
  if (preset === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { from: iso(d), to: iso(now) };
  }
  if (preset === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { from: iso(d), to: iso(now) };
  }
  return {};
}

export function PaymentsPage() {
  const fmt = useFormat();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [walletSearch, setWalletSearch] = useState('');
  const [adjust, setAdjust] = useState<{ userId: string; amount: string; type: 'topup' | 'refund' | 'payout' | 'withdraw' } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-payments', range], queryFn: () => api.admin.payments(range), retry: 1 });
  const { data: payouts = [] } = useQuery({ queryKey: ['admin-payouts'], queryFn: () => api.admin.payouts('pending'), retry: 1 });
  const { data: searchWallets = [] } = useQuery<ApiAdminWallet[]>({
    queryKey: ['admin-wallets-search', walletSearch],
    queryFn: () => api.admin.wallets(walletSearch),
    enabled: walletSearch.length >= 2,
    retry: 1,
  });

  const byType = data?.byType ?? {};
  const txns = data?.txns ?? [];

  const decidePayout = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => api.admin.decidePayout(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-payouts'] });
      void qc.invalidateQueries({ queryKey: ['admin-payments'] });
      void qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });
  const addMoney = useMutation({
    mutationFn: (a: { userId: string; amount: string; type: 'topup' | 'refund' | 'payout' | 'withdraw' }) =>
      api.admin.adjustWallet(a.userId, { amountCents: Math.round(parseFloat(a.amount) * 100), type: a.type }),
    onSuccess: () => {
      setAdjust(null);
      void qc.invalidateQueries({ queryKey: ['admin-payments'] });
      void qc.invalidateQueries({ queryKey: ['admin-wallets-search'] });
      void qc.invalidateQueries({ queryKey: ['admin-wallets'] });
    },
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });

  async function exportStatement(kind: 'csv' | 'pdf') {
    setDownloading(kind);
    try {
      const blob = await api.admin.paymentsStatement(kind, range);
      const stamp = new Date().toISOString().slice(0, 10);
      saveBlob(blob, `platform-statement-${stamp}.${kind}`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('page.payments.title')}
        subtitle={t('page.payments.subtitle')}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={!data || downloading !== null} onClick={() => exportStatement('csv')} leftIcon={<Icon name="file" size={14} />}>
              {downloading === 'csv' ? t('payments.exporting') : t('payments.exportCsv')}
            </Button>
            <Button size="sm" variant="outline" disabled={!data || downloading !== null} onClick={() => exportStatement('pdf')} leftIcon={<Icon name="file" size={14} />}>
              {downloading === 'pdf' ? t('payments.exporting') : t('payments.exportPdf')}
            </Button>
            <Badge tone={data ? 'green' : 'warn'}>{data ? t('apiBadge.live') : t('apiBadge.connecting')}</Badge>
          </div>
        }
      />

      {/* Date filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          {['today', 'week', 'month', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setRange(presetRange(p))}
              className="rounded-full bg-brand-surface px-3 py-1 text-xs font-semibold capitalize text-ink-soft hover:text-ink"
            >
              {p === 'all' ? t('range.allTime') : t(`payments.preset.${p}`)}
            </button>
          ))}
        </div>
        <label className="text-xs text-ink-soft">
          {t('range.from')}
          <input type="date" value={range.from ?? ''} onChange={(e) => setRange({ ...range, from: e.target.value || undefined })} className="ms-2 h-8 rounded-md border border-surface-border px-2 text-sm" />
        </label>
        <label className="text-xs text-ink-soft">
          {t('range.to')}
          <input type="date" value={range.to ?? ''} onChange={(e) => setRange({ ...range, to: e.target.value || undefined })} className="ms-2 h-8 rounded-md border border-surface-border px-2 text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat className="h-full" label={t('payments.stats.totalBalance')} value={fmt.money(data?.totalBalanceCents ?? 0)} icon={<Icon name="wallet" size={18} />} />
        <Stat className="h-full" label={t('payments.stats.wallets')} value={String(data?.walletCount ?? 0)} icon={<Icon name="user" size={18} />} />
        <Stat className="h-full" label={t('payments.stats.escrowReleased')} value={fmt.money(byType.escrow_release ?? 0)} icon={<Icon name="shield" size={18} />} />
        <Stat className="h-full" label={t('payments.stats.payouts')} value={fmt.money(byType.payout ?? 0)} icon={<Icon name="check" size={18} />} />
      </div>

      {/* Payout request queue */}
      <Card className="mt-6" padded={false}>
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{t('payments.payoutRequests')}</h3>
          <Badge tone={payouts.length ? 'warn' : 'slate'}>{t('payments.pendingCount', { count: payouts.length })}</Badge>
        </div>
        {payouts.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">{t('payments.noPending')}</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-semibold text-ink">{p.user?.name ?? '—'}</div>
                  <div className="text-xs text-ink-soft">
                    {p.user?.role ? t(`enums:role.${p.user.role}`, { defaultValue: p.user.role }) : ''} · {t('payments.requested', { date: new Date(p.createdAt).toLocaleDateString() })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-numeric font-bold text-ink">{usd(p.amountCents)}</span>
                  <Button size="sm" disabled={decidePayout.isPending} onClick={() => decidePayout.mutate({ id: p.id, status: 'approved' })}>
                    {t('prodMod.approve')}
                  </Button>
                  <Button size="sm" variant="outline" disabled={decidePayout.isPending} onClick={() => decidePayout.mutate({ id: p.id, status: 'rejected' })}>
                    {t('prodMod.reject')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add money to a wallet */}
      <Card className="mt-6">
        <h3 className="mb-2 font-display text-lg font-bold text-ink">{t('payments.addMoney')}</h3>
        <label className="flex items-center gap-2 rounded-md border border-surface-border px-3">
          <Icon name="search" size={16} className="text-ink-soft" />
          <input value={walletSearch} onChange={(e) => setWalletSearch(e.target.value)} placeholder={t('payments.searchUser')} className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft" />
        </label>
        {walletSearch.length >= 2 && (
          <div className="mt-3 divide-y divide-surface-border rounded-md border border-surface-border">
            {searchWallets.length === 0 ? (
              <p className="px-3 py-3 text-sm text-ink-soft">{t('payments.noMatches')}</p>
            ) : (
              searchWallets.slice(0, 6).map((w) => (
                <div key={w.userId} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-ink">{w.user?.name}</div>
                      <div className="text-xs text-ink-soft">
                        {w.user?.role ? t(`enums:role.${w.user.role}`, { defaultValue: w.user.role }) : ''} · {t('payments.balance', { amount: usd(w.balanceCents) })}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setAdjust({ userId: w.userId, amount: '', type: 'topup' })}>
                      {t('payments.adjust')}
                    </Button>
                  </div>
                  {adjust?.userId === w.userId && (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <Input label={t('payments.amountUsd')} value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} />
                      <select value={adjust.type} onChange={(e) => setAdjust({ ...adjust, type: e.target.value as typeof adjust.type })} className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm">
                        <option value="topup">{t('payments.creditTopup')}</option>
                        <option value="refund">{t('payments.creditRefund')}</option>
                        <option value="withdraw">{t('payments.debitWithdraw')}</option>
                        <option value="payout">{t('payments.debitPayout')}</option>
                      </select>
                      <Button size="sm" disabled={!adjust.amount || addMoney.isPending} onClick={() => addMoney.mutate(adjust)}>
                        {addMoney.isPending ? t('payments.applying') : t('payments.apply')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdjust(null)}>
                        {t('common:cancel')}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <Card className="mt-6" padded={false}>
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{t('payments.recentTxns')}</h3>
          <Badge tone="slate">{t('payments.shownCount', { count: txns.length })}</Badge>
        </div>
        {isLoading ? (
          <p className="px-5 py-8 text-center text-ink-soft">{t('common:loading')}</p>
        ) : txns.length === 0 ? (
          <p className="px-5 py-8 text-center text-ink-soft">{t('payments.noTxns')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">{t('common:table.user')}</th>
                  <th className="px-5 py-3">{t('common:table.type')}</th>
                  <th className="px-5 py-3">{t('common:table.note')}</th>
                  <th className="px-5 py-3">{t('common:table.date')}</th>
                  <th className="px-5 py-3 text-end">{t('common:table.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((tx) => (
                  <tr key={tx.id} className="border-b border-surface-border/70 last:border-0">
                    <td className="px-5 py-3 font-semibold text-ink">{tx.user?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={typeTone[tx.type] ?? 'slate'}>{t(`sd.txType.${tx.type}`, { defaultValue: tx.type.replace('_', ' ') })}</Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{tx.note ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-soft">{fmt.date(tx.createdAt)}</td>
                    <td className="px-5 py-3 text-end font-numeric font-bold text-ink">{fmt.money(tx.amountCents)}</td>
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
