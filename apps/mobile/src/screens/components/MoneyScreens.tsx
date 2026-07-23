import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiEarnings, ApiWallet } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { Button, Card, EmptyState, Input, Row, Screen, Txt } from '../../ui';
import { BarChart } from '../../ui/charts';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { useI18n } from '../../i18n';

/** Full-bleed gradient balance card — the prototype's evergreen hero panel. */
function BalanceCard({ label, amount, children }: { label: string; amount: string; children?: React.ReactNode }) {
  return (
    <LinearGradient colors={['#0B3D2E', '#146B3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={m.balance}>
      <Text style={[m.balanceLabel, microLabel()]}>{label}</Text>
      <Text style={m.balanceAmount}>{amount}</Text>
      {children}
    </LinearGradient>
  );
}

/** Icon medallion for a transaction, tinted by credit vs debit. */
function TxnIcon({ credit }: { credit: boolean }) {
  return (
    <View style={[m.txnIcon, { backgroundColor: credit ? C.surface : C.page }]}>
      <Ionicons name={credit ? 'arrow-down' : 'arrow-up'} size={17} color={credit ? C.green : C.inkSoft} />
    </View>
  );
}

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
  const { fmtCents } = useCurrency();
  if (txns.length === 0) return <EmptyState icon="wallet-outline" title={t('compX.txn.empty')} body={emptyBody} />;
  return (
    <>
      {txns.map((tx) => {
        const credit = tx.amountCents >= 0;
        return (
          <Card key={tx.id}>
            <Row gap={12} style={{ alignItems: 'center' }}>
              <TxnIcon credit={credit} />
              <View style={{ flex: 1 }}>
                <Txt variant="title">{tx.note ?? tx.type}</Txt>
                <Txt variant="muted">{new Date(tx.createdAt).toLocaleDateString()}</Txt>
              </View>
              <Text style={{ ...type.numeric, fontSize: 15, color: credit ? C.green : C.ink }}>
                {credit ? '+ ' : '− '}{fmtCents(Math.abs(tx.amountCents))}
              </Text>
            </Row>
          </Card>
        );
      })}
    </>
  );
}

/**
 * Read-only wallet balance and transaction history.
 *
 * Every route that hosts this screen shows a navigator header titled "Wallet",
 * so the screen deliberately renders no heading of its own — only the subtitle.
 */
export function WalletScreen() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const { user } = useAuth();
  const { data: wallet } = useQuery<ApiWallet>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet(), enabled: !!user });

  return (
    <Screen>
      <Txt variant="muted">{t('compX.wallet.subtitle')}</Txt>
      <BalanceCard label={t('compX.wallet.availableBalance')} amount={fmtCents(wallet?.balanceCents)} />

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
 *
 * `showTitle` exists because hosting differs: the worker Earnings tab has no
 * navigator header (needs the internal heading), while Section-routed uses
 * already show one (a second heading would double up).
 */
export function EarningsScreen({ title, edges, showTitle = true }: { title?: string; edges?: ('top' | 'bottom')[]; showTitle?: boolean } = {}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
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
      {showTitle ? <Txt variant="h2">{title ?? t('compX.earnings.title')}</Txt> : null}
      <BalanceCard label={t('compX.earnings.totalEarned')} amount={fmtCents(earnings?.earnedCents)}>
        <Row gap={10} style={{ marginTop: 14 }}>
          <View style={m.subCell}>
            <Text style={[m.balanceLabel, microLabel()]}>{t('compX.earnings.thisWeek')}</Text>
            <Text style={m.subValue}>{fmtCents(earnings?.weekCents)}</Text>
          </View>
          <View style={m.subCell}>
            <Text style={[m.balanceLabel, microLabel()]}>{t('compX.earnings.thisMonth')}</Text>
            <Text style={m.subValue}>{fmtCents(earnings?.monthCents)}</Text>
          </View>
        </Row>
      </BalanceCard>

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

const m = StyleSheet.create({
  balance: { borderRadius: radius.card, padding: space.xl, shadowColor: '#0B3D2E', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  balanceLabel: { ...type.micro, fontSize: 11, color: '#9ED8B0' },
  // lineHeight must scale with the enlarged size — type.numeric's 19 would clip.
  balanceAmount: { ...type.numeric, fontSize: 34, lineHeight: 42, color: C.white, marginTop: 6, letterSpacing: -0.5 },
  subCell: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.input, padding: 12 },
  subValue: { ...type.numeric, fontSize: 16, color: C.white, marginTop: 3 },
  txnIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
