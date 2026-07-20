import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiAdminWallet, ApiAdminPayments } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

const usd = (cents: number) => '$' + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

function LedgerDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ['admin-wallet-ledger', userId], queryFn: () => api.admin.walletLedger(userId) });
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-s border-surface-border bg-surface-bg p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{t('sd.ledgerTitle')}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x" size={18} />
          </Button>
        </div>
        {!data ? (
          <Card className="py-14 text-center text-ink-soft">{t('common:loading')}</Card>
        ) : (
          <div className="space-y-4">
            <Card className="flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-ink">{data.user?.name ?? '—'}</div>
                <div className="text-xs text-ink-soft">{t(`enums:role.${data.user?.role}`, { defaultValue: data.user?.role })}</div>
              </div>
              <div className="font-numeric text-xl font-extrabold text-brand-dark">{usd(data.balanceCents)}</div>
            </Card>
            <Card padded={false}>
              <div className="border-b border-surface-border px-4 py-3 font-display font-bold text-ink">{t('sd.txnsCount', { count: data.txns.length })}</div>
              <div className="divide-y divide-surface-border">
                {data.txns.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div>
                      <div className="text-ink">{t(`sd.txType.${tx.type}`, { defaultValue: tx.type.replace(/_/g, ' ') })}</div>
                      <div className="text-xs text-ink-soft">{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <span className={'font-numeric font-semibold ' + (tx.amountCents >= 0 ? 'text-status-success' : 'text-status-error')}>
                      {tx.amountCents >= 0 ? '+' : ''}
                      {usd(tx.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

/** Company-wide financial oversight: every wallet, escrow, per-role balances. */
export function SafeDealPage() {
  const { t } = useI18n();
  const [role, setRole] = useState('all');
  const [viewing, setViewing] = useState<string | null>(null);

  const { data: payments } = useQuery<ApiAdminPayments>({ queryKey: ['admin-payments'], queryFn: () => api.admin.payments(), retry: 1 });
  const { data: wallets = [] } = useQuery<ApiAdminWallet[]>({
    queryKey: ['admin-wallets', role],
    queryFn: () => api.admin.wallets(undefined, role === 'all' ? undefined : role),
    retry: 1,
  });
  const byRole = payments?.byRole ?? {};
  const ROLES = ['all', 'buyer', 'seller', 'transporter', 'loaderco', 'worker'];

  return (
    <div>
      <PageHeader title={t('nav.safedeal')} subtitle={t('sd.sub')} action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>} />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-xs text-ink-soft">{t('sd.totalOnPlatform')}</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-ink">{usd(payments?.totalBalanceCents ?? 0)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">{t('sd.inEscrow')}</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-ink">{usd(payments?.escrowHeldCents ?? 0)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">{t('sd.wallets')}</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-ink">{payments?.walletCount ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">{t('sd.sellerBalances')}</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-ink">{usd(byRole.seller ?? 0)}</div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' + (role === r ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')}
          >
            {r === 'all' ? t('sd.allRoles') : t(`enums:role.${r}`, { defaultValue: r })}
            {r !== 'all' && byRole[r] != null ? ` · ${usd(byRole[r])}` : ''}
          </button>
        ))}
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3">{t('sd.colAccount')}</th>
                <th className="px-5 py-3">{t('sd.colRole')}</th>
                <th className="px-5 py-3 text-end">{t('sd.colBalance')}</th>
                <th className="px-5 py-3 text-end">{t('sd.colLedger')}</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((w) => (
                <tr key={w.userId} className="border-b border-surface-border/70 last:border-0 hover:bg-brand-surface/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={w.user?.name ?? '?'} size={30} />
                      <div>
                        <div className="font-semibold text-ink">{w.user?.name}</div>
                        <div className="text-xs text-ink-soft">{w.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="slate">{t(`enums:role.${w.user?.role}`, { defaultValue: w.user?.role })}</Badge>
                  </td>
                  <td className="px-5 py-3 text-end font-numeric font-bold text-ink">{usd(w.balanceCents)}</td>
                  <td className="px-5 py-3 text-end">
                    <Button size="sm" variant="outline" onClick={() => setViewing(w.userId)}>
                      {t('bidsAdmin.view')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {viewing && <LedgerDrawer userId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
