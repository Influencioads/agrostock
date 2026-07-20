import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiEarnings, ApiWallet } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { usd, errMessage } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, EmptyState, Input, Row, Screen, Txt } from '../../ui';
import { BarChart } from '../../ui/charts';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';

/**
 * Download the wallet statement as a PDF or CSV. The API mints a short-lived
 * signed URL and the OS opens it — the token rides in the query string because
 * `Linking.openURL` cannot attach an auth header.
 */
function StatementButtons() {
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const open = async (kind: 'pdf' | 'csv') => {
    setBusy(kind);
    try {
      await Linking.openURL(await api.me.statementUrl(kind));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Row gap={8}>
      <Button title={busy === 'pdf' ? '…' : 'PDF'} size="sm" variant="outline" icon="download-outline" disabled={busy !== null} onPress={() => open('pdf')} />
      <Button title={busy === 'csv' ? '…' : 'CSV'} size="sm" variant="outline" icon="download-outline" disabled={busy !== null} onPress={() => open('csv')} />
    </Row>
  );
}

function TxnList({ txns, emptyBody }: { txns: ApiWallet['txns']; emptyBody: string }) {
  const { t } = useI18n();
  if (txns.length === 0) return <EmptyState icon="wallet-outline" title={t('compX.txn.empty')} body={emptyBody} />;
  return (
    <>
      {txns.map((tx) => (
        <Card key={tx.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt variant="title">{tx.note ?? tx.type}</Txt>
              <Txt variant="muted">{new Date(tx.createdAt).toLocaleDateString()}</Txt>
            </View>
            <Txt variant="title" color={tx.amountCents < 0 ? C.ink : C.green}>{usd(tx.amountCents)}</Txt>
          </Row>
        </Card>
      ))}
    </>
  );
}

/**
 * Add-money wallet — balance, top-up and full transaction history. Every role
 * uses this to fund orders and to hire transporters, loaders or workers.
 */
export function WalletScreen({ title }: { title?: string } = {}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const { data: wallet } = useQuery<ApiWallet>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet(), enabled: !!user });

  const topup = useMutation({
    mutationFn: () => api.me.topup(Number(amount)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me-wallet'] }); setAmount(''); setErr(''); },
    onError: (e) => setErr(errMessage(e, t('compX.wallet.topUpError'))),
  });

  return (
    <Screen>
      <Txt variant="h2">{title ?? t('compX.wallet.title')}</Txt>
      <Txt variant="muted">{t('compX.wallet.subtitle')}</Txt>
      <Card style={{ backgroundColor: C.evergreen }}>
        <Txt variant="muted" color={C.mint}>{t('compX.wallet.availableBalance')}</Txt>
        <Txt color={C.white} style={{ fontSize: 30, fontWeight: '800', marginTop: 4 }}>{usd(wallet?.balanceCents)}</Txt>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt variant="title">{t('compX.wallet.addFunds')}</Txt>
        {!!err && <Txt color={C.error} variant="small">{err}</Txt>}
        <Row gap={8}>
          <View style={{ flex: 1 }}>
            <Input placeholder={t('compX.common.amountUsd')} keyboardType="numeric" value={amount} onChangeText={setAmount} />
          </View>
          <Button title={topup.isPending ? t('compX.wallet.adding') : t('compX.wallet.topUp')} disabled={topup.isPending || !Number(amount)} onPress={() => topup.mutate()} />
        </Row>
      </Card>

      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="h3">{t('compX.wallet.transactions')}</Txt>
        <StatementButtons />
      </Row>
      <TxnList txns={wallet?.txns ?? []} emptyBody={t('compX.wallet.emptyBody')} />
    </Screen>
  );
}

/**
 * Read-only earnings — money earned from completed work (payouts), with a
 * this-week / this-month breakdown and a withdraw action. Never shows top-ups.
 */
export function EarningsScreen({ title, edges }: { title?: string; edges?: ('top' | 'bottom')[] } = {}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const { data: earnings } = useQuery<ApiEarnings>({ queryKey: ['me-earnings'], queryFn: () => api.me.earnings(), enabled: !!user });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series(), enabled: !!user });

  const withdraw = useMutation({
    mutationFn: () => api.me.withdraw(Number(amount)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-earnings'] });
      qc.invalidateQueries({ queryKey: ['me-wallet'] });
      setAmount(''); setErr('');
    },
    onError: (e) => setErr(errMessage(e, t('compX.earnings.withdrawError'))),
  });

  return (
    <Screen edges={edges}>
      <Txt variant="h2">{title ?? t('compX.earnings.title')}</Txt>
      <Card style={{ backgroundColor: C.evergreen }}>
        <Txt variant="muted" color={C.mint}>{t('compX.earnings.totalEarned')}</Txt>
        <Txt color={C.white} style={{ fontSize: 30, fontWeight: '800', marginTop: 4 }}>{usd(earnings?.earnedCents)}</Txt>
        <Row gap={10} style={{ marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10 }}>
            <Txt variant="muted" color={C.mint}>{t('compX.earnings.thisWeek')}</Txt>
            <Txt color={C.white} variant="title">{usd(earnings?.weekCents)}</Txt>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10 }}>
            <Txt variant="muted" color={C.mint}>{t('compX.earnings.thisMonth')}</Txt>
            <Txt color={C.white} variant="title">{usd(earnings?.monthCents)}</Txt>
          </View>
        </Row>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt variant="title">{t('compX.earnings.withdraw')}</Txt>
        {!!err && <Txt color={C.error} variant="small">{err}</Txt>}
        <Row gap={8}>
          <View style={{ flex: 1 }}>
            <Input placeholder={t('compX.common.amountUsd')} keyboardType="numeric" value={amount} onChangeText={setAmount} />
          </View>
          <Button title={withdraw.isPending ? t('compX.earnings.withdrawing') : t('compX.earnings.withdraw')} disabled={withdraw.isPending || !Number(amount)} onPress={() => withdraw.mutate()} />
        </Row>
      </Card>

      <BarChart title={t('compX.earnings.chartTitle')} caption={t('compX.earnings.chartCaption')} data8={series?.data8} data12={series?.data12} />
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="h3">{t('compX.earnings.history')}</Txt>
        <StatementButtons />
      </Row>
      <TxnList txns={earnings?.txns ?? []} emptyBody={t('compX.earnings.emptyBody')} />
    </Screen>
  );
}
