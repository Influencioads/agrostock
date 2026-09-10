import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiCategory, ApiHomeBanners, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { ProduceMark, SkeletonCard } from '../../ui';
import { ProductCard } from '../components';
import { ProductGrid } from '../components/ProductGrid';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth/AuthProvider';
import { useBasketAction } from '../../basket/useBasketAction';
import { DeliverToSheet, useDeliverTo } from '../../lib/deliverTo';
import { isShopRole } from '../../navigation/menu';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Fallback chip tints for categories the catalogue gave no tint of its own. */
const CAT_TINTS = ['#DDECD2', '#F6E7D3', '#F7E0D8', '#EFF0DC', '#DFF0E4', '#E9EFF4'];

/** Circular icon button used in the header (bell, basket, account). */
function CircleBtn({ icon, onPress, dot, badge, a11y }: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Unread marker with no count (notifications). */
  dot?: boolean;
  /** Count bubble (basket lines). Values over 99 render as "99+". */
  badge?: number;
  a11y?: string;
}) {
  return (
    <Pressable onPress={onPress} style={s.circleBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={a11y}>
      <Ionicons name={icon} size={21} color={C.ink} />
      {dot ? <View style={s.circleDot} /> : null}
      {badge ? (
        <View style={s.badge}><Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>
      ) : null}
    </Pressable>
  );
}

/**
 * A category as a self-sized chip — icon medallion plus the full name — so no
 * label is ever cut short, whatever the locale. One rail replaces the old
 * tab strip + tile rail pair.
 */
function CategoryChip({ cat, index, onPress }: { cat: ApiCategory; index: number; onPress: () => void }) {
  const tint = cat.tint ?? CAT_TINTS[index % CAT_TINTS.length];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
      <View style={[s.chipIcon, { backgroundColor: tint }]}>
        {cat.emoji ? <Text style={{ fontSize: 16 }}>{cat.emoji}</Text> : <ProduceMark size={22} tint={tint} />}
      </View>
      <Text style={s.chipLabel}>{cat.name}</Text>
    </Pressable>
  );
}

function SectionRow({ title, seeAll, onSeeAll }: { title: string; seeAll: string; onSeeAll: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Pressable onPress={onSeeAll} hitSlop={6}><Text style={s.seeAll}>{seeAll}</Text></Pressable>
    </View>
  );
}

export function Home() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user, role } = useAuth();
  const basketAction = useBasketAction();
  const { place } = useDeliverTo();
  const [picker, setPicker] = useState(false);

  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const { data: offers = [], isLoading: offersLoading } = useQuery<ApiProduct[]>({ queryKey: ['products', 'offer'], queryFn: () => api.products.list({ offer: true }) });
  const { data: allProducts = [], isLoading: allLoading } = useQuery<ApiProduct[]>({ queryKey: ['products', 'all'], queryFn: () => api.products.list({}) });
  const { data: promoted = [] } = useQuery<ApiProduct[]>({ queryKey: ['ads', 'promoted'], queryFn: () => api.ads.promoted(8) });
  // Banner copy + on/off switches, edited in Admin -> CMS. Absent (still
  // loading, or an API older than the endpoint) means "on, with the app's own
  // translated text", so the screen never blinks a banner in or out.
  const { data: banners } = useQuery<ApiHomeBanners>({ queryKey: ['home-banners'], queryFn: () => api.cms.homeBanners() });
  // The bell's dot is the real unread count, not a permanent decoration. The
  // key sits under `notifications`, which the Notifications screen invalidates
  // as items are read.
  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.notifications.unreadCount(),
    enabled: !!user,
    staleTime: 30e3,
  });
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
  // The ID, not `c.name`: category names arrive localized, and the API matches
  // the `category` filter against the English column — so a Russian chip
  // searched for "Овощи" and every result set came back empty.
  const toSearch = (categoryId?: string) => nav.navigate('Search', categoryId ? { categoryId } : undefined);
  // "See all" lands on the matching tab where the shop tabs exist; other
  // consoles have no Offers/Browse tab, so they get the search screen instead.
  const shop = isShopRole(role);
  const seeAllOffers = () => (shop ? nav.navigate('App', { screen: 'Offers' } as never) : toSearch());
  const seeAllProducts = () => (shop ? nav.navigate('App', { screen: 'Browse' } as never) : toSearch());
  // The hero is the entry point for the top paid placement; with no live ad it
  // falls back to search rather than dead-ending.
  const heroOpen = () => (promoted[0] ? open(promoted[0]) : toSearch());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      {/* Header — deliver-to, bell, basket, account, then the search pill. Owns
          the status-bar inset. */}
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <View style={s.headerRow}>
          <Pressable style={s.deliver} onPress={() => setPicker(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('pubX.home.deliverTo')}>
            <View style={s.deliverIcon}><Ionicons name="location-outline" size={18} color={C.green} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.deliverLabel}>{t('pubX.home.deliverTo')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text numberOfLines={1} style={[s.deliverCity, { flexShrink: 1 }]}>{place?.label ?? t('pubX.home.deliverToUnset')}</Text>
                <Ionicons name="chevron-down" size={15} color={C.ink} />
              </View>
            </View>
          </Pressable>
          <CircleBtn icon="notifications-outline" dot={(unread?.count ?? 0) > 0} onPress={() => nav.navigate('Notifications')} a11y={t('pubX.notif.title')} />
          <CircleBtn icon={basketAction.icon} badge={basketAction.badge} onPress={basketAction.onPress} a11y={basketAction.a11y} />
          {user ? (
            <Pressable onPress={openProfile} style={s.avatar} hitSlop={6} accessibilityRole="button" accessibilityLabel={user.name}>
              <Text style={s.avatarText}>{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</Text>
            </Pressable>
          ) : (
            <CircleBtn icon="person-outline" onPress={openProfile} a11y={t('auth.signIn.cta')} />
          )}
        </View>

        <Pressable style={s.search} onPress={() => nav.navigate('Search', undefined)} accessibilityRole="search">
          <Ionicons name="search" size={19} color={C.inkMuted} />
          <Text numberOfLines={1} style={s.searchHint}>{t('pubX.home.searchHint')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }} showsVerticalScrollIndicator={false}>
        {/* The one category selector. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRail}>
          {categories.map((c, i) => (
            <CategoryChip key={c.id} cat={c} index={i} onPress={() => toSearch(c.id)} />
          ))}
          <Pressable onPress={() => toSearch()} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
            <View style={[s.chipIcon, { backgroundColor: C.surface }]}><Ionicons name="grid-outline" size={16} color={C.green} /></View>
            <Text style={s.chipLabel}>{t('pubX.home.allCategories')}</Text>
          </Pressable>
        </ScrollView>

        {/* First-order promo — copy and visibility come from Admin -> CMS, with
            the bundled string as the fallback. */}
        {banners?.promoEnabled === false ? null : (
          <Pressable style={s.promo} onPress={() => toSearch()}>
            <View style={s.promoTag}><Ionicons name="pricetag-outline" size={17} color={C.gold} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.promoTitle}>{banners?.promoTitle || t('pubX.home.promoTitle')}</Text>
              <Text style={s.promoBody}>{banners?.promoBody || t('pubX.home.promoBody')}</Text>
            </View>
            <View style={s.promoDivider} />
            <Text numberOfLines={1} style={s.promoCta}>{banners?.promoCta || t('pubX.home.promoCta')}</Text>
          </Pressable>
        )}

        {/* Gradient hero — same admin controls as the promo strip. */}
        {banners?.heroEnabled === false ? null : (
          <Pressable onPress={heroOpen} style={s.heroWrap}>
            <LinearGradient colors={[C.evergreen, C.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={s.hero}>
              <View style={s.heroCircle} />
              <Text style={[s.heroTag, microLabel()]}>{banners?.heroTag || t('pubX.home.heroTag')}</Text>
              <Text numberOfLines={2} style={s.heroTitle}>{banners?.heroTitle || t('pubX.home.heroTitle')}</Text>
              <View style={s.heroBtn}><Text numberOfLines={1} style={s.heroBtnText}>{banners?.heroCta || t('pubX.home.heroCta')}</Text></View>
            </LinearGradient>
          </Pressable>
        )}

        {/* Safe-Deal escrow, which opens the escrow screen. */}
        <Pressable onPress={() => nav.navigate('SafeDeal')} style={s.safeWrap}>
          <LinearGradient colors={[C.evergreen, C.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.safe}>
            <View style={s.safeIcon}><Ionicons name="shield-checkmark" size={20} color={C.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.safeTitle}>{t('pubX.home.safeDealTitle')}</Text>
              <Text style={s.safeBody}>{t('pubX.home.safeDealBody')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.mint} />
          </LinearGradient>
        </Pressable>

        {/* Offers rail — hidden entirely when there are none. */}
        {offersLoading || offers.length > 0 ? (
          <>
            <SectionRow title={t('nav:tab.Offers')} seeAll={t('pubX.home.seeAll')} onSeeAll={seeAllOffers} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
              {offersLoading
                ? [0, 1, 2].map((i) => <SkeletonCard key={i} width={156} />)
                : offers.map((p) => <ProductCard key={p.id} product={p} width={156} onPress={() => open(p)} />)}
            </ScrollView>
          </>
        ) : null}

        {/* Fresh arrivals — the same grid every listing screen uses. */}
        <SectionRow title={t('pubX.home.freshArrivals')} seeAll={t('pubX.home.seeAll')} onSeeAll={seeAllProducts} />
        <ProductGrid products={featured.slice(0, 8)} loading={allLoading} onOpen={open} sponsoredIds={promotedIds} />

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

      <DeliverToSheet visible={picker} onClose={() => setPicker(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.page, paddingBottom: space.md, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.lg },
  deliver: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  deliverIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  deliverLabel: { ...type.caption, color: C.inkSoft },
  deliverCity: { ...type.h3, fontSize: 15, color: C.ink },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  circleDot: { position: 'absolute', top: 9, end: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.mango, borderWidth: 1.5, borderColor: C.white },
  badge: { position: 'absolute', top: -4, end: -4, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 5, backgroundColor: C.error, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.page },
  badgeText: { color: C.white, ...type.micro, fontSize: 12, lineHeight: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...type.title, fontSize: 14, color: C.white },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: space.lg, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: 25, height: 48, paddingHorizontal: 16 },
  searchHint: { flex: 1, ...type.body, fontSize: 15, color: C.inkSoft },

  chipRail: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.lg },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingStart: 6, paddingEnd: 14, borderRadius: radius.pill, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  chipIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { ...type.title, color: C.ink },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.md },
  sectionTitle: { ...type.h2, color: C.ink },
  seeAll: { ...type.title, color: C.green },
  rail: { gap: space.md, paddingHorizontal: space.lg },

  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: space.lg, marginBottom: space.lg, backgroundColor: C.mangoSoft, borderWidth: 1, borderColor: '#E7C88A', borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 16 },
  promoTag: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FBE7C2', alignItems: 'center', justifyContent: 'center' },
  promoTitle: { ...type.title, fontSize: 14, color: '#7A5A12' },
  promoBody: { ...type.caption, color: '#9A7A32', marginTop: 1 },
  promoDivider: { width: 1, height: 34, backgroundColor: '#E7C88A' },
  promoCta: { ...type.micro, fontSize: 12, color: C.gold, letterSpacing: 0.4 },

  heroWrap: { marginHorizontal: space.lg, marginBottom: space.lg, borderRadius: radius.card, overflow: 'hidden' },
  hero: { padding: 22, minHeight: 190, justifyContent: 'center' },
  heroCircle: { position: 'absolute', right: -40, top: -20, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTag: { ...type.micro, fontSize: 11, color: '#9ED8B0' },
  heroTitle: { ...type.h1, fontSize: 26, color: C.white, marginTop: 8, maxWidth: '80%' },
  heroBtn: { alignSelf: 'flex-start', marginTop: 18, backgroundColor: C.white, borderRadius: 22, paddingHorizontal: 20, height: 44, justifyContent: 'center' },
  heroBtnText: { ...type.title, fontSize: 14, color: C.evergreen },

  safeWrap: { marginHorizontal: space.lg, borderRadius: radius.card, overflow: 'hidden' },
  safe: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  safeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  safeTitle: { ...type.h3, fontSize: 15, color: C.white },
  safeBody: { ...type.caption, color: C.mint, marginTop: 1 },

  rfq: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: space.lg, marginTop: space.xl, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: radius.card, padding: 16 },
  rfqIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  rfqTitle: { ...type.h3, fontSize: 15, color: C.ink },
  rfqBody: { ...type.caption, color: C.inkSoft, marginTop: 2 },
  rfqBtn: { backgroundColor: C.green, borderRadius: 22, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  rfqBtnText: { ...type.title, fontSize: 13, color: C.white },
});
