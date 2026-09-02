import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiAdminWallet, ApiAdminPayments, ApiCommissionCharge, ApiOrder } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { errMessage } from '../lib/errors';
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

/**
 * The agent queue. Auction wins and awarded buyer bids are minted parked in
 * `processing` and cannot be packed or dispatched until someone here has checked
 * the deal and cleared it.
 */
function EscrowQueue() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['admin-escrow-queue'],
    queryFn: () => api.admin.escrowQueue('false'),
    retry: 1,
  });
  const verify = useMutation({
    mutationFn: (id: string) => api.admin.verifyOrder(id),
    onSuccess: () => {
      toast.success(t('sd.verifyDone'));
      qc.invalidateQueries({ queryKey: ['admin-escrow-queue'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });

  return (
    <Card padded={false} className="mb-5">
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-3">
        <div>
          <div className="font-display font-bold text-ink">{t('sd.escrowQueueTitle')}</div>
          <div className="text-xs text-ink-soft">{t('sd.escrowQueueHint')}</div>
        </div>
        <Badge tone={orders.length ? 'mango' : 'slate'}>{orders.length}</Badge>
      </div>
      {isLoading ? (
        <div className="px-5 py-8 text-center text-sm text-ink-soft">{t('common:loading')}</div>
      ) : orders.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-soft">{t('sd.escrowQueueEmpty')}</div>
      ) : (
        <div className="divide-y divide-surface-border">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="font-semibold text-ink">{o.reference}</div>
                <div className="text-xs text-ink-soft">
                  {o.note ?? '\u2014'}
                  {o.buyerFeeCents ? ` \u00b7 ${t('sd.buyerFee')} ${usd(o.buyerFeeCents)}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-numeric font-bold text-ink">{usd((o.amountCents ?? 0) + (o.buyerFeeCents ?? 0))}</span>
                <Button size="sm" onClick={() => verify.mutate(o.id)} disabled={verify.isPending}>
                  {t('sd.verify')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * What won auctions and awarded bids owe the platform. These are RECORDS, not
 * money movements - the agent collects off-platform and marks the row here.
 */
function CommissionCharges() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const { data: charges = [], isLoading } = useQuery<ApiCommissionCharge[]>({
    queryKey: ['admin-commission-charges', status],
    queryFn: () => api.admin.commissionCharges({ status }),
    retry: 1,
  });
  const settle = useMutation({
    mutationFn: (v: { id: string; status: 'collected' | 'waived' }) => api.admin.settleCommissionCharge(v.id, v.status),
    onSuccess: () => {
      toast.success(t('sd.chargeSettled'));
      qc.invalidateQueries({ queryKey: ['admin-commission-charges'] });
    },
    onError: (e) => toast.error(errMessage(e, t('genericError'))),
  });
  const pendingTotal = charges.filter((c) => c.status === 'pending').reduce((n, c) => n + c.amountCents, 0);

  return (
    <Card padded={false} className="mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-5 py-3">
        <div>
          <div className="font-display font-bold text-ink">{t('sd.chargesTitle')}</div>
          <div className="text-xs text-ink-soft">{t('sd.chargesHint')}</div>
        </div>
        <div className="flex items-center gap-2">
          {pendingTotal > 0 && <span className="font-numeric font-bold text-brand-dark">{usd(pendingTotal)}</span>}
          {['pending', 'collected', 'waived'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' +
                (status === s ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')
              }
            >
              {t(`sd.chargeStatus.${s}`)}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="px-5 py-8 text-center text-sm text-ink-soft">{t('common:loading')}</div>
      ) : charges.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-soft">{t('sd.chargesEmpty')}</div>
      ) : (
        <div className="divide-y divide-surface-border">
          {charges.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={c.kind === 'auction' ? 'green' : 'info'}>{t(`sd.chargeKind.${c.kind}`)}</Badge>
                  <span className="font-semibold text-ink">{c.payer?.name ?? c.payerId}</span>
                </div>
                <div className="text-xs text-ink-soft">
                  {t('sd.chargeBasis', { rate: (c.rateBps / 100).toFixed(2), base: usd(c.baseCents) })}
                  {c.note ? ` \u00b7 ${c.note}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-numeric font-bold text-ink">{usd(c.amountCents)}</span>
                {c.status === 'pending' ? (
                  <>
                    <Button size="sm" onClick={() => settle.mutate({ id: c.id, status: 'collected' })} disabled={settle.isPending}>
                      {t('sd.markCollected')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => settle.mutate({ id: c.id, status: 'waived' })} disabled={settle.isPending}>
                      {t('sd.waive')}
                    </Button>
                  </>
                ) : (
                  <Badge tone="slate">{t(`sd.chargeStatus.${c.status}`)}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Company-wide financial oversight: every wallet, escrow, per-role balances. */
export function SafeDealPage() {
  const { t } = useI18n();
  const [role, setRole] = useState('all');
  const [viewing, setViewing] = useState<string | null>(null);

  const { data: payments } = useQuery<ApiAdminPayments>({ queryKey: ['admin-payments'], queryFn: () => api.admin.payments(), retry: 1 });
  const { data: wallets = [], isError } = useQuery<ApiAdminWallet[]>({
    queryKey: ['admin-wallets', role],
    queryFn: () => api.admin.wallets(undefined, role === 'all' ? undefined : role),
    retry: 1,
  });
  const byRole = payments?.byRole ?? {};
  const ROLES = ['all', 'buyer', 'seller', 'transporter', 'loaderco', 'worker'];

  return (
    <div>
      {/* ADM-03/G3: badge reflects the real fetch state, not a hardcoded green. */}
      <PageHeader title={t('nav.safedeal')} subtitle={t('sd.sub')} action={<Badge tone={isError ? 'error' : 'green'}>{isError ? t('apiBadge.offline') : t('roleReq.liveApi')}</Badge>} />

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

      <EscrowQueue />
      <CommissionCharges />

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
