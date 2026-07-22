import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import type { ApiEarnings } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { BarChart } from './BarChart';
import { StatementButtons } from './StatementButtons';
import { errMessage } from './order-parts';

/**
 * Read-only earnings view — money actually earned from completed work
 * (payouts / escrow releases), never top-ups. Shared by every earning role
 * (worker, seller, transporter, loader company). Funding a wallet to hire
 * others lives in the separate WalletSection.
 */
export function EarningsSection({ title, sub }: { title?: string; sub?: string } = {}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const { data: earnings } = useQuery<ApiEarnings>({ queryKey: ['me-earnings'], queryFn: () => api.me.earnings() });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series() });
  const txns = earnings?.txns ?? [];

  const withdraw = useMutation({
    mutationFn: (amt: number) => api.me.withdraw(amt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-earnings'] });
      qc.invalidateQueries({ queryKey: ['me-wallet'] });
      setAmount('');
      setErr('');
    },
    onError: (e) => setErr(errMessage(e, t('console.money.withdrawError'))),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{title ?? t('console.money.earningsTitle')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{sub ?? t('console.money.earningsSub')}</p>
      </div>

      <Card className="bg-brand-dock text-white">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10"><Icon name="wallet" size={24} /></span>
          <div>
            <div className="text-xs text-mint/80">{t('console.money.totalEarned')}</div>
            <div className="font-display text-3xl font-extrabold">{usd(earnings?.earnedCents)}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <div className="text-xs text-mint/80">{t('console.money.thisWeek')}</div>
            <div className="font-numeric text-lg font-bold">{usd(earnings?.weekCents)}</div>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <div className="text-xs text-mint/80">{t('console.money.thisMonth')}</div>
            <div className="font-numeric text-lg font-bold">{usd(earnings?.monthCents)}</div>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <Input placeholder={t('console.money.withdrawPlaceholder')} value={amount} onChange={(e) => setAmount(e.target.value)} className="text-ink" />
          </div>
          <Button
            variant="accent"
            disabled={withdraw.isPending || !Number(amount)}
            onClick={() => withdraw.mutate(Number(amount))}
          >
            {withdraw.isPending ? t('console.money.withdrawing') : t('console.money.withdraw')}
          </Button>
        </div>
      </Card>
      {!!err && <p className="-mt-3 text-sm text-red-600">{err}</p>}

      <BarChart title={t('console.money.earningsTrend')} caption={t('console.dash.perMonth')} data8={series?.data8} data12={series?.data12} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{t('console.money.earningsHistory')}</h3>
          <StatementButtons />
        </div>
        {txns.length === 0 ? (
          <Card className="py-8 text-center text-ink-soft">{t('console.money.noEarnings')}</Card>
        ) : (
          <div className="space-y-2">
            {txns.map((tx) => (
              <Card key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-ink">{tx.note ?? t(`console.money.txType.${tx.type}`, { defaultValue: tx.type })}</div>
                  <div className="text-xs text-ink-soft">{new Date(tx.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="green">{t('console.money.earnedBadge')}</Badge>
                  <span className="font-numeric font-bold text-ink">{usd(tx.amountCents)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
