import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiBuyerBid } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Row, Screen, SkeletonRows, Txt } from '../../ui';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TFn = ReturnType<typeof useI18n>['t'];

interface AuctionRow {
  id: string; slug: string; name: string; emoji: string | null; flag: string | null;
  startBidCents: number | null; auctionEndsAt: string | null; bidCount: number;
  seller?: { name: string };
}
interface MyBid { id: string; amountCents: number; product?: { slug: string } }

function countdown(end: string | null, t: TFn) {
  if (!end) return t('buyerX.auctions.open');
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return t('buyerX.auctions.ended');
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return h >= 24
    ? t('buyerX.auctions.countdownDays', { d: Math.floor(h / 24), h: h % 24 })
    : t('buyerX.auctions.countdownHours', { h, m });
}

/** Live seller auctions to join, plus the buyer's own reverse auctions. */
export function BuyerAuctions() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const nav = useNavigation<Nav>();
  const { user } = useAuth();

  const { data: auctions = [], isLoading } = useQuery<AuctionRow[]>({
    queryKey: ['auctions', 'list'], queryFn: () => api.auctions.list() as Promise<AuctionRow[]>, refetchInterval: 5000,
  });
  const { data: bids = [] } = useQuery<MyBid[]>({
    queryKey: ['auctions', 'mine'], queryFn: () => api.auctions.mine() as Promise<MyBid[]>, enabled: !!user,
  });
  const { data: requirements = [] } = useQuery<ApiBuyerBid[]>({
    queryKey: ['buyer-bids', 'mine'], queryFn: () => api.buyerBids.mine(), enabled: !!user, refetchInterval: 20000,
  });

  const myAuctions = requirements.filter((r) => r.mode === 'auction');
  // Bids are sealed: the server never reveals the floor, so we can only show
  // what this buyer offered, not whether they are currently winning.
  const bidBySlug = new Map(bids.map((b) => [b.product?.slug, b]));

  return (
    <Screen>
      <Txt variant="h2">{t('buyerX.auctions.screenTitle')}</Txt>
      <Txt variant="muted">{t('buyerX.auctions.subtitle')}</Txt>

      <Txt variant="title" style={{ marginTop: 8 }}>{t('buyerX.auctions.liveHeading')}</Txt>
      {isLoading ? (
        <SkeletonRows />
      ) : auctions.length === 0 ? (
        <EmptyState icon="hammer-outline" title={t('buyerX.auctions.emptyLiveTitle')} body={t('buyerX.auctions.emptyLiveBody')} />
      ) : (
        auctions.map((a) => {
          const mine = bidBySlug.get(a.slug);
          const ended = a.auctionEndsAt ? new Date(a.auctionEndsAt).getTime() < Date.now() : false;
          return (
            <Card key={a.id} style={{ gap: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="title">{a.emoji ?? '🌾'} {a.name}</Txt>
                  <Txt variant="muted">{a.flag} {a.seller?.name} · {t('buyerX.auctions.bidCount', { count: a.bidCount })}</Txt>
                </View>
                <Badge label={countdown(a.auctionEndsAt, t)} tone={ended ? 'slate' : 'mango'} />
              </Row>
              {!!mine && <Txt variant="small" style={{ fontWeight: '600' }}>{t('buyerX.auctions.yourBid', { price: fmtCents(mine.amountCents) })}</Txt>}
              <Button
                title={ended ? t('buyerX.auctions.closed') : mine ? t('buyerX.auctions.raiseBid') : t('buyerX.auctions.placeBid')}
                size="sm"
                disabled={ended}
                onPress={() => nav.navigate('ProductDetail', { slug: a.slug })}
              />
            </Card>
          );
        })
      )}

      <Txt variant="title" style={{ marginTop: 8 }}>{t('buyerX.auctions.myHeading')}</Txt>
      {myAuctions.length === 0 ? (
        <EmptyState icon="hammer-outline" title={t('buyerX.auctions.emptyMyTitle')} body={t('buyerX.auctions.emptyMyBody')} />
      ) : (
        myAuctions.map((r) => (
          <Card key={r.id} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{r.title}</Txt>
                <Txt variant="muted">
                  #{r.reference} · {t('buyerX.auctions.sellerBidCount', { count: r._count?.sellerBids ?? 0 })}
                  {r.auctionEndsAt ? ` · ${countdown(r.auctionEndsAt, t)}` : ''}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt variant="title">{r.bestPriceCents != null ? `${fmtCents(r.bestPriceCents)}/${r.qtyUnit}` : '—'}</Txt>
                <Badge label={r.status} tone={r.status === 'awarded' ? 'green' : r.status === 'open' ? 'mango' : 'slate'} />
              </View>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
