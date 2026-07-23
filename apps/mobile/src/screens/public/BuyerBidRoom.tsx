import { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiBuyerBidDetail, ApiBuyerBidRow } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Button, Card, Row, SkeletonRows, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { BuyerBidPanel } from '../components/BuyerBidPanel';
import { useI18n } from '../../i18n';

function useCountdown(end: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const ms = end ? new Date(end).getTime() - now : 0;
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return { h: p(Math.floor(s / 3600)), m: p(Math.floor((s % 3600) / 60)), s: p(s % 60), ended: !end || ms <= 0 };
}

function ago(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

function TimeBox({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <View style={{ width: 74, alignItems: 'center', borderRadius: radius.md, paddingVertical: 8, backgroundColor: danger ? C.error : 'rgba(255,255,255,0.10)' }}>
      <Txt style={{ fontSize: 30, fontWeight: '800', color: C.white }}>{value}</Txt>
      <Txt style={{ fontSize: 9, letterSpacing: 1, color: danger ? '#f3d3ce' : C.leaf, marginTop: 4 }}>{label}</Txt>
    </View>
  );
}

/**
 * The buyer-bid room — the reverse-auction twin of `AuctionRoom`. Countdown,
 * the requirement's photos and specs, the bid panel, and the masked bid book
 * where the LOWEST price wins. Sealed in quote mode: a non-owner sees only
 * their own rows.
 */
export function BuyerBidRoom({ id }: { id: string }) {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data: bid, isLoading } = useQuery<ApiBuyerBidDetail>({
    queryKey: ['buyer-bid-detail', id], queryFn: () => api.buyerBids.get(id), refetchInterval: 4000,
  });
  const { data: book = [] } = useQuery<ApiBuyerBidRow[]>({
    queryKey: ['buyer-bid-book', id], queryFn: () => api.buyerBids.bidBook(id), refetchInterval: 4000,
  });

  const isAuction = bid?.mode === 'auction';
  const timer = useCountdown((isAuction ? bid?.auctionEndsAt : bid?.deadline) ?? null);

  const award = useMutation({
    mutationFn: (sellerBidId: string) => api.buyerBids.award(id, sellerBidId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyer-bids', 'mine'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['buyer-bid-detail', id] });
      qc.invalidateQueries({ queryKey: ['buyer-bid-book', id] });
    },
    onError: (e) => setError(errMessage(e, t('buyerX.bids.errAward'))),
  });

  if (isLoading || !bid) return <View style={{ flex: 1, backgroundColor: C.bg }}><SkeletonRows /></View>;

  const photos = bid.images ?? [];
  // Quote mode is sealed by design: a non-owner never sees the book.
  const sealed = !bid.isOwner && bid.mode === 'quote';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* countdown header */}
        <View style={{ backgroundColor: C.evergreen, borderRadius: radius.xl, padding: space.lg, alignItems: 'center', gap: 12 }}>
          <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
            <Badge label={isAuction ? t('buyerX.room.reverseAuction') : t('buyerX.room.quotes')} tone={isAuction ? 'error' : 'slate'} />
            <Txt style={{ color: C.leaf, fontSize: 11 }}>#{bid.reference}</Txt>
          </Row>
          <Txt style={{ fontSize: 10, letterSpacing: 1.4, color: C.leaf }}>
            {timer.ended ? t('buyerX.room.ended') : isAuction ? t('auction.closesIn') : t('buyerX.room.deadlineIn')}
          </Txt>
          <Row style={{ gap: 8 }}>
            <TimeBox value={timer.h} label={t('auction.hours')} />
            <TimeBox value={timer.m} label={t('auction.minutes')} />
            <TimeBox value={timer.s} label={t('auction.seconds')} danger />
          </Row>
        </View>

        {/* hero image */}
        <View style={{ height: 150, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' }}>
          {photos.length > 0 ? (
            <Image source={{ uri: assetUrl(photos[0]) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Txt style={{ fontSize: 64 }}>{bid.category?.emoji ?? '🌾'}</Txt>
          )}
        </View>

        {/* thumbnails */}
        {photos.length > 1 ? (
          <Row style={{ gap: 8 }}>
            {photos.slice(1, 5).map((src, i) => (
              <View key={i} style={{ flex: 1, height: 56, borderRadius: radius.md, overflow: 'hidden', backgroundColor: C.surface }}>
                <Image source={{ uri: assetUrl(src) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ))}
          </Row>
        ) : null}

        {/* title + chips */}
        <View style={{ gap: 8 }}>
          <Txt variant="h2">{bid.title}</Txt>
          <Txt variant="muted">
            {bid.qtyValue} {bid.qtyUnit}{bid.deliveryPlace ? ` · ${bid.deliveryPlace}` : ''} · {t('buyerX.room.sellersN', { count: bid.sellerCount })}
          </Txt>
          <Row style={{ gap: 6, flexWrap: 'wrap' }}>
            <Badge label={bid.status} tone={bid.status === 'open' ? 'green' : 'slate'} />
            {bid.bestPriceCents != null ? (
              <Badge label={t('buyerX.room.bestOffer', { price: fmtCents(bid.bestPriceCents), unit: bid.qtyUnit })} tone="mango" />
            ) : null}
            {bid.targetPriceCents != null ? (
              <Badge label={t('buyerX.room.targetPrice', { price: fmtCents(bid.targetPriceCents), unit: bid.qtyUnit })} tone="slate" />
            ) : null}
          </Row>
          {!!bid.notes && <Txt variant="muted">{bid.notes}</Txt>}
        </View>

        {/* sealed-mode reassurance — the prototype's amber note */}
        {bid.mode === 'quote' ? (
          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: C.mangoSoft, borderWidth: 1, borderColor: '#E7C88A', borderRadius: radius.card, padding: 14 }}>
            <Ionicons name="eye-off-outline" size={18} color={C.gold} />
            <Txt variant="small" color="#7A5A12" style={{ flex: 1, lineHeight: 19 }}>{t('buyerX.room.sealedBanner')}</Txt>
          </View>
        ) : null}

        {/* masked bid book — above the bid panel */}
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{t('buyerX.room.bidBook')}</Txt>
            <Txt variant="small" color={C.inkSoft} style={{ fontWeight: '700' }}>
              {t('buyerX.room.sellersN', { count: bid.sellerCount })}
            </Txt>
          </Row>
          <Txt variant="muted">
            {sealed ? t('buyerX.room.sealedNote') : bid.isOwner ? t('buyerX.room.ownerBookNote') : t('buyerX.room.maskedNote')}
          </Txt>
          {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
          {book.length === 0 ? (
            <Txt variant="muted" style={{ textAlign: 'center', paddingVertical: 12 }}>
              {sealed ? t('buyerX.room.sealedNoBid') : t('buyerX.room.noBidsYet')}
            </Txt>
          ) : book.map((b) => (
            <View
              key={b.id}
              style={{ gap: 8, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 9, borderColor: b.isYou ? C.mangoSoft : b.isTop ? C.leaf : C.border, backgroundColor: b.isYou ? C.mangoSoft : b.isTop ? C.surface : C.white }}
            >
              <Row style={{ gap: 10 }}>
                <Txt style={{ fontSize: 15 }}>{b.flag}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 12, fontWeight: '600' }}>
                    {b.masked}{b.isTop ? ` · ${t('buyerX.room.lowestBid')}` : ''}{b.status === 'awarded' ? ` · ${t('buyerX.bids.awarded')}` : ''}
                  </Txt>
                  <Txt style={{ fontSize: 10, color: C.inkSoft }}>
                    {b.qtyValue} {bid.qtyUnit}{b.etaDays ? t('buyerX.bids.etaSuffix', { days: b.etaDays }) : ''} · {ago(b.createdAt)}
                  </Txt>
                </View>
                <Txt style={{ fontSize: 13, fontWeight: '700', color: b.isTop ? C.success : C.ink }}>{fmtCents(b.priceCents)}</Txt>
              </Row>
              {bid.isOwner && bid.status === 'open' && b.status === 'submitted' ? (
                <Button
                  title={award.isPending ? t('buyerX.bids.awarding') : t('buyerX.bids.award')}
                  size="sm"
                  disabled={award.isPending}
                  onPress={() => award.mutate(b.id)}
                />
              ) : null}
            </View>
          ))}
        </Card>

        {/* price / bid panel — below the product & book */}
        <BuyerBidPanel bid={bid} />
      </ScrollView>
    </View>
  );
}
