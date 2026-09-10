import { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiAuctionBidRow, ApiAuctionDetail, ApiProduct } from '@agrotraders/api-client';
import { toUnit } from '@agrotraders/types';
import { api, assetUrl } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Card, Row, Txt } from '../../ui';
import { C, font, radius, space, type } from '../../theme/tokens';
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
    // Shares the row rather than claiming a fixed 74px: a three-digit hour
    // ("168" on a week-long lot) and a long label ("СЕКУНДЫ") both have to fit,
    // and the figures use the numeric face — never `fontWeight`, which Android
    // fakes by widening the body font.
    <View style={{ flex: 1, alignItems: 'center', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: danger ? C.error : 'rgba(255,255,255,0.10)' }}>
      <Txt numberOfLines={1} style={{ ...type.numeric, fontSize: 30, lineHeight: 36, color: C.white }}>{value}</Txt>
      <Txt numberOfLines={1} style={{ fontSize: 9, letterSpacing: 1, color: danger ? '#f3d3ce' : C.leaf, marginTop: 4 }}>{label}</Txt>
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
            <Badge label={timer.ended ? t('compX.bid.ended') : t('compX.bid.live')} tone={timer.ended ? 'slate' : 'error'} />
            <Txt numberOfLines={1} style={{ color: C.leaf, fontSize: 11, flexShrink: 1 }}>#{slug.slice(0, 8).toUpperCase()}</Txt>
          </Row>
          <Txt numberOfLines={1} style={{ fontSize: 10, letterSpacing: 1.4, color: C.leaf }}>
            {timer.ended ? t('compX.bid.ended') : t('auction.closesIn')}
          </Txt>
          {/* Stretched so the three boxes divide the card evenly at any width. */}
          <Row style={{ gap: 8, alignSelf: 'stretch' }}>
            <TimeBox value={timer.h} label={t('auction.hours')} />
            <TimeBox value={timer.m} label={t('auction.minutes')} />
            <TimeBox value={timer.s} label={t('auction.seconds')} danger={!timer.ended} />
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
            {/* The metric the price is quoted in — the old "min increment"
                badge went with the rule that any offer is now accepted. */}
            <Badge label={t('auction.pricePerUnit', { unit: t(`enums:unitShort.${toUnit(product.unit)}`) })} tone="slate" />
            {auction?.hasReserve ? <Badge label={auction.reserveMet ? t('auction.reserveMet') : t('auction.reserveNotMet')} tone={auction.reserveMet ? 'green' : 'error'} /> : null}
          </Row>
        </View>

        {/* masked bid history — above the bid panel */}
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{t('auction.bidHistory')}</Txt>
            {!timer.ended ? <Txt variant="small" color={C.error} style={{ fontFamily: font.bodyBold }}>{t('auction.liveBids', { count: auction?.bidCount ?? 0 })}</Txt> : null}
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
                <Txt numberOfLines={1} style={{ ...type.title, fontSize: 12 }}>{b.masked}{b.auto ? ` · ${t('auction.auto')}` : ''}</Txt>
                <Txt style={{ fontSize: 10, color: C.inkSoft }}>{ago(b.createdAt)}</Txt>
              </View>
              <Txt numberOfLines={1} style={{ ...type.numeric, fontSize: 13, color: b.isTop ? C.success : C.ink }}>{fmtCents(b.amountCents)}</Txt>
            </Row>
          ))}
        </Card>

        {/* price / bid panel — below the product & history */}
        <BidPanel slug={slug} />
      </ScrollView>
    </View>
  );
}
