import { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiAuctionBidRow, ApiAuctionDetail, ApiProduct } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Card, Row, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { BidPanel } from '../components/BidPanel';
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

/** Mobile live-auction room — countdown header, hero, bid panel, masked history. */
export function AuctionRoom({ slug, product }: { slug: string; product: ApiProduct }) {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const { data: auction } = useQuery<ApiAuctionDetail>({
    queryKey: ['auction', slug], queryFn: () => api.auctions.detail(slug), refetchInterval: 4000,
  });
  const { data: bids = [] } = useQuery<ApiAuctionBidRow[]>({
    queryKey: ['auction-bids', slug], queryFn: () => api.auctions.bids(slug), refetchInterval: 4000,
  });
  const timer = useCountdown(auction?.auctionEndsAt ?? null);
  const photos = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* countdown header */}
        <View style={{ backgroundColor: C.evergreen, borderRadius: radius.xl, padding: space.lg, alignItems: 'center', gap: 12 }}>
          <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
            <Badge label={t('compX.bid.live')} tone="error" />
            <Txt style={{ color: C.leaf, fontSize: 11 }}>#{slug.slice(0, 8).toUpperCase()}</Txt>
          </Row>
          <Txt style={{ fontSize: 10, letterSpacing: 1.4, color: C.leaf }}>{t('auction.closesIn')}</Txt>
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
            <Txt style={{ fontSize: 64 }}>{product.emoji ?? '🌾'}</Txt>
          )}
        </View>

        {/* title + seller + chips */}
        <View style={{ gap: 8 }}>
          <Txt variant="h2">{product.name}</Txt>
          <Txt variant="muted">{product.flag} {product.seller?.name} · {t('auction.biddersN', { count: auction?.bidCount ?? 0 })}</Txt>
          <Row style={{ gap: 6, flexWrap: 'wrap' }}>
            <Badge label={t('auction.minIncrement', { amount: fmtCents(auction?.bidIncrementCents ?? 0) })} tone="slate" />
            {auction?.hasReserve ? <Badge label={auction.reserveMet ? t('auction.reserveMet') : t('auction.reserveNotMet')} tone={auction.reserveMet ? 'green' : 'error'} /> : null}
          </Row>
        </View>

        {/* masked bid history — above the bid panel */}
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{t('auction.bidHistory')}</Txt>
            {!timer.ended ? <Txt variant="small" color={C.error} style={{ fontWeight: '700' }}>{t('auction.liveBids', { count: auction?.bidCount ?? 0 })}</Txt> : null}
          </Row>
          <Txt variant="muted">{t('auction.maskedNote')}</Txt>
          {bids.length === 0 ? (
            <Txt variant="muted" style={{ textAlign: 'center', paddingVertical: 12 }}>{t('auction.noBidsYet')}</Txt>
          ) : bids.map((b) => (
            <Row
              key={b.id}
              style={{ gap: 10, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 9, borderColor: b.isYou ? C.mangoSoft : b.isTop ? C.leaf : C.border, backgroundColor: b.isYou ? C.mangoSoft : b.isTop ? C.surface : C.white }}
            >
              <Txt style={{ fontSize: 15 }}>{b.flag}</Txt>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 12, fontWeight: '600' }}>{b.masked}{b.auto ? ` · ${t('auction.auto')}` : ''}</Txt>
                <Txt style={{ fontSize: 10, color: C.inkSoft }}>{ago(b.createdAt)}</Txt>
              </View>
              <Txt style={{ fontSize: 13, fontWeight: '700', color: b.isTop ? C.success : C.ink }}>{fmtCents(b.amountCents)}</Txt>
            </Row>
          ))}
        </Card>

        {/* price / bid panel — below the product & history */}
        <BidPanel slug={slug} />
      </ScrollView>
    </View>
  );
}
