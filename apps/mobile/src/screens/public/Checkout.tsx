import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiProduct } from '@agrotraders/api-client';
import { unitSuffix } from '@agrotraders/types';
import { api } from '../../lib/api';
import { AppBar, Button, KeyValue, SkeletonRows, Txt } from '../../ui';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { useCurrency } from '../../currency/CurrencyContext';
import { ProductRow } from '../components';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'Checkout'>;

export function Checkout() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { t } = useI18n();
  const { fmtPrice } = useCurrency();
  const slug = params?.slug;
  const [qty, setQty] = useState(1);
  const { data: p, isLoading } = useQuery<ApiProduct>({ queryKey: ['product', slug], queryFn: () => api.products.get(slug!), enabled: !!slug });
  const place = useMutation({
    mutationFn: () => api.orders.place({ productSlug: slug!, qty }),
    onSuccess: () => { Alert.alert(t('pubX.checkout.placedTitle'), t('pubX.checkout.placedBody')); nav.navigate('App'); },
    onError: () => Alert.alert(t('pubX.checkout.failTitle'), t('pubX.checkout.failBody')),
  });

  const body = () => {
    if (!slug) return <Txt variant="muted" style={{ padding: space.lg }}>{t('pubX.checkout.nothing')}</Txt>;
    if (isLoading || !p) return <View style={{ padding: space.lg }}><SkeletonRows count={1} height={95} /></View>;
    return (
      <>
        <View style={s.block}>
          <ProductRow
            product={p}
            right={
              <View style={s.stepper}>
                <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={6} style={s.stepBtn}>
                  <Ionicons name="remove" size={15} color={C.ink} />
                </Pressable>
                <Text style={s.stepValue}>{qty}</Text>
                <Pressable onPress={() => setQty((q) => q + 1)} hitSlop={6} style={s.stepBtn}>
                  <Ionicons name="add" size={15} color={C.ink} />
                </Pressable>
              </View>
            }
          />
        </View>

        <View style={s.block}>
          <Text style={[s.blockLabel, microLabel()]}>{t('pubX.checkout.title')}</Text>
          <View style={{ marginTop: space.sm }}>
            <KeyValue label={t('pubX.pd.price')} value={`${fmtPrice(p)}${unitSuffix(p.unit)}`} />
            <KeyValue label={t('pubX.checkout.quantity')} value={String(qty)} strong />
          </View>
        </View>

        <View style={s.safe}>
          <Ionicons name="shield-checkmark" size={18} color={C.dark} />
          <Text style={s.safeText}>{t('pubX.checkout.protected')}</Text>
        </View>
      </>
    );
  };

  // AppBar owns the status-bar inset — see Browse.tsx.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      <AppBar title={t('pubX.checkout.title')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}>{body()}</ScrollView>
      {slug && p ? (
        <View style={s.bar}>
          <Button full title={t('pubX.checkout.placeOrder')} loading={place.isPending} onPress={() => place.mutate()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  block: { backgroundColor: C.white, paddingHorizontal: space.lg, paddingVertical: space.lg },
  blockLabel: { ...type.micro, color: C.inkMuted },
  safe: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, paddingHorizontal: space.lg, paddingVertical: space.md },
  safeText: { ...type.caption, color: C.dark, flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: radius.card,
    height: 32,
  },
  stepBtn: { paddingHorizontal: 8, height: '100%', justifyContent: 'center' },
  stepValue: { ...type.title, fontSize: 13, minWidth: 22, textAlign: 'center' },
  bar: {
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    paddingBottom: space.lg,
  },
});
