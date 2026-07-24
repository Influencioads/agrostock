import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiCategory, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { C, font, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { SkeletonCard, SkeletonGrid } from '../../ui';
import { ProductCard } from '../components';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth/AuthProvider';
import { useChatBadge } from '../../chat/ChatBadgeContext';
import { useBasket } from '../../basket/BasketContext';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Soft tile tints for the category rail — a rotating set of muted commodity
 * hues (green, amber, chilli, olive, cotton-blue) matching the prototype. Each
 * pairs a fill with a legible label colour for the two-letter monogram.
 */
const CAT_TINTS: { bg: string; fg: string }[] = [
  { bg: '#DDECD2', fg: '#3E6B2A' },
  { bg: '#F6E7D3', fg: '#8A6410' },
  { bg: '#F7E0D8', fg: '#9C4A21' },
  { bg: '#EFF0DC', fg: '#6E7020' },
  { bg: '#DFF0E4', fg: '#146B3A' },
  { bg: '#E9EFF4', fg: '#3D5A73' },
];

/** Circular icon button used in the header (bell, etc.). */
function CircleBtn({ icon, onPress, dot }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; dot?: boolean }) {
  return (
    <Pressable onPress={onPress} style={s.circleBtn} hitSlop={6}>
      <Ionicons name={icon} size={20} color={C.ink} />
      {dot ? <View style={s.circleDot} /> : null}
    </Pressable>
  );
}

/** A category as a soft rounded tile with a two-letter monogram. */
function CategoryTile({ cat, index, onPress }: { cat: ApiCategory; index: number; onPress: () => void }) {
  const tint = CAT_TINTS[index % CAT_TINTS.length];
  const mono = cat.name.replace(/[^A-Za-z]/g, '').slice(0, 2);
  const label = mono ? mono[0].toUpperCase() + (mono[1] ?? '').toLowerCase() : '·';
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 8, width: 84 }}>
      <View style={[s.catTile, { backgroundColor: tint.bg }]}>
        <Text style={{ fontFamily: font.displayExtra, fontSize: 26, color: tint.fg }}>{label}</Text>
      </View>
      <Text numberOfLines={1} style={s.catLabel}>{cat.name}</Text>
    </Pressable>
  );
}

export function Home() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuth();
  const { unread, clear } = useChatBadge();
  const basket = useBasket();
  const [tab, setTab] = useState('all');

  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const { data: offers = [], isLoading: offersLoading } = useQuery<ApiProduct[]>({ queryKey: ['products', 'offer'], queryFn: () => api.products.list({ offer: true }) });
  const { data: allProducts = [], isLoading: allLoading } = useQuery<ApiProduct[]>({ queryKey: ['products', 'all'], queryFn: () => api.products.list({}) });
  const { data: promoted = [] } = useQuery<ApiProduct[]>({ queryKey: ['ads', 'promoted'], queryFn: () => api.ads.promoted(8) });
  const featured = useMemo(() => {
    const seen = new Set(promoted.map((p) => p.id));
    return [...promoted, ...allProducts.filter((p) => !seen.has(p.id))];
  }, [promoted, allProducts]);
  // F30: ids of paid ad placements, so their cards render a "Sponsored" label.
  const promotedIds = useMemo(() => new Set(promoted.map((p) => p.id)), [promoted]);

  const open = (p: ApiProduct) => nav.navigate('ProductDetail', { slug: p.slug });
  // Guests have no profile to load — send them to sign in instead of the
  // profile form, which would otherwise hang on a /me call that never resolves.
  const openProfile = () => (user ? nav.navigate('ProfileForm') : nav.navigate('SignIn', {}));
  const toSearch = (category?: string, title?: string) => nav.navigate('Search', category ? { category, title: title ?? category } : undefined);
  // The gradient hero leads with a live ad when there is one, else opens search.
  const heroOpen = () => (promoted[0] ? open(promoted[0]) : toSearch());

  const tabs = [{ id: 'all', name: t('pubX.home.catAll') }, ...categories.slice(0, 6).map((c) => ({ id: c.name, name: c.name }))];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      {/* Header — deliver-to, notifications + account, a rounded search pill and
          the underline category strip. Owns the status-bar inset. */}
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <View style={s.headerRow}>
          <Pressable style={s.deliver} onPress={openProfile} hitSlop={6}>
            <View style={s.deliverIcon}><Ionicons name="location-outline" size={18} color={C.green} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.deliverLabel, microLabel()]}>{t('pubX.home.deliverTo')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text numberOfLines={1} style={s.deliverCity}>{user?.country || 'India'}</Text>
                <Ionicons name="chevron-down" size={15} color={C.ink} />
              </View>
            </View>
          </Pressable>
          <CircleBtn icon="notifications-outline" dot onPress={() => nav.navigate('Notifications')} />
          <Pressable onPress={openProfile} style={s.avatar} hitSlop={6}>
            <Text style={s.avatarText}>{(user?.name ?? 'AK').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</Text>
          </Pressable>
        </View>

        <Pressable style={s.search} onPress={() => nav.navigate('Search', undefined)}>
          <Ionicons name="search" size={19} color={C.inkMuted} />
          <Text numberOfLines={1} style={s.searchHint}>{t('pubX.home.searchHint')}</Text>
          <Ionicons name="mic-outline" size={19} color={C.green} />
          <View style={s.searchRule} />
          <Ionicons name="camera-outline" size={19} color={C.green} />
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabStrip}>
          {tabs.map((tb) => {
            const active = tb.id === tab;
            return (
              <Pressable
                key={tb.id}
                onPress={() => { setTab(tb.id); if (tb.id !== 'all') toSearch(tb.id); }}
                style={[s.tabItem, active && s.tabItemActive]}
              >
                <Text style={[s.tabText, { color: active ? C.green : C.inkSoft }]}>{tb.name}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => toSearch()} style={[s.tabItem, { paddingHorizontal: 4 }]}>
            <Ionicons name="grid-outline" size={18} color={C.green} />
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Category tiles */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRail}>
          {categories.map((c, i) => (
            <CategoryTile key={c.id} cat={c} index={i} onPress={() => toSearch(c.name)} />
          ))}
        </ScrollView>

        {/* First-order promo — amber outlined banner with a CLAIM affordance. */}
        <Pressable style={s.promo} onPress={() => toSearch()}>
          <View style={s.promoTag}><Ionicons name="pricetag-outline" size={17} color={C.gold} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.promoTitle}>{t('pubX.home.promoTitle')}</Text>
            <Text style={s.promoBody}>{t('pubX.home.promoBody')}</Text>
          </View>
          <View style={s.promoDivider} />
          <Text style={s.promoCta}>{t('pubX.home.promoCta')}</Text>
        </Pressable>

        {/* Gradient hero */}
        <Pressable onPress={heroOpen} style={s.heroWrap}>
          <LinearGradient colors={['#0B3D2E', '#146B3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={s.hero}>
            <View style={s.heroCircle} />
            <Text style={[s.heroTag, microLabel()]}>{t('pubX.home.heroTag')}</Text>
            <Text style={s.heroTitle}>{t('pubX.home.heroTitle')}</Text>
            <View style={s.heroBtn}><Text style={s.heroBtnText}>{t('pubX.home.heroCta')}</Text></View>
            <View style={s.heroDots}>
              {[0, 1, 2].map((i) => <View key={i} style={[s.heroDot, i === 0 && s.heroDotActive]} />)}
            </View>
          </LinearGradient>
        </Pressable>

        {/* Deal of the day */}
        <View style={s.sectionRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Ionicons name="flash" size={19} color={C.mango} />
            <Text style={s.sectionTitle}>{t('pubX.home.dealOfDay')}</Text>
            <View style={s.countdown}><Text style={s.countdownText}>04:12:33</Text></View>
          </View>
          <Pressable onPress={() => toSearch()} hitSlop={6}><Text style={s.seeAll}>{t('pubX.home.seeAll')}</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
          {offersLoading
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} width={150} />)
            : offers.map((p) => <ProductCard key={p.id} product={p} width={150} onPress={() => open(p)} />)}
        </ScrollView>

        {/* Safe-Deal escrow band */}
        <Pressable onPress={() => nav.navigate('SafeDeal')} style={s.safeWrap}>
          <LinearGradient colors={['#0B3D2E', '#146B3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.safe}>
            <View style={s.safeIcon}><Ionicons name="shield-checkmark" size={20} color={C.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.safeTitle}>{t('pubX.home.safeDealTitle')}</Text>
              <Text style={s.safeBody}>{t('pubX.home.safeDealBody')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.mint} />
          </LinearGradient>
        </Pressable>

        {/* Fresh arrivals grid */}
        <View style={[s.sectionRow, { marginTop: space.sm }]}>
          <Text style={s.sectionTitle}>{t('pubX.home.freshArrivals')}</Text>
          <Pressable onPress={() => toSearch()} hitSlop={6}><Text style={s.seeAll}>{t('pubX.home.seeAll')}</Text></Pressable>
        </View>
        <View style={s.grid}>
          {allLoading ? (
            <SkeletonGrid count={4} />
          ) : (
            featured.slice(0, 8).map((p) => (
              <View key={p.id} style={{ width: '47.5%' }}>
                <ProductCard product={p} onPress={() => open(p)} sponsored={promotedIds.has(p.id)} />
              </View>
            ))
          )}
        </View>

        {/* RFQ prompt */}
        <Pressable style={s.rfq} onPress={() => nav.navigate('BuyerBidsBoard')}>
          <View style={s.rfqIcon}><Ionicons name="document-text-outline" size={22} color={C.green} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.rfqTitle}>{t('pubX.home.cantFindTitle')}</Text>
            <Text style={s.rfqBody}>{t('pubX.home.cantFindBody')}</Text>
          </View>
          <View style={s.rfqBtn}><Text style={s.rfqBtnText}>{t('pubX.home.postRfq')}</Text></View>
        </Pressable>
      </ScrollView>

      {/* Community chat (bottom-left) + basket (amber, bottom-right). */}
      <Pressable onPress={() => { clear(); nav.navigate('Community'); }} style={s.fabChat} accessibilityLabel={t('pubX.home.communityA11y')}>
        <Ionicons name="chatbubbles" size={22} color={C.white} />
        {unread > 0 ? <View style={s.fabBadge}><Text style={s.fabBadgeText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
      </Pressable>
      <Pressable onPress={() => nav.navigate('Cart')} style={s.fabCart} accessibilityLabel={t('pubX.home.postRfq')}>
        <Ionicons name="bag-handle-outline" size={24} color={C.white} />
        {basket.count > 0 ? <View style={s.fabBadge}><Text style={s.fabBadgeText}>{basket.count > 99 ? '99+' : basket.count}</Text></View> : null}
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.page, paddingBottom: 2, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg },
  deliver: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  deliverIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  deliverLabel: { ...type.micro, fontSize: 10, color: C.inkMuted },
  deliverCity: { ...type.h3, fontSize: 16, color: C.ink },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  circleDot: { position: 'absolute', top: 10, right: 11, width: 7, height: 7, borderRadius: 4, backgroundColor: C.mango },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...type.title, fontSize: 14, color: C.white },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: space.lg, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: 26, height: 50, paddingHorizontal: 16, ...elevationCard() },
  searchHint: { flex: 1, ...type.body, fontSize: 14.5, color: C.inkMuted },
  searchRule: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: C.border },
  tabStrip: { gap: 20, paddingHorizontal: space.lg, alignItems: 'center' },
  tabItem: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: C.green },
  tabText: { ...type.title, fontSize: 15 },

  catRail: { gap: 4, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  catTile: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  catLabel: { ...type.caption, fontSize: 12, color: C.ink },

  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: space.lg, marginTop: space.sm, backgroundColor: C.mangoSoft, borderWidth: 1, borderColor: '#E7C88A', borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 16 },
  promoTag: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FBE7C2', alignItems: 'center', justifyContent: 'center' },
  promoTitle: { ...type.title, fontSize: 14, color: '#7A5A12' },
  promoBody: { ...type.caption, color: '#9A7A32', marginTop: 1 },
  promoDivider: { width: 1, height: 34, backgroundColor: '#E7C88A' },
  promoCta: { ...type.micro, fontSize: 12, color: C.gold, letterSpacing: 0.4 },

  heroWrap: { marginHorizontal: space.lg, marginTop: space.lg, borderRadius: radius.card, ...elevationCard() },
  hero: { borderRadius: radius.card, padding: 22, minHeight: 190, justifyContent: 'center', overflow: 'hidden' },
  heroCircle: { position: 'absolute', right: -40, top: -20, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTag: { ...type.micro, fontSize: 11, color: '#9ED8B0' },
  heroTitle: { ...type.h1, fontSize: 26, color: C.white, marginTop: 8, maxWidth: '80%' },
  heroBtn: { alignSelf: 'flex-start', marginTop: 18, backgroundColor: C.white, borderRadius: 22, paddingHorizontal: 20, height: 44, justifyContent: 'center' },
  heroBtnText: { ...type.title, fontSize: 14, color: C.evergreen },
  heroDots: { position: 'absolute', right: 22, bottom: 18, flexDirection: 'row', gap: 5 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  heroDotActive: { width: 18, backgroundColor: C.white },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.sm },
  sectionTitle: { ...type.h2, fontSize: 20, color: C.ink },
  countdown: { backgroundColor: C.mangoSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  countdownText: { ...type.numeric, fontSize: 12, color: C.mangoDeep },
  seeAll: { ...type.title, fontSize: 14, color: C.green },
  rail: { gap: space.md, paddingHorizontal: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg },

  safeWrap: { marginHorizontal: space.lg, marginTop: space.xl, borderRadius: radius.card, ...elevationCard() },
  safe: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 16, overflow: 'hidden' },
  safeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  safeTitle: { ...type.h3, fontSize: 15, color: C.white },
  safeBody: { ...type.caption, color: C.mint, marginTop: 1 },

  rfq: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: space.lg, marginTop: space.xl, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: radius.card, padding: 16 },
  rfqIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  rfqTitle: { ...type.h3, fontSize: 15, color: C.ink },
  rfqBody: { ...type.caption, color: C.inkSoft, marginTop: 2 },
  rfqBtn: { backgroundColor: C.green, borderRadius: 22, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  rfqBtnText: { ...type.title, fontSize: 13, color: C.white },

  fabChat: { position: 'absolute', start: space.lg, bottom: space.xl, width: 52, height: 52, borderRadius: 26, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', shadowColor: '#0B3D2E', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabCart: { position: 'absolute', end: space.lg, bottom: space.xl, width: 58, height: 58, borderRadius: 29, backgroundColor: C.mango, alignItems: 'center', justifyContent: 'center', shadowColor: C.mango, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  fabBadge: { position: 'absolute', top: -3, end: -3, backgroundColor: C.error, borderRadius: 11, minWidth: 21, height: 21, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: C.white },
  fabBadgeText: { color: C.white, ...type.micro, fontSize: 10 },
});

/** Inline card-shadow so this file needn't thread `elevation` through styles. */
function elevationCard() {
  return { shadowColor: '#0F2819', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 };
}
