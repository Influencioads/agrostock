import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { findCountry, type ApiProduct, type OrderDelivery } from '@agrotraders/api-client';
import { comparableUnits, convertQty, minOrderQty, toUnit } from '@agrotraders/types';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useBasket, type BasketLine } from '../../basket/BasketContext';
import { AppBar, Button, EmptyState, Input, SkeletonRows, Txt } from '../../ui';
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

/** Every free-text delivery field the buyer can type. */
type Field = 'name' | 'phone' | 'email' | 'market' | 'address' | 'location' | 'postcode';

/** What one line's submission did — kept per line so a partial failure is legible. */
interface LineResult {
  slug: string;
  name: string;
  seller: string;
  reference?: string;
  error?: string;
}

/**
 * Checkout: the whole basket, not one listing. The listing screen sells, this
 * screen collects — quantities plus the single destination they all ship to.
 *
 * There is no multi-line order in the API (an order is one listing from one
 * seller), so submitting posts one request per line, walked seller by seller:
 * each seller gets their own order, their own reference and their own
 * notification, and never sees what the buyer bought elsewhere.
 *
 * The web twin is `apps/web/src/pages/CheckoutPage.tsx`; keep the two in step.
 */
export function Checkout() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { t, lang } = useI18n();
  const { fmtCents } = useCurrency();
  const { user } = useAuth();
  const basket = useBasket();
  // Which button leads — set by the listing screen's Buy / Request quote.
  const intent = params?.intent ?? 'buy';

  const [delivery, setDelivery] = useState<{ city: string; country: string } | null>(null);
  // Undefined means untouched, which is what lets a field fall back to the
  // sign-up seed below; typing it empty still wins.
  const [form, setForm] = useState<Partial<Record<Field, string>>>({});
  const [citySearch, setCitySearch] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [results, setResults] = useState<LineResult[] | null>(null);
  const [notice, setNotice] = useState('');

  // Prices, stock and MOQ are re-read rather than trusted from storage — the
  // basket persists across sessions, and a stale price must never be checked out.
  const products = useQueries({
    queries: basket.lines.map((l) => ({
      queryKey: ['product', l.slug],
      queryFn: () => api.products.get(l.slug),
      staleTime: 60e3,
      retry: 0,
    })),
  });
  const loading = products.some((r) => r.isLoading);
  const rows = basket.lines.map((line, i) => ({ line, product: products[i]?.data as ApiProduct | undefined }));
  const orderable = rows.filter((r) => r.product);

  /** Supplier → their lines. Each group is one order per line, shipped on its own. */
  const sellers = orderable.reduce<{ id: string; name: string; rows: typeof orderable }[]>((groups, row) => {
    const id = row.product!.seller?.id ?? row.line.sellerId ?? 'unknown';
    const group = groups.find((g) => g.id === id);
    if (group) group.rows.push(row);
    else groups.push({ id, name: row.product!.seller?.name ?? row.line.sellerName ?? t('pubX.pd.sellerFallback'), rows: [row] });
    return groups;
  }, []);

  const { data: myProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.me.profile(),
    enabled: !!user,
    staleTime: 300e3,
  });
  // The account's own country is often the legacy "🇮🇳 India" display form. Seed
  // the canonical name, and seed NOTHING when it does not resolve: the order's
  // country routes the shipment and filters every provider list, so an
  // unmatchable string is worse than an empty field the guard makes them fill.
  const to =
    delivery ?? {
      city: myProfile?.originCity ?? myProfile?.location ?? '',
      country: findCountry(myProfile?.originCountry ?? user?.country)?.name ?? '',
    };
  const COUNTRY_OPTIONS = countryOptions(lang);
  // ~134k cities live on the API, not in the bundle — searched per country.
  const { data: cities = [], isFetching: citiesLoading } = useQuery({
    queryKey: ['geo-cities', to.country, citySearch],
    queryFn: () => api.geo.cities(to.country, citySearch || undefined),
    enabled: !!to.country,
    staleTime: 3600e3,
    retry: 1,
  });

  /**
   * Everything sign-up already asked for, carried straight through. Only the
   * street has no seed, because registration never asks for one — and it is
   * required below, so the buyer fills that gap once.
   */
  const seed: Partial<Record<Field, string>> = {
    name: user?.name,
    phone: myProfile?.phone ?? undefined,
    email: myProfile?.contactEmail ?? user?.email,
    market: myProfile?.market?.name ?? undefined,
  };
  const value = (key: Field) => form[key] ?? seed[key] ?? '';
  const set = (key: Field) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const trimmed = (key: Field) => value(key).trim() || undefined;

  const destination: OrderDelivery = {
    deliveryCity: to.city || undefined,
    deliveryCountry: to.country || undefined,
    deliveryAddress: trimmed('address'),
    deliveryPostcode: trimmed('postcode'),
    deliveryMarket: trimmed('market'),
    deliveryLocation: trimmed('location'),
    deliveryName: trimmed('name'),
    deliveryPhone: trimmed('phone'),
    deliveryEmail: trimmed('email'),
  };

  /** Everything the carrier and the seller cannot do without. */
  const missing = new Set<Field | 'city' | 'country'>([
    ...(['name', 'phone', 'email', 'address'] as Field[]).filter((k) => !trimmed(k)),
    ...(to.city ? [] : (['city'] as const)),
    ...(to.country ? [] : (['country'] as const)),
  ]);
  const required = t('pubX.checkout.required');
  const errorOn = (key: Field | 'city' | 'country') => (showErrors && missing.has(key) ? required : undefined);

  /** Estimated value in USD cents — null as soon as one line can't be priced. */
  const sum = (of: typeof orderable) =>
    of.reduce<number | null>((acc, { line, product }) => {
      if (acc === null || product?.priceCents == null) return null;
      const listingUnit = toUnit(product.unit);
      const inListingUnit = convertQty(line.qty, line.unit ? toUnit(line.unit) : listingUnit, listingUnit);
      return inListingUnit === undefined ? null : acc + product.priceCents * inListingUnit;
    }, 0);
  const total = sum(orderable);

  const submit = useMutation({
    mutationFn: async (kind: 'buy' | 'quote') => {
      const out: LineResult[] = [];
      for (const group of sellers) {
        for (const { line, product } of group.rows) {
          const body = { productSlug: line.slug, qty: line.qty, unit: line.unit || undefined, ...destination };
          const base = { slug: line.slug, name: product!.name, seller: group.name };
          try {
            const order = kind === 'buy' ? await api.orders.place(body) : await api.orders.enquiry(body);
            out.push({ ...base, reference: order.reference });
          } catch (e) {
            // Per line: one seller rejecting on stock must not hide the others.
            out.push({ ...base, error: errMessage(e, t('pubX.checkout.failBody')) });
          }
        }
      }
      return out;
    },
    onSuccess: (out) => {
      out.filter((r) => r.reference).forEach((r) => basket.remove(r.slug));
      setResults(out);
    },
  });

  const start = (kind: 'buy' | 'quote') => {
    setNotice('');
    setResults(null);
    setShowErrors(true);
    if (missing.size > 0) return setNotice(t('pubX.checkout.needFields'));
    submit.mutate(kind);
  };

  // No guest checkout: the basket can only be filled by a signed-in buyer, and
  // a direct link here demands the same.
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
        <AppBar title={t('pubX.checkout.title')} onBack={() => nav.goBack()} />
        <EmptyState
          icon="lock-closed-outline"
          title={t('pubX.checkout.signInTitle')}
          body={t('pubX.checkout.signInBody')}
          action={t('auth.signIn.title')}
          onAction={() => nav.navigate('SignIn', { reason: 'buy' })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      <AppBar title={t('pubX.checkout.title')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        {/* What each line did. First on the screen: after a submit it is the only
            thing the buyer is looking for. */}
        {results ? (
          <View style={s.block}>
            {results.map((r) => (
              <Text key={r.slug} style={[s.result, { color: r.reference ? C.green : C.error }]}>
                {r.name} ({r.seller}) —{' '}
                {r.reference
                  ? t(submit.variables === 'quote' ? 'pubX.checkout.quoted' : 'pubX.checkout.placed', { ref: r.reference })
                  : r.error}
              </Text>
            ))}
          </View>
        ) : null}

        {loading ? (
          <View style={{ padding: space.lg }}>
            <SkeletonRows count={Math.max(basket.count, 1)} height={80} />
          </View>
        ) : null}

        {!loading && basket.count === 0 && !results ? (
          <EmptyState
            icon="cart-outline"
            title={t('pubX.checkout.emptyTitle')}
            body={t('pubX.checkout.emptyBody')}
            action={t('mobile2.cart.browse')}
            onAction={() => nav.navigate('App')}
          />
        ) : null}

        {/* One block per seller — each block is one order, shipped and invoiced
            on its own. */}
        {sellers.map((group) => (
          <View key={group.id} style={s.block}>
            <View style={s.groupHead}>
              <Ionicons name="shield-checkmark-outline" size={15} color={C.green} />
              <Text numberOfLines={1} style={[s.supplier, microLabel()]}>{group.name}</Text>
              <Text style={s.groupSum}>{sum(group.rows) === null ? '' : fmtCents(sum(group.rows))}</Text>
            </View>
            {group.rows.map(({ line, product }) => (
              <CheckoutLine
                key={line.slug}
                line={line}
                product={product!}
                onChange={basket.setQty}
                onRemove={basket.remove}
              />
            ))}
          </View>
        ))}

        {/* Who signs for the goods. The account is the trading company; the
            person at the gate is someone else. */}
        <View style={s.block}>
          <Text style={[s.blockLabel, microLabel()]}>{t('pubX.checkout.contactHeading')}</Text>
          <View style={{ marginTop: space.sm, gap: space.md }}>
            <Input
              label={t('pubX.checkout.contactName')}
              value={value('name')}
              onChangeText={set('name')}
              error={errorOn('name')}
              maxLength={120}
            />
            <Input
              label={t('pubX.checkout.contactPhone')}
              value={value('phone')}
              onChangeText={set('phone')}
              error={errorOn('phone')}
              keyboardType="phone-pad"
              maxLength={40}
            />
            <Input
              label={t('pubX.checkout.contactEmail')}
              value={value('email')}
              onChangeText={set('email')}
              error={errorOn('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={160}
            />
          </View>
        </View>

        {/* Routes the shipment: dispatch, the hire form and the provider lists
            all derive from this. Widest-last, the way an address is written. */}
        <View style={s.block}>
          <Text style={[s.blockLabel, microLabel()]}>{t('pubX.checkout.deliverTo')}</Text>
          <View style={{ marginTop: space.sm, gap: space.md }}>
            <Input
              label={t('pubX.checkout.market')}
              placeholder={t('pubX.checkout.marketPh')}
              value={value('market')}
              onChangeText={set('market')}
              maxLength={160}
            />
            <Input
              label={t('pubX.checkout.deliveryAddress')}
              placeholder={t('pubX.checkout.deliveryAddressPh')}
              value={value('address')}
              onChangeText={set('address')}
              error={errorOn('address')}
              maxLength={240}
            />
            <Input
              label={t('pubX.checkout.location')}
              placeholder={t('pubX.checkout.locationPh')}
              value={value('location')}
              onChangeText={set('location')}
              maxLength={160}
            />
            <PickerField
              label={t('pubX.checkout.deliveryCountry')}
              placeholder={t('auth.signUp.countryPh')}
              value={to.country}
              displayValue={COUNTRY_OPTIONS.find((c) => c.value === to.country)?.label}
              options={COUNTRY_OPTIONS}
              error={errorOn('country')}
              // Cities belong to a country, so changing it invalidates the city pick.
              onChange={(country) => setDelivery({ city: '', country })}
            />
            <PickerField
              label={t('pubX.checkout.deliveryCity')}
              placeholder={to.country ? t('auth.signUp.cityRegionPh') : t('auth.signUp.pickCountryFirst')}
              value={to.city}
              options={cities.map((c) => ({ value: c }))}
              error={errorOn('city')}
              onChange={(city) => setDelivery({ ...to, city })}
              onSearch={setCitySearch}
              loading={citiesLoading}
              disabled={!to.country}
              emptyLabel={t('auth.signUp.noCities')}
            />
            <Input
              label={t('pubX.checkout.postcode')}
              value={value('postcode')}
              onChangeText={set('postcode')}
              maxLength={24}
            />
          </View>
        </View>

        {orderable.length > 0 ? (
          <View style={s.block}>
            <Text style={[s.blockLabel, microLabel()]}>{t('pubX.checkout.summary')}</Text>
            <View style={s.totalRow}>
              <Txt variant="muted">{t('pubX.checkout.estTotal')}</Txt>
              <Txt variant="title">{total === null ? '—' : fmtCents(total)}</Txt>
            </View>
            <Txt variant="small">{t('pubX.checkout.splitLine', { orders: orderable.length, sellers: sellers.length })}</Txt>
          </View>
        ) : null}

        <View style={s.safe}>
          <Ionicons name="shield-checkmark" size={18} color={C.dark} />
          <Text style={s.safeText}>{t('pubX.checkout.protected')}</Text>
        </View>
      </ScrollView>

      {orderable.length > 0 ? (
        <View style={s.bar}>
          {notice ? <Txt variant="small" color={C.error} style={{ marginBottom: space.sm }}>{notice}</Txt> : null}
          <View style={{ gap: space.sm }}>
            {(intent === 'quote' ? (['quote', 'buy'] as const) : (['buy', 'quote'] as const)).map((kind, i) => (
              <Button
                key={kind}
                full
                variant={i === 0 ? 'primary' : 'outline'}
                title={kind === 'buy' ? t('pubX.checkout.placeOrder') : t('pubX.pd.requestQuote')}
                loading={submit.isPending && submit.variables === kind}
                onPress={() => start(kind)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** One basket line: what it is, how much of it, and in which metric. */
function CheckoutLine({
  line,
  product,
  onChange,
  onRemove,
}: {
  line: BasketLine;
  product: ApiProduct;
  onChange: (slug: string, qty: number, unit?: string) => void;
  onRemove: (slug: string) => void;
}) {
  const { t } = useI18n();
  const listingUnit = toUnit(product.unit);
  const unitChoices = comparableUnits(listingUnit);
  const buyerUnit = line.unit ? toUnit(line.unit) : listingUnit;
  const min = minOrderQty(product.moq, listingUnit, buyerUnit);
  // Typed freely and clamped to the listing's minimum on blur — clamping on
  // every keystroke makes "500" impossible to type when the MOQ is 15.
  const [draft, setDraft] = useState(String(line.qty));

  return (
    <View style={{ gap: space.sm }}>
      <ProductRow
        product={product}
        right={
          <Pressable onPress={() => onRemove(line.slug)} hitSlop={8}>
            <Ionicons name="close" size={18} color={C.inkSoft} />
          </Pressable>
        }
      />
      <View style={s.qtyRow}>
        <Input
          label={t('pubX.checkout.quantity')}
          value={draft}
          onChangeText={setDraft}
          onBlur={() => {
            const next = Math.max(min, Number(draft) || 0);
            setDraft(String(next));
            onChange(line.slug, next);
          }}
          keyboardType="numeric"
          style={{ minWidth: 90 }}
        />
        {unitChoices.length > 1 ? (
          <View style={{ flex: 1 }}>
            <PickerField
              label={t('pubX.checkout.quantityUnit')}
              value={buyerUnit}
              displayValue={t(`enums:unit.${buyerUnit}`)}
              options={unitChoices.map((u) => ({ value: u, label: t(`enums:unit.${u}`) }))}
              // Switching metric restates the quantity: 50 MT means 50,000 KG,
              // not 50 KG, which is under every MOQ this listing has.
              onChange={(u) => {
                const unit = toUnit(u);
                const restated = convertQty(line.qty, buyerUnit, unit) ?? line.qty;
                const next = Math.max(minOrderQty(product.moq, listingUnit, unit), Math.round(restated * 1000) / 1000);
                setDraft(String(next));
                onChange(line.slug, next, unit);
              }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  block: { backgroundColor: C.white, paddingHorizontal: space.lg, paddingVertical: space.lg, gap: space.md },
  blockLabel: { ...type.micro, color: C.inkMuted },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  supplier: { ...type.title, fontSize: 13, color: C.ink, flex: 1 },
  groupSum: { ...type.numeric, fontSize: 13, color: C.ink },
  qtyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  result: { ...type.caption, lineHeight: 19 },
  safe: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, paddingHorizontal: space.lg, paddingVertical: space.md },
  safeText: { ...type.caption, color: C.dark, flex: 1 },
  bar: {
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    paddingBottom: space.lg,
  },
});
