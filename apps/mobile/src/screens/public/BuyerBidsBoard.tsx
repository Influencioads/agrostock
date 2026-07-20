import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiBuyerBid } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Button, Card, EmptyState, Loading, Row, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function endsIn(end: string | null | undefined, endedLabel: string) {
  if (!end) return '—';
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return endedLabel;
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/**
 * Public buyer-bids board — the reverse-auction mirror of `AuctionsBoard`.
 * Sellers underbid; identities are masked (only count + best price show here).
 * Tapping a card opens the bid room.
 */
export function BuyerBidsBoard() {
  const nav = useNavigation<Nav>();
  const { fmtCents } = useCurrency();
  const { t } = useI18n();
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  const { data: list = [], isLoading } = useQuery<ApiBuyerBid[]>({
    queryKey: ['buyer-bids-board'],
    queryFn: () => api.buyerBids.live(),
    refetchInterval: 5000,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={list}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ padding: space.lg, gap: 12 }}
        ListHeaderComponent={
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface }}>
            <Ionicons name="eye-off-outline" size={20} color={C.dark} />
            <Txt variant="small" style={{ flex: 1 }}>{t('buyerX.room.maskedNote')}</Txt>
          </Card>
        }
        ListEmptyComponent={isLoading ? <Loading /> : <EmptyState icon="clipboard-outline" title={t('pubX.bids.empty')} />}
        renderItem={({ item: b }) => {
          const ended = b.auctionEndsAt ? new Date(b.auctionEndsAt).getTime() <= Date.now() : false;
          const bidCount = b._count?.sellerBids ?? 0;
          return (
            <Card style={{ gap: 10 }} onPress={() => nav.navigate('BuyerBidRoom', { id: b.id })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge label={t('buyerX.room.reverseAuction')} tone="mango" />
                <Txt variant="muted">{t('buyerX.room.sellersN', { count: bidCount })}</Txt>
              </Row>
              <Row gap={10}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 24 }}>{b.category?.emoji ?? '🌾'}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="title" numberOfLines={1}>{b.title}</Txt>
                  <Txt variant="muted">{b.qtyValue} {b.qtyUnit}{b.deliveryPlace ? ` · ${b.deliveryPlace}` : ''}</Txt>
                </View>
              </Row>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <View>
                  <Txt variant="muted">{b.bestPriceCents != null ? t('buyerX.bids.bestOffer') : t('buyerX.room.awaitingBids')}</Txt>
                  <Txt variant="h3" color={C.dark}>{b.bestPriceCents != null ? `${fmtCents(b.bestPriceCents)}/${b.qtyUnit}` : '—'}</Txt>
                </View>
                <View style={{ alignItems: 'center', backgroundColor: '#FBE9E6', borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 6 }}>
                  <Txt style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: C.error }}>{t('pubX.auc.endsIn').toUpperCase()}</Txt>
                  <Txt style={{ fontSize: 15, fontWeight: '800', color: C.error }}>{endsIn(b.auctionEndsAt, t('pubX.auc.ended'))}</Txt>
                </View>
              </Row>
              {b.targetPriceCents != null ? (
                <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                  <Badge label={t('buyerX.room.targetPrice', { price: fmtCents(b.targetPriceCents), unit: b.qtyUnit })} tone="slate" />
                </Row>
              ) : null}
              <Button title={ended ? t('pubX.auc.ended') : t('pubX.bids.viewBid')} icon="clipboard-outline" full disabled={ended} onPress={() => nav.navigate('BuyerBidRoom', { id: b.id })} />
            </Card>
          );
        }}
      />
    </View>
  );
}
