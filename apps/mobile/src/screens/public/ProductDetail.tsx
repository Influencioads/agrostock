import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { socialProof, countryFlag, type ApiProduct, type ApiReviewSummary } from '@agrotraders/api-client';
import { getAttributeFields, unitSuffix } from '@agrotraders/types';
import { attrKey } from '@agrotraders/i18n';
import { api, assetUrl } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Button, Card, Loading, ProgressBar, RatingStars, Row, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { AuctionRoom } from './AuctionRoom';
import { ProductCard } from '../components';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';
import { alignEnd } from '../../lib/rtl';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ProductDetail'>;

// Quality-score facets. Labels are i18n keys under `pubX.pd.quality.*`; the
// scores are indicative demo metrics rendered as a progress bar.
const QUALITY = [['purity', 98], ['moisture', 92], ['packaging', 95], ['documentation', 90]] as const;

export function ProductDetail() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { user } = useAuth();
  const { fmtPrice } = useCurrency();
  const { t } = useI18n();
  const [qty, setQty] = useState(1);
  const [activePhoto, setActivePhoto] = useState(0);
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

  if (isLoading || !p) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading label={t('pubX.pd.loading')} /></View>;

  // Live auctions get the bespoke bidding room (countdown, open bid history).
  if (p.isAuction) return <AuctionRoom slug={params.slug} product={p} />;

  const onBuy = () => (user ? buy.mutate() : nav.navigate('SignIn', { reason: 'buy' }));
  const proof = socialProof(p.id);
  const sellerId = p.seller?.id;
  // Older rows may predate the gallery; fall back to the single cover image.
  const photos = p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [];

  // Real category-specific attributes captured on this listing → labelled rows.
  // Schema labels and select/multiselect values are English constants, so they
  // render through the generated `attrs` catalog; free-text values arrive already
  // localized from the API. Unknown text falls back to itself.
  const aLabel = (s: string) => t(`attrs:label.${attrKey(s)}`, { defaultValue: s });
  const aOpt = (s: string) => t(`attrs:option.${attrKey(s)}`, { defaultValue: s });
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Gallery: tap a thumbnail to swap the hero. Falls back to the emoji. */}
        <View style={{ gap: 8 }}>
          <View style={{ height: 160, borderRadius: 16, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {photos.length > 0 ? (
              <Image source={{ uri: assetUrl(photos[Math.min(activePhoto, photos.length - 1)]) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Txt style={{ fontSize: 72 }}>{p.emoji ?? '🌾'}</Txt>
            )}
          </View>
          {photos.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {photos.map((src, i) => (
                <Pressable
                  key={src + i}
                  onPress={() => setActivePhoto(i)}
                  style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', borderWidth: i === activePhoto ? 2 : 1, borderColor: i === activePhoto ? C.leaf : C.border }}
                >
                  <Image source={{ uri: assetUrl(src) }} style={{ width: '100%', height: '100%' }} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
        <View style={{ gap: 6 }}>
          <Txt variant="h2">{p.name}</Txt>
          <Row gap={8}>
            <RatingStars n={Math.round(Number(p.rating) || 5)} />
            <Txt variant="muted">{p.rating} · {p.seller?.name} {p.seller?.country ?? ''}</Txt>
          </Row>
          <Row gap={6}>
            {p.verified ? <Badge label={t('pubX.pd.verified')} tone="green" /> : null}
            {p.safeDeal ? <Badge label={t('pubX.pd.safeDeal')} tone="info" /> : null}
            {p.isOffer ? <Badge label={t('pubX.pd.offer')} tone="mango" /> : null}
            {p.market ? <Badge label={`${p.market.flag ?? ''} ${p.market.name}`} tone="mango" /> : null}
          </Row>
          {(p.city || p.country) ? (
            <Row gap={5}>
              <Ionicons name="location-outline" size={13} color={C.inkSoft} />
              <Txt variant="small" color={C.inkSoft}>{[p.city, p.country].filter(Boolean).join(', ')}</Txt>
            </Row>
          ) : null}
          {p.supplyCountries && p.supplyCountries.length > 0 ? (
            <View style={{ gap: 4, marginTop: 2 }}>
              <Txt variant="small" style={{ fontWeight: '700' }}>{t('pubX.pd.suppliesTo')}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {p.supplyCountries.map((c) => (
                  <Badge key={c} label={`${countryFlag(c)} ${c}`.trim()} tone="green" />
                ))}
              </View>
            </View>
          ) : null}
          {/* social proof */}
          <Row gap={12} style={{ marginTop: 2 }}>
            <Row gap={5}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.orange }} />
              <Txt variant="small" color={C.orange} style={{ fontWeight: '700' }}>{t('pubX.pd.watching', { count: proof.watching })}</Txt>
            </Row>
            <Row gap={5}>
              <Ionicons name="bag-check-outline" size={13} color={C.dark} />
              <Txt variant="small" color={C.dark} style={{ fontWeight: '700' }}>{t('pubX.pd.ordered', { count: proof.orderedLastMonth })}</Txt>
            </Row>
          </Row>
          {sellerId && sellerId !== user?.id ? (
            <Button
              title={t('pubX.pd.chatSeller')}
              variant="outline"
              size="sm"
              icon="chatbubbles-outline"
              onPress={() => nav.navigate('Community', { dmUserId: sellerId, dmName: p.seller?.name ?? t('pubX.pd.sellerFallback') })}
            />
          ) : null}
        </View>


        {attrRows.length > 0 && (
          <Card style={{ gap: 10 }}>
            <Txt variant="h3">{subName ?? t('pubX.pd.specifications')}</Txt>
            {attrRows.map((r) => (
              <Row key={r.label} style={{ justifyContent: 'space-between' }}>
                <Txt variant="muted">{r.label}</Txt>
                <Txt variant="title" style={{ flexShrink: 1, textAlign: alignEnd() }}>{r.value}</Txt>
              </Row>
            ))}
          </Card>
        )}

        {/* Availability card — only real listing data (qty/moq). Category-specific
            specs render in the attributes card above when present. */}
        <Card style={{ gap: 10 }}>
          <Txt variant="h3">{t('pubX.pd.specifications')}</Txt>
          <Row style={{ justifyContent: 'space-between' }}><Txt variant="muted">{t('pubX.pd.available')}</Txt><Txt variant="title">{p.qty ?? '—'}</Txt></Row>
          <Row style={{ justifyContent: 'space-between' }}><Txt variant="muted">{t('pubX.pd.moq')}</Txt><Txt variant="title">{p.moq ?? '—'}</Txt></Row>
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="h3">{t('pubX.pd.qualityScore')}</Txt>
          {QUALITY.map(([k, v]) => (
            <View key={k} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}><Txt variant="muted">{t(`pubX.pd.quality.${k}`)}</Txt><Txt variant="title">{v}%</Txt></Row>
              <ProgressBar pct={v} />
            </View>
          ))}
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="h3">{t('pubX.pd.buyerReviews')}</Txt>
          {reviewsLoading ? (
            <Loading />
          ) : (
            <>
              {reviews && reviews.count > 0 ? (
                <Row gap={8}>
                  <RatingStars n={Math.round(reviews.avg)} size={16} />
                  <Txt variant="title">{reviews.avg.toFixed(1)}</Txt>
                  <Txt variant="muted">{t('reviews.count', { count: reviews.count })}</Txt>
                </Row>
              ) : (
                <Row gap={8}>
                  <RatingStars n={Math.round(Number(p.rating) || 0)} size={16} />
                  <Txt variant="muted">{t('reviews.emptyBody')}</Txt>
                </Row>
              )}
              {reviews?.list.map((r) => (
                <View key={r.id} style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt variant="title">{r.rater?.name ?? t('reviews.reviewerFallback')}</Txt>
                    <RatingStars n={r.stars} />
                  </Row>
                  {!!r.text && <Txt variant="muted">{r.text}</Txt>}
                  <Txt variant="muted">{new Date(r.createdAt).toLocaleDateString()}</Txt>
                </View>
              ))}
            </>
          )}
        </Card>

        <Row gap={8}>
          <View style={{ flex: 1 }}>
            <Button full title={t('pubX.pd.requestQuote')} variant="outline" onPress={() => (user ? Alert.alert(t('pubX.pd.quoteRequestedTitle'), t('pubX.pd.quoteRequestedBody')) : nav.navigate('SignIn', {}))} />
          </View>
          <View style={{ flex: 1 }}>
            <Button full title={t('pubX.pd.transport')} variant="outline" icon="car-outline" onPress={() => Alert.alert(t('pubX.pd.transportTitle'), t('pubX.pd.transportBody'))} />
          </View>
        </Row>

        {/* related products */}
        {related.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Txt variant="h3">{t('pubX.pd.alsoLike')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {related.map((rp) => (
                <ProductCard key={rp.id} product={rp} width={150} onPress={() => nav.push('ProductDetail', { slug: rp.slug })} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* sticky buy bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flexShrink: 1 }}>
          <Txt variant="muted">{t('pubX.pd.price')}</Txt>
          <Txt variant="h3" numberOfLines={1}>{fmtPrice(p)}<Txt variant="muted">{unitSuffix(p.unit)}</Txt></Txt>
        </View>
        <Row gap={8} style={{ marginStart: 'auto' }}>
          <Button title="−" variant="outline" size="sm" onPress={() => setQty((q) => Math.max(1, q - 1))} />
          <Txt variant="title">{qty}</Txt>
          <Button title="+" variant="outline" size="sm" onPress={() => setQty((q) => q + 1)} />
        </Row>
        <Button title={t('pubX.pd.buyNow')} icon="cart" loading={buy.isPending} onPress={onBuy} />
      </View>
    </View>
  );
}
