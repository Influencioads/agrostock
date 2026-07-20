import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiAuctionListing } from '@agrotraders/api-client';
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
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** Live auction board — open ascending: the current highest bid is public. */
export function AuctionsBoard() {
  const nav = useNavigation<Nav>();
  const { fmtCents } = useCurrency();
  const { t } = useI18n();
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  const { data: list = [], isLoading } = useQuery<ApiAuctionListing[]>({
    queryKey: ['auctions-board'],
    queryFn: () => api.auctions.list(),
    refetchInterval: 5000,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={list}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ padding: space.lg, gap: 12 }}
        ListHeaderComponent={
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface }}>
            <Ionicons name="pulse" size={20} color={C.dark} />
            <Txt variant="small" style={{ flex: 1 }}>{t('pubX.auc.openInfo')}</Txt>
          </Card>
        }
        ListEmptyComponent={isLoading ? <Loading /> : <EmptyState icon="hammer-outline" title={t('pubX.auc.empty')} />}
        renderItem={({ item: a }) => {
          const ended = a.auctionEndsAt ? new Date(a.auctionEndsAt).getTime() <= Date.now() : false;
          const price = a.highestCents ?? a.startBidCents ?? 0;
          return (
            <Card style={{ gap: 10 }} onPress={() => nav.navigate('ProductDetail', { slug: a.slug })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge label={t('pubX.auc.live')} tone="error" />
                <Txt variant="muted">{t('auction.biddersN', { count: a.bidCount ?? 0 })}</Txt>
              </Row>
              <Row gap={10}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 24 }}>{a.emoji ?? '🌾'}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="title" numberOfLines={1}>{a.name}</Txt>
                  <Txt variant="muted">{a.flag} {a.seller?.name}</Txt>
                </View>
              </Row>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <View>
                  <Txt variant="muted">{a.highestCents != null ? t('pubX.auc.currentHighest') : t('pubX.auc.startingBid')}</Txt>
                  <Txt variant="h3" color={C.dark}>{fmtCents(price)}</Txt>
                </View>
                <View style={{ alignItems: 'center', backgroundColor: '#FBE9E6', borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 6 }}>
                  <Txt style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: C.error }}>{t('pubX.auc.endsIn').toUpperCase()}</Txt>
                  <Txt style={{ fontSize: 15, fontWeight: '800', color: C.error }}>{endsIn(a.auctionEndsAt, t('pubX.auc.ended'))}</Txt>
                </View>
              </Row>
              <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                <Badge label={t('auction.minIncrement', { amount: fmtCents(a.bidIncrementCents ?? 0) })} tone="slate" />
                {a.hasReserve ? <Badge label={a.reserveMet ? t('auction.reserveMet') : t('auction.reserveNotMet')} tone={a.reserveMet ? 'green' : 'error'} /> : null}
              </Row>
              <Button title={ended ? t('pubX.auc.ended') : t('pubX.auc.placeBid')} icon="hammer-outline" full disabled={ended} onPress={() => nav.navigate('ProductDetail', { slug: a.slug })} />
            </Card>
          );
        }}
      />
    </View>
  );
}
