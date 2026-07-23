import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueries } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiProduct } from '@agrotraders/api-client';
import { toUnit } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button, EmptyState, SkeletonRows } from '../../ui';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { ProductRow } from '../components';
import { useBasket, type BasketLine } from '../../basket/BasketContext';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** A basket line joined with its freshly-fetched product. */
interface ResolvedLine {
  line: BasketLine;
  product: ApiProduct;
}

/**
 * The RFQ basket: lines grouped by supplier, because in B2B the supplier — not
 * the order — is the unit of work. Each group sends its own request for quote.
 *
 * Reached from the header basket icon (route id `Cart`, kept as-is so existing
 * navigation call sites and their translated titles don't churn).
 */
export function RfqBasket() {
  const nav = useNavigation<Nav>();
  const { t } = useI18n();
  const { user } = useAuth();
  const basket = useBasket();
  const [sent, setSent] = useState<string[]>([]);

  // Prices and availability are re-read rather than trusted from storage.
  const results = useQueries({
    queries: basket.lines.map((l) => ({
      queryKey: ['product', l.slug],
      queryFn: () => api.products.get(l.slug),
      staleTime: 60e3,
    })),
  });

  const loading = results.some((r) => r.isLoading);

  /** Supplier → their lines. Unknown suppliers fall into one "other" group. */
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; lines: ResolvedLine[] }>();
    basket.lines.forEach((line, i) => {
      const product = results[i]?.data;
      if (!product) return;
      const id = product.seller?.id ?? line.sellerId ?? 'unknown';
      const name = product.seller?.name ?? line.sellerName ?? t('pubX.pd.sellerFallback');
      const entry = map.get(id) ?? { name, lines: [] };
      entry.lines.push({ line, product });
      map.set(id, entry);
    });
    return [...map.entries()].map(([id, g]) => ({ id, ...g }));
  }, [basket.lines, results, t]);

  const requestQuotes = useMutation({
    mutationFn: async (group: { id: string; name: string; lines: ResolvedLine[] }) => {
      // One requirement per line — `buyerBids.create` describes a single product
      // need, and quote mode keeps the responses sealed to the buyer.
      for (const { line, product } of group.lines) {
        const categoryId =
          product.category && typeof product.category === 'object' && 'id' in product.category
            ? (product.category as { id: string }).id
            : undefined;
        await api.buyerBids.create({
          mode: 'quote',
          title: product.name,
          productName: product.name,
          qtyValue: line.qty,
          qtyUnit: toUnit(product.unit),
          categoryId,
          notes: t('pubX.rfq.noteFromBasket', { supplier: group.name }),
        });
      }
      return group.id;
    },
    onSuccess: (id) => {
      setSent((cur) => [...cur, id]);
      Alert.alert(t('pubX.rfq.sentTitle'), t('pubX.rfq.sentBody'));
    },
    onError: () => Alert.alert(t('pubX.rfq.failTitle'), t('pubX.rfq.failBody')),
  });

  const submit = (group: { id: string; name: string; lines: ResolvedLine[] }) => {
    if (!user) {
      nav.navigate('SignIn', {});
      return;
    }
    requestQuotes.mutate(group);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
      {/* Header — back, title with live count, and an escrow-assurance pill. */}
      <View style={s.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
        <Text style={s.headerTitle}>{t('pubX.rfq.title')}</Text>
        {basket.count > 0 ? <Text style={s.headerCount}>({basket.count})</Text> : null}
        <View style={{ flex: 1 }} />
        <View style={s.escrowPill}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.green} />
          <Text style={s.escrowPillText}>{t('pubX.rfq.escrow')}</Text>
        </View>
        {basket.count > 0 ? (
          <Pressable onPress={() => basket.clear()} hitSlop={8} style={{ marginStart: 6 }} accessibilityLabel={t('pubX.filter.clearAll')}>
            <Ionicons name="trash-outline" size={19} color={C.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      {basket.count === 0 ? (
        <EmptyState
          icon="clipboard-outline"
          title={t('pubX.rfq.emptyTitle')}
          body={t('pubX.rfq.emptyBody')}
          action={t('mobile2.cart.browse')}
          onAction={() => nav.navigate('App')}
        />
      ) : loading ? (
        <View style={{ padding: space.lg }}>
          <SkeletonRows count={basket.count} height={72} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.xl, gap: space.md }}>
          {groups.map((g) => (
            <View key={g.id} style={s.group}>
              <View style={s.groupHead}>
                <Ionicons name="shield-checkmark-outline" size={15} color={C.green} />
                <Text numberOfLines={1} style={[s.supplier, microLabel()]}>{g.name}</Text>
                <Text style={s.lineCount}>{t('pubX.rfq.lineCount', { count: g.lines.length })}</Text>
              </View>

              {g.lines.map(({ line, product }) => (
                <ProductRow
                  key={line.slug}
                  product={product}
                  onPress={() => nav.navigate('ProductDetail', { slug: line.slug })}
                  right={
                    <View style={{ alignItems: 'flex-end', gap: space.sm }}>
                      <Pressable onPress={() => basket.remove(line.slug)} hitSlop={8}>
                        <Ionicons name="close" size={17} color={C.inkSoft} />
                      </Pressable>
                      <View style={s.stepper}>
                        <Pressable onPress={() => basket.setQty(line.slug, line.qty - 1)} hitSlop={6} style={s.stepBtn}>
                          <Ionicons name="remove" size={15} color={C.ink} />
                        </Pressable>
                        <Text style={s.stepValue}>{line.qty}</Text>
                        <Pressable onPress={() => basket.setQty(line.slug, line.qty + 1)} hitSlop={6} style={s.stepBtn}>
                          <Ionicons name="add" size={15} color={C.ink} />
                        </Pressable>
                      </View>
                    </View>
                  }
                />
              ))}

              <View style={s.groupFoot}>
                <Button
                  full
                  title={sent.includes(g.id) ? t('pubX.rfq.sentLabel') : t('pubX.rfq.requestQuotes')}
                  variant={sent.includes(g.id) ? 'outline' : 'primary'}
                  disabled={sent.includes(g.id)}
                  loading={requestQuotes.isPending && requestQuotes.variables?.id === g.id}
                  onPress={() => submit(g)}
                />
              </View>
            </View>
          ))}

          <View style={s.noteCard}>
            <Ionicons name="pricetag-outline" size={17} color={C.gold} />
            <Text style={s.note}>{t('pubX.rfq.footNote')}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...type.h1, fontSize: 24, color: C.ink },
  headerCount: { ...type.h3, color: C.inkMuted, marginStart: -4 },
  escrowPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  escrowPillText: { ...type.micro, fontSize: 11, color: C.green, letterSpacing: 0.4 },

  // Each supplier is its own card with a tinted header strip.
  group: { backgroundColor: C.white, marginHorizontal: space.lg, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, overflow: 'hidden' },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: space.lg,
    paddingVertical: 11,
    backgroundColor: C.surface,
  },
  supplier: { ...type.title, fontSize: 13, color: C.ink, flex: 1 },
  lineCount: { ...type.caption, color: C.inkSoft },
  groupFoot: { padding: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairline },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: radius.pill,
    height: 34,
  },
  stepBtn: { paddingHorizontal: 10, height: '100%', justifyContent: 'center' },
  stepValue: { ...type.numeric, fontSize: 13, minWidth: 24, textAlign: 'center' },
  noteCard: { flexDirection: 'row', gap: 10, marginHorizontal: space.lg, marginTop: space.md, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: radius.card, padding: 16 },
  note: { ...type.caption, color: C.inkSoft, flex: 1, lineHeight: 19 },
});
