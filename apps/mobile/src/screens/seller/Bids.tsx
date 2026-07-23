import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiBuyerBid, ApiOrder } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Buyer Bids — open buyer requirements the seller can bid on, plus direct enquiries. */
export function SellerBids() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const nav = useNavigation<Nav>();
  const { user } = useAuth();

  const { data: buyerBids = [], isLoading } = useQuery<ApiBuyerBid[]>({
    queryKey: ['buyer-bids', 'open'],
    queryFn: () => api.buyerBids.open(),
    enabled: !!user,
    refetchInterval: 15000,
  });
  const { data: mySellerBids = [] } = useQuery({
    queryKey: ['seller-bids', 'mine'],
    queryFn: () => api.buyerBids.myBids(),
    enabled: !!user,
  });
  const { data: orders = [] } = useQuery<ApiOrder[]>({
    queryKey: ['orders', 'incoming'],
    queryFn: () => api.orders.incoming() as Promise<ApiOrder[]>,
    enabled: !!user,
  });

  const enquiries = orders.filter((o) => o.status === 'enquiry');
  const bidOnIds = new Set(mySellerBids.map((b) => b.buyerBid.id));

  if (!user) {
    return (
      <Screen>
        <Txt variant="h2">{t('sellerX.bids.title')}</Txt>
        <EmptyState icon="lock-closed-outline" title={t('sellerX.bids.signIn')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Txt variant="h2">{t('sellerX.bids.title')}</Txt>
      <Txt variant="muted">{t('sellerX.bids.subtitle')}</Txt>

      {enquiries.length > 0 && (
        <>
          <Txt variant="title" style={{ marginTop: 8 }}>{t('sellerX.bids.directEnquiries')}</Txt>
          {enquiries.map((o) => (
            <Card key={o.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="title">{o.product?.name ?? t('sellerX.bids.requestFallback')}</Txt>
                <Txt variant="title">{o.amount}</Txt>
              </Row>
              <Txt variant="muted">#{o.reference} · {o.qty}</Txt>
              {!!o.buyer && (
                <Pressable onPress={() => nav.navigate('PublicProfile', { userId: o.buyer!.id })}>
                  <Txt variant="small" color={C.leaf}>{o.buyer.name} {o.buyer.country ?? ''} · {t('sellerX.bids.viewProfile')}</Txt>
                </Pressable>
              )}
              <Txt variant="muted">{t('sellerX.bids.respondFromOrders')}</Txt>
            </Card>
          ))}
        </>
      )}

      <Txt variant="title" style={{ marginTop: 8 }}>{t('sellerX.bids.openRequirements')}</Txt>
      {isLoading ? (
        <SkeletonRows />
      ) : buyerBids.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={t('sellerX.bids.emptyTitle')}
          body={t('sellerX.bids.emptyBody')}
        />
      ) : (
        buyerBids.map((r) => (
          <Card key={r.id} onPress={() => nav.navigate('BuyerBidRoom', { id: r.id })} style={{ gap: 8 }}>
            <Row gap={6}>
              <Badge label={r.mode === 'auction' ? t('sellerX.bids.auction') : t('sellerX.bids.bidsLabel')} tone={r.mode === 'auction' ? 'mango' : 'info'} />
              {bidOnIds.has(r.id) && <Badge label={t('sellerX.bids.bidPlaced')} tone="green" />}
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{r.title}</Txt>
                <Txt variant="muted">
                  #{r.reference} · {r.qtyValue} {r.qtyUnit}{r.deliveryPlace ? ` · ${r.deliveryPlace}` : ''}
                </Txt>
              </View>
              {r.mode === 'auction' && r.bestPriceCents != null && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt variant="muted">{t('sellerX.bids.priceToBeat')}</Txt>
                  <Txt variant="title">{fmtCents(r.bestPriceCents)}</Txt>
                </View>
              )}
            </Row>
            {!!r.buyer && (
              <Pressable onPress={() => nav.navigate('PublicProfile', { userId: r.buyer!.id })}>
                <Txt variant="small" color={C.leaf}>{r.buyer.name} · {t('sellerX.bids.viewProfile')}</Txt>
              </Pressable>
            )}
            <Button
              title={bidOnIds.has(r.id) && r.mode === 'auction' ? t('sellerX.bids.undercut') : t('sellerX.bids.placeBid')}
              size="sm"
              onPress={() => nav.navigate('BuyerBidRoom', { id: r.id })}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
