import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiBuyerBidDetail } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, Input, Row, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** The buyer's own view: the headline price plus the award action lives in the book. */
function OwnerPanel({ bid }: { bid: ApiBuyerBidDetail }) {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  return (
    <Card style={{ gap: 8 }}>
      <Txt variant="h3">{t('buyerX.room.ownerNote')}</Txt>
      <Txt variant="muted">{t('buyerX.room.ownerHint')}</Txt>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Txt variant="muted">{bid.bestPriceCents != null ? t('buyerX.bids.bestOffer') : t('buyerX.room.awaitingBids')}</Txt>
          <Txt variant="h3" color={C.dark}>
            {bid.bestPriceCents != null ? `${fmtCents(bid.bestPriceCents)}/${bid.qtyUnit}` : '—'}
          </Txt>
        </View>
        <Badge label={bid.status} tone={bid.status === 'open' ? 'green' : 'slate'} />
      </Row>
    </Card>
  );
}

/** Seller offers a price. In auction mode it must undercut the current best. */
function SellerPanel({ bid }: { bid: ApiBuyerBidDetail }) {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const qc = useQueryClient();
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState(String(bid.qtyValue));
  const [eta, setEta] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      api.buyerBids.submitBid(bid.id, {
        priceCents: Math.round(Number(price) * 100),
        qtyValue: Number(qty),
        etaDays: eta ? Number(eta) : undefined,
        message: message || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyer-bids', 'open'] });
      qc.invalidateQueries({ queryKey: ['seller-bids', 'mine'] });
      qc.invalidateQueries({ queryKey: ['buyer-bid-detail', bid.id] });
      qc.invalidateQueries({ queryKey: ['buyer-bid-book', bid.id] });
      setPrice(''); setEta(''); setMessage(''); setError('');
    },
    onError: (e) => setError(errMessage(e, t('buyerX.room.errSubmit'))),
  });

  if (bid.status !== 'open') {
    return <Card><Txt variant="muted">{t('buyerX.room.closedNote')}</Txt></Card>;
  }

  return (
    <Card style={{ gap: 10 }}>
      <Txt variant="h3">{bid.yourBestPriceCents != null ? t('buyerX.room.updateBid') : t('buyerX.room.yourOffer')}</Txt>

      {bid.yourBestPriceCents != null ? (
        <Txt variant="muted">{t('buyerX.room.yourCurrent', { price: fmtCents(bid.yourBestPriceCents), unit: bid.qtyUnit })}</Txt>
      ) : null}

      {/* Reverse auctions publish the floor; sealed quote-mode requirements never do. */}
      {bid.mode === 'auction' ? (
        <Txt variant="muted" color={C.dark}>
          {bid.bestPriceCents != null
            ? t('buyerX.room.mustBeat', { price: fmtCents(bid.bestPriceCents), unit: bid.qtyUnit })
            : t('buyerX.room.noBidsOpening')}
        </Txt>
      ) : null}

      {!!error && <Txt color={C.error} variant="small">{error}</Txt>}

      <Input label={t('buyerX.room.fieldPrice', { unit: bid.qtyUnit })} keyboardType="numeric" value={price} onChangeText={setPrice} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('buyerX.room.fieldQty', { unit: bid.qtyUnit })} keyboardType="numeric" value={qty} onChangeText={setQty} /></View>
        <View style={{ flex: 1 }}><Input label={t('buyerX.room.fieldEta')} keyboardType="numeric" value={eta} onChangeText={setEta} /></View>
      </Row>
      <Input label={t('buyerX.room.fieldMessage')} value={message} onChangeText={setMessage} />
      <Button
        title={submit.isPending ? t('buyerX.room.submitting') : t('buyerX.room.submitBid')}
        disabled={!Number(price) || !Number(qty) || submit.isPending}
        onPress={() => submit.mutate()}
        full
      />
    </Card>
  );
}

/** Owner sees the standing; a signed-in seller gets the submit form. */
export function BuyerBidPanel({ bid }: { bid: ApiBuyerBidDetail }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigation<Nav>();

  if (!user) {
    return (
      <Card style={{ gap: 10 }}>
        <Txt variant="muted">{t('buyerX.room.signInToBid')}</Txt>
        <Button title={t('buyerX.room.signIn')} onPress={() => nav.navigate('SignIn', { reason: 'bid' })} full />
      </Card>
    );
  }
  return bid.isOwner ? <OwnerPanel bid={bid} /> : <SellerPanel bid={bid} />;
}
