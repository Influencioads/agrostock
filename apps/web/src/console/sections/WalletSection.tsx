import { useQuery } from '@tanstack/react-query';
import { Badge, Card } from '@agrotraders/ui';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { StatementButtons } from './StatementButtons';

interface WalletData {
  id: string;
  balanceCents: number;
  txns: { id: string; amountCents: number; type: string; note: string | null; createdAt: string }[];
}

const txTone: Record<string, 'green' | 'mango' | 'slate' | 'error'> = {
  topup: 'green',
  escrow_release: 'green',
  payout: 'green',
  escrow_hold: 'mango',
  refund: 'slate',
};

export function WalletSection() {
  const { t } = useI18n();
  const { data: wallet, isLoading } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: () => api.me.wallet() as Promise<WalletData>,
  });

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 font-display text-2xl font-extrabold text-ink">{t('console.money.walletTitle')}</h2>
      <p className="mb-5 text-sm text-ink-soft">{t('console.money.walletSub')}</p>
      <Card className="bg-brand-dock text-white">
        <div className="text-sm text-mint/80">{t('console.money.availableBalance')}</div>
        <div className="mt-1 font-display text-4xl font-extrabold">
          {isLoading ? '…' : usd(wallet?.balanceCents)}
        </div>
      </Card>

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{t('console.money.transactions')}</h3>
        <StatementButtons />
      </div>
      <div className="space-y-2">
        {(wallet?.txns ?? []).length === 0 ? (
          <Card className="py-8 text-center text-ink-soft">{t('console.money.noTransactions')}</Card>
        ) : (
          wallet!.txns.map((tx) => (
            <Card key={tx.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-semibold text-ink">{tx.note ?? t(`console.money.txType.${tx.type}`, { defaultValue: tx.type })}</div>
                <div className="text-xs text-ink-soft">{new Date(tx.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={txTone[tx.type] ?? 'slate'}>{t(`console.money.txType.${tx.type}`, { defaultValue: tx.type })}</Badge>
                <span className="font-numeric font-bold text-ink">{usd(tx.amountCents)}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
