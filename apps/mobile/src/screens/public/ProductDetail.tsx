import { useState } from 'react';
import { Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { countryFlag, type ApiProduct, type ApiReviewSummary } from '@agrotraders/api-client';
import { getAttributeFields, unitSuffix } from '@agrotraders/types';
import { attrKey } from '@agrotraders/i18n';
import { api, assetUrl } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { Accordion, Avatar, Badge, Button, Divider, KeyValue, Loading, ProgressBar, RatingStars, Row, SectionHeader, SkeletonRows, Txt } from '../../ui';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { AuctionRoom } from './AuctionRoom';
import { ProductCard } from '../components';
import { useBasket } from '../../basket/BasketContext';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';
import { forwardChevron } from '../../lib/rtl';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ProductDetail'>;

/** Full-bleed swipeable gallery with dot indicators. */
function Gallery({ photos, emoji }: { photos: string[]; emoji: string | null | undefined }) {
  const width = Dimensions.get('window').width;
  const [index, setIndex] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  if (photos.length === 0) {
    return (
      <View style={[s.slide, { width, height: width * 0.9 }]}>
        <Text style={{ fontSize: 96 }}>{emoji ?? '🌾'}</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {photos.map((src, i) => (
          <Image
            key={src + i}
            source={{ uri: assetUrl(src) }}
            style={{ width, height: width * 0.9, backgroundColor: C.surface }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {photos.length > 1 ? (
        <View style={s.dots}>
          {photos.map((_, i) => (
            <View key={i} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function ProductDetail() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { user } = useAuth();
  const { fmtPrice } = useCurrency();
  const { t } = useI18n();
  const basket = useBasket();
  const [qty, setQty] = useState(1);
  const { data: p, isLoading } = useQuery<ApiProduct>({ queryKey: ['product', params.slug], queryFn: () => api.products.get(params.slug) });
  const categoryName = p?.category && 'name' in p.category ? p.category.name : undefined;
  const { data: related = [] } = useQuery<ApiProduct[]>({
    queryKey: ['related', categoryName, params.slug],
    queryFn: async () => (await api.products.list({ category: categoryName })).filter((x) => x.slug !== params.slug).slice(0, 6),
    enabled: !!p,
  });
  const { data: reviews, isLoading: reviewsLoading } = useQuery<ApiReviewSummary>({
    queryKey: ['product-reviews', p?.id],
    queryFn: () => api.reviews.forProduct(p!.id),
    enabled: !!p?.id,
  });
  const buy = useMutation({
    mutationFn: () => api.orders.place({ productSlug: params.slug, qty }),
    onSuccess: () => Alert.alert(t('pubX.pd.orderPlacedTitle'), t('pubX.pd.orderPlacedBody')),
    onError: () => Alert.alert(t('pubX.pd.orderFailTitle'), t('pubX.pd.orderFailBody')),
  });

  if (isLoading || !p) return <View style={{ flex: 1, backgroundColor: C.page }}><Loading label={t('pubX.pd.loading')} /></View>;

  // Live auctions get the bespoke bidding room (countdown, open bid history).
  if (p.isAuction) return <AuctionRoom slug={params.slug} product={p} />;

  const onBuy = () => (user ? buy.mutate() : nav.navigate('SignIn', { reason: 'buy' }));
  const sellerId = p.seller?.id;
  // Older rows may predate the gallery; fall back to the single cover image.
  const photos = p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
  const rated = (p.ratingCount ?? 0) > 0;

  // Real category-specific attributes captured on this listing → labelled rows.
  // Schema labels and select/multiselect values are English constants, so they
  // render through the generated `attrs` catalog; free-text values arrive already
  // localized from the API. Unknown text falls back to itself.
  const aLabel = (str: string) => t(`attrs:label.${attrKey(str)}`, { defaultValue: str });
  const aOpt = (str: string) => t(`attrs:option.${attrKey(str)}`, { defaultValue: str });
  const subName = p.subcategory && typeof p.subcategory === 'object' && 'name' in p.subcategory ? p.subcategory.name : undefined;
  const attrVals = (p.attributes ?? {}) as Record<string, unknown>;
  const attrRows = getAttributeFields(categoryName, subName)
    .map((f) => {
      const v = attrVals[f.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
      const value = Array.isArray(v)
        ? v.map((x) => aOpt(String(x))).join(', ')
        : f.type === 'boolean'
          ? v ? t('common:yes') : t('common:no')
          : f.type === 'select'
            ? aOpt(String(v))
            : f.unit
              ? `${v} ${f.unit}`
              : String(v);
      return { label: aLabel(f.label), value };
    })
    .filter((r): r is { label: string; value: string } => r !== null);

  const addToRfq = () => {
    basket.add(p, qty);
    Alert.alert(t('pubX.rfq.addedTitle'), t('pubX.rfq.addedBody', { name: p.name }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.page }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.lg, gap: space.sm }} showsVerticalScrollIndicator={false}>
        <Gallery photos={photos} emoji={p.emoji} />

        {/* headline block — trust pills, then title, then rating + origin line */}
        <View style={s.block}>
          <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            {p.verified ? <View style={[s.pill, { backgroundColor: C.surface }]}><Text style={[s.pillText, { color: C.green }]}>{t('pubX.pd.verified')}</Text></View> : null}
            {p.grade ? <View style={[s.pill, { backgroundColor: C.mangoSoft }]}><Text style={[s.pillText, { color: C.gold }]}>{p.grade}</Text></View> : null}
            {p.market ? <View style={[s.pill, { backgroundColor: C.mangoSoft }]}><Text style={[s.pillText, { color: C.gold }]}>{`${p.market.flag ?? ''} ${p.market.name}`}</Text></View> : null}
          </Row>
          <Text style={s.name}>{p.name}</Text>
          <Row gap={7} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            {rated ? (
              <>
                <RatingStars n={Math.round(p.ratingAvg ?? 0)} size={14} />
                <Txt variant="muted">{(p.ratingAvg ?? 0).toFixed(1)} · {t('reviews.count', { count: p.ratingCount ?? 0 })}</Txt>
              </>
            ) : null}
            {(p.city || p.country) ? (
              <Txt variant="muted">{rated ? '· ' : ''}{[p.city, p.country].filter(Boolean).join(', ')}</Txt>
            ) : null}
          </Row>
        </View>

        {/* price card — headline price, trade terms, escrow reassurance */}
        <View style={{ paddingHorizontal: space.lg }}>
          <View style={s.priceCard}>
            <View style={s.priceHead}>
              <Text style={s.bigPrice}>{fmtPrice(p)}</Text>
              <Text style={s.priceUnit}>
                {unitSuffix(p.unit)}{p.moq ? ` · ${t('pubX.pd.moq')} ${p.moq}` : ''}
              </Text>
            </View>
            <View style={s.priceTerms}>
              {[
                { label: t('pubX.pd.available'), value: p.qty ?? '—' },
                { label: t('pubX.pd.delivery'), value: p.delivery ?? '—' },
                ...(p.origin ? [{ label: t('pubX.pd.origin'), value: p.origin }] : []),
              ].map((it, i) => (
                <View key={it.label} style={{ flex: 1, flexDirection: 'row' }}>
                  {i > 0 ? <View style={s.termRule} /> : null}
                  <View style={{ flex: 1, paddingHorizontal: space.sm, gap: 3 }}>
                    <Text numberOfLines={1} style={s.termValue}>{it.value}</Text>
                    <Text numberOfLines={1} style={[s.termLabel, microLabel()]}>{it.label}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={s.qtyRow}>
              <View style={s.stepper}>
                <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={6} style={s.stepBtn}>
                  <Ionicons name="remove" size={18} color={C.ink} />
                </Pressable>
                <Text style={s.stepValue}>{qty}</Text>
                <Pressable onPress={() => setQty((q) => q + 1)} hitSlop={6} style={s.stepBtn}>
                  <Ionicons name="add" size={18} color={C.ink} />
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Button full title={t('pubX.pd.buyNow')} variant="primaryOutline" loading={buy.isPending} onPress={onBuy} />
              </View>
            </View>
            {p.safeDeal !== false ? (
              <View style={s.escrowRow}>
                <Ionicons name="shield-checkmark-outline" size={15} color={C.green} />
                <Text style={s.escrowText}>{t('pubX.pd.escrowNote')}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* supplier */}
        {p.seller ? (
          <Pressable
            style={s.block}
            onPress={() => (sellerId ? nav.navigate('PublicProfile', { userId: sellerId }) : undefined)}
          >
            <Text style={[s.blockLabel, microLabel()]}>{t('pubX.pd.supplier')}</Text>
            <Row gap={space.md} style={{ marginTop: space.sm }}>
              <Avatar name={p.seller.name} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={s.sellerName}>{p.seller.name}</Text>
                <Txt variant="muted">
                  {p.seller.country ? `${countryFlag(p.seller.country)} ${p.seller.country}` : ''}
                  {p.seller.kycStatus === 'verified' ? ` · ${t('pubX.pd.verified')}` : ''}
                </Txt>
              </View>
              <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
            </Row>
            {sellerId && sellerId !== user?.id ? (
              <View style={{ marginTop: space.md, alignSelf: 'flex-start' }}>
                <Button
                  title={t('pubX.pd.chatSeller')}
                  variant="outline"
                  size="sm"
                  icon="chatbubbles-outline"
                  onPress={() => nav.navigate('Community', { dmUserId: sellerId, dmName: p.seller?.name ?? t('pubX.pd.sellerFallback') })}
                />
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {/* specifications — a two-column grid of labelled spec cards */}
        {attrRows.length > 0 ? (
          <View style={s.block}>
            <Text style={[s.name, { fontSize: 20, marginBottom: space.md }]}>{subName ?? t('pubX.pd.specifications')}</Text>
            <View style={s.specGrid}>
              {attrRows.map((r) => (
                <View key={r.label} style={s.specCard}>
                  <Text numberOfLines={1} style={[s.specLabel, microLabel()]}>{r.label}</Text>
                  <Text numberOfLines={2} style={s.specValue}>{r.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* logistics + supplies, collapsed accordions */}
        <View style={[s.block, { paddingVertical: 0 }]}>
          <Accordion title={t('pubX.pd.tradeTerms')} defaultOpen={attrRows.length === 0}>
            <KeyValue label={t('pubX.pd.available')} value={p.qty ?? '—'} />
            <KeyValue label={t('pubX.pd.moq')} value={p.moq ?? '—'} />
            {p.grade ? <KeyValue label={t('pubX.browse.grade')} value={p.grade} /> : null}
            {/* `origin` already embeds its own flag (e.g. "🇺🇸 USA"), as does the
                misleadingly-named `flag` field — never concatenate the two. */}
            {p.origin ? <KeyValue label={t('pubX.pd.origin')} value={p.origin} /> : null}
            {p.delivery ? <KeyValue label={t('pubX.pd.delivery')} value={p.delivery} /> : null}
          </Accordion>

          {p.supplyCountries && p.supplyCountries.length > 0 ? (
            <Accordion title={t('pubX.pd.suppliesTo')} count={p.supplyCountries.length}>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {p.supplyCountries.map((c) => (
                  <Badge key={c} label={`${countryFlag(c)} ${c}`.trim()} tone="green" />
                ))}
              </Row>
            </Accordion>
          ) : null}
        </View>

        {/* reviews — real data only */}
        <View style={s.block}>
          <SectionHeader title={t('pubX.pd.buyerReviews')} />
          {reviewsLoading ? (
            <SkeletonRows />
          ) : reviews && reviews.count > 0 ? (
            <>
              <Row gap={space.md} style={{ marginTop: space.md }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={s.bigRating}>{reviews.avg.toFixed(1)}</Text>
                  <RatingStars n={Math.round(reviews.avg)} size={12} />
                  <Txt variant="muted">{t('reviews.count', { count: reviews.count })}</Txt>
                </View>
                {/* distribution, 5★ at the top */}
                <View style={{ flex: 1, gap: 4 }}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const n = reviews.list.filter((r) => r.stars === star).length;
                    const pct = reviews.list.length ? (n / reviews.list.length) * 100 : 0;
                    return (
                      <Row key={star} gap={7}>
                        <Txt variant="muted" style={{ width: 12 }}>{star}</Txt>
                        <View style={{ flex: 1 }}><ProgressBar pct={pct} height={4} /></View>
                      </Row>
                    );
                  })}
                </View>
              </Row>
              <View style={{ marginTop: space.md }}>
                {reviews.list.map((r) => (
                  <View key={r.id} style={{ paddingVertical: space.md, gap: 4 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt variant="title">{r.rater?.name ?? t('reviews.reviewerFallback')}</Txt>
                      <RatingStars n={r.stars} />
                    </Row>
                    {!!r.text && <Txt variant="body" color={C.inkMuted}>{r.text}</Txt>}
                    <Txt variant="muted">{new Date(r.createdAt).toLocaleDateString()}</Txt>
                    <Divider />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Txt variant="muted" style={{ marginTop: space.sm }}>{t('reviews.emptyBody')}</Txt>
          )}
        </View>

        {/* related products */}
        {related.length > 0 ? (
          <View style={[s.block, { paddingHorizontal: 0 }]}>
            <View style={{ paddingHorizontal: space.lg }}>
              <SectionHeader title={t('pubX.pd.alsoLike')} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md }}>
              {related.map((rp) => (
                <ProductCard key={rp.id} product={rp} width={148} onPress={() => nav.push('ProductDetail', { slug: rp.slug })} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* sticky action bar — chat the seller, or add the lot to the RFQ basket */}
      <View style={s.bar}>
        <View style={{ width: 118 }}>
          <Button
            full
            title={t('pubX.pd.chat')}
            variant="outline"
            onPress={() => (sellerId ? nav.navigate('Community', { dmUserId: sellerId, dmName: p.seller?.name ?? t('pubX.pd.sellerFallback') }) : undefined)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button full title={t('pubX.pd.addToRfq')} onPress={addToRfq} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  slide: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 16, backgroundColor: C.white },

  block: { backgroundColor: C.white, paddingHorizontal: space.lg, paddingVertical: space.lg },
  blockLabel: { ...type.micro, color: C.inkMuted },
  name: { ...type.h1, fontSize: 26 },
  sellerName: { ...type.title, fontSize: 15 },

  pill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { ...type.micro, fontSize: 11, letterSpacing: 0.4 },

  priceCard: { backgroundColor: C.white, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: space.lg, gap: space.md, shadowColor: '#0F2819', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  priceHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  bigPrice: { ...type.numeric, fontSize: 32, color: C.ink, letterSpacing: -0.5 },
  priceUnit: { ...type.body, color: C.inkMuted },
  priceTerms: { flexDirection: 'row', paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairline },
  termRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: C.hairline },
  termValue: { ...type.title, fontSize: 14, color: C.ink },
  termLabel: { ...type.micro, fontSize: 9.5, color: C.inkMuted },
  escrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairline },
  escrowText: { ...type.caption, color: C.inkSoft },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },

  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  specCard: { width: '47%', flexGrow: 1, backgroundColor: C.page, borderRadius: radius.input, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  specLabel: { ...type.micro, fontSize: 10, color: C.inkMuted },
  specValue: { ...type.h3, fontSize: 16, color: C.ink },

  bigRating: { ...type.display, fontSize: 34, color: C.ink },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    paddingBottom: space.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: radius.card,
    height: 44,
  },
  stepBtn: { paddingHorizontal: 9, height: '100%', justifyContent: 'center' },
  stepValue: { ...type.title, minWidth: 20, textAlign: 'center' },
});
