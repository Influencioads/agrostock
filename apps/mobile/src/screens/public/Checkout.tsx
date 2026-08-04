import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiProduct } from '@agrotraders/api-client';
import { parseQtyIn, toUnit, unitSuffix } from '@agrotraders/types';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { AppBar, Button, Input, KeyValue, SkeletonRows, Txt } from '../../ui';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { useCurrency } from '../../currency/CurrencyContext';
import { ProductRow } from '../components';
import { PickerField } from '../components/PickerSheet';
import { countryOptions } from '../../lib/countries';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'Checkout'>;

export function Checkout() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { t, lang } = useI18n();
  const { fmtPrice } = useCurrency();
  const slug = params?.slug;
  // Seeded from the listing screen's stepper — the buyer already picked both.
  const [qty, setQty] = useState(params?.qty ?? 1);
  const { data: p, isLoading } = useQuery<ApiProduct>({ queryKey: ['product', slug], queryFn: () => api.products.get(slug!), enabled: !!slug });

  // Where the goods are going. The order had no destination at all before, which
  // left dispatch and every hire guessing at the buyer's country. Seeded from the
  // buyer's own registered place, so the usual case needs no input.
  const [delivery, setDelivery] = useState<{ city: string; country: string } | null>(null);
  // Street + postcode, typed per order — a buyer's warehouse is not their
  // profile address, so there is nothing to seed these from.
  const [address, setAddress] = useState({ line: '', postcode: '' });
  const [citySearch, setCitySearch] = useState('');
  const { data: myProfile } = useQuery({ queryKey: ['my-profile'], queryFn: () => api.me.profile(), staleTime: 300e3 });
  const to =
    delivery ?? { city: myProfile?.originCity ?? myProfile?.location ?? '', country: myProfile?.originCountry ?? '' };
  const COUNTRY_OPTIONS = countryOptions(lang);
  // ~134k cities live on the API, not in the bundle — searched per country.
  const { data: cities = [], isFetching: citiesLoading } = useQuery({
    queryKey: ['geo-cities', to.country, citySearch],
    queryFn: () => api.geo.cities(to.country, citySearch || undefined),
    enabled: !!to.country,
    staleTime: 3600e3,
    retry: 1,
  });

  const place = useMutation({
    mutationFn: () =>
      api.orders.place({
        productSlug: slug!,
        qty,
        unit: params?.unit,
        deliveryCity: to.city || undefined,
        deliveryCountry: to.country || undefined,
        deliveryAddress: address.line.trim() || undefined,
        deliveryPostcode: address.postcode.trim() || undefined,
      }),
    onSuccess: () => { Alert.alert(t('pubX.checkout.placedTitle'), t('pubX.checkout.placedBody')); nav.navigate('App'); },
    // Show WHY it failed — under the listing's minimum order, out of stock — not
    // one generic sentence for every rejection.
    onError: (e) => Alert.alert(t('pubX.checkout.failTitle'), errMessage(e, t('pubX.checkout.failBody'))),
  });

  // The quantity goes up in the listing's own unit (no unit picker here), so the
  // listing's minimum order is the floor for the stepper.
  const minQty = Math.max(parseQtyIn(p?.moq, toUnit(p?.unit)) ?? 0, 1);
  useEffect(() => setQty((q) => Math.max(q, minQty)), [minQty]);

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
                <Pressable onPress={() => setQty((q) => Math.max(minQty, q - 1))} hitSlop={6} style={s.stepBtn}>
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

        {/* Routes the shipment: dispatch, the hire form and the provider lists all
            derive from this. */}
        <View style={s.block}>
          <Text style={[s.blockLabel, microLabel()]}>{t('pubX.checkout.deliverTo')}</Text>
          <View style={{ marginTop: space.sm, gap: space.md }}>
            <PickerField
              label={t('pubX.checkout.deliveryCountry')}
              placeholder={t('auth.signUp.countryPh')}
              value={to.country}
              displayValue={COUNTRY_OPTIONS.find((c) => c.value === to.country)?.label}
              options={COUNTRY_OPTIONS}
              // Cities belong to a country, so changing it invalidates the city pick.
              onChange={(country) => setDelivery({ city: '', country })}
            />
            <PickerField
              label={t('pubX.checkout.deliveryCity')}
              placeholder={to.country ? t('auth.signUp.cityRegionPh') : t('auth.signUp.pickCountryFirst')}
              value={to.city}
              options={cities.map((c) => ({ value: c }))}
              onChange={(city) => setDelivery({ ...to, city })}
              onSearch={setCitySearch}
              loading={citiesLoading}
              disabled={!to.country}
              emptyLabel={t('auth.signUp.noCities')}
            />
            {/* The street. A town name routes the shipment to the right city and
                leaves the driver to find the gate. */}
            <Input
              label={t('pubX.checkout.deliveryAddress')}
              placeholder={t('pubX.checkout.deliveryAddressPh')}
              value={address.line}
              onChangeText={(line) => setAddress({ ...address, line })}
              maxLength={240}
            />
            <Input
              label={t('pubX.checkout.postcode')}
              value={address.postcode}
              onChangeText={(postcode) => setAddress({ ...address, postcode })}
              maxLength={24}
            />
          </View>
        </View>

        <View style={s.block}>
          <Text style={[s.blockLabel, microLabel()]}>{t('pubX.checkout.title')}</Text>
          <View style={{ marginTop: space.sm }}>
            <KeyValue label={t('pubX.pd.price')} value={`${fmtPrice(p)}${unitSuffix(p.unit, t)}`} />
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
