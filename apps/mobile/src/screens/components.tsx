import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { socialProof, type ApiProduct } from '@agrotraders/api-client';
import { C, cardShadow, radius } from '../theme/tokens';
import { assetUrl } from '../lib/api';
import { useCurrency } from '../currency/CurrencyContext';
import { Badge } from '../ui';
import { useI18n } from '../i18n';
import { unitSuffix } from '@agrotraders/types';

function discountFor(name: string) {
  return 10 + (name.length % 6);
}

/** Compact product card for carousels (fixed width) or grids (flex). */
export function ProductCard({ product, onPress, width }: { product: ApiProduct; onPress?: () => void; width?: number }) {
  const { fmtPrice } = useCurrency();
  const { t } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);
  const proof = socialProof(product.id);
  const imageUri = imageFailed ? undefined : assetUrl(product.imageUrl);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { width: width ?? '100%', backgroundColor: C.white, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border, padding: 12, opacity: pressed ? 0.9 : 1, ...cardShadow },
      ]}
    >
      <View style={{ height: 76, borderRadius: radius.md, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setImageFailed(true)} />
        ) : (
          <Text style={{ fontSize: 38 }}>{product.emoji ?? '🌾'}</Text>
        )}
        {product.isOffer ? (
          <View style={{ position: 'absolute', top: 6, left: 6 }}><Badge label={`-${discountFor(product.name)}%`} tone="mango" /></View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ marginTop: 8, fontWeight: '700', color: C.ink }}>{product.name}</Text>
      <Text numberOfLines={1} style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>
        {product.flag} {product.origin ?? product.grade ?? ''}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontWeight: '800', color: C.ink }}>
          {fmtPrice(product)}<Text style={{ fontSize: 11, fontWeight: '400', color: C.inkSoft }}>{unitSuffix(product.unit)}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name="star" size={12} color={C.mangoDeep} />
          <Text style={{ fontSize: 12, color: C.inkSoft }}>{product.rating}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 10.5, color: C.orange, fontWeight: '700', marginTop: 3 }}>
        {t('compX.product.social', { watching: proof.watching, ordered: proof.orderedLastMonth })}
      </Text>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
        {product.verified ? <Badge label={t('compX.product.verified')} tone="green" /> : null}
        {product.safeDeal ? <Badge label={t('compX.product.safeDeal')} tone="info" /> : null}
        {product.isAuction ? <Badge label={t('compX.product.auction')} tone="gold" /> : null}
      </View>
    </Pressable>
  );
}
