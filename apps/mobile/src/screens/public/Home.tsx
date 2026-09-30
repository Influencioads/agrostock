import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiBillingOverview, ApiCategory, ApiHomeBanners, ApiProduct } from '@agrotraders/api-client';
import { countryLabel } from '@agrotraders/geo';
import { api } from '../../lib/api';
import { IAP_AVAILABLE } from '../../lib/iap';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { ProduceMark, SkeletonCard } from '../../ui';
import { BrandLogo } from '../../ui/BrandLogo';
import { ProductCard } from '../components';
import { ProductGrid } from '../components/ProductGrid';
import { FilterSheet, SortSheet } from '../components/FilterSheet';
import { useFabClearance } from '../../ui/fab';
import { EMPTY_FILTERS, SORTS, countActive, toggleValue, type Filters } from '../components/filterState';
import { EMPTY_SELECTION, categoryOnly } from '../components/categorySelection';
import { IAP_HIDDEN_LADDERS } from '../components/planLadder';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth/AuthProvider';
import { useBasketAction } from '../../basket/useBasketAction';
import { useChatBadge } from '../../chat/ChatBadgeContext';
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

/**
 * The web hero's search card, for the app: Buy/Sell, a query, the full
 * category drill and every filter the listing page has, plus quick filters.
 * Every chip is a real API filter — the web's "100 MT" and "Export-ready"
 * chips are free-text searches that match nothing, so they are not copied here.
 *
 * The query it composes lives in Home, which also opens the same filter sheet
 * from the category chips below the hero; this only reports what was tapped.
 */
function HeroSearch({ categories, q, onQ, draft, onDraft, sort, onSort, onSearch, onOpen }: {
  categories: ApiCategory[];
  q: string;
  onQ: (q: string) => void;
  draft: Filters;
  /** The quick chips toggle their filter on the draft, as web's quick picks do. */
  onDraft: (next: Filters) => void;
  sort: string;
  onSort: () => void;
  onSearch: () => void;
  /** Open the filter sheet — straight onto the category drill for `category`. */
  onOpen: (sheet: 'category' | 'filters') => void;
}) {
  const nav = useNavigation<Nav>();
  const { t, lang } = useI18n();
  const { user, role } = useAuth();

  // Web's Sell tab: sellers go straight to a new listing; everyone else needs a
  // seller account first.
  const sell = () => {
    if (role === 'seller') nav.navigate('Section', { role: 'seller', section: 'add', title: t('dash.addProduct') });
    else if (user) nav.navigate('RolesAccess');
    else nav.navigate('SignUp');
  };
  // Structured filters, not search words: "Russia" as text only matches a
  // listing that spells it out, and the Russian word matched nothing at all.
  // They toggle on the draft rather than navigate, so they compose with the
  // query, category and filters, and a second tap takes one back off.
  const grain = categories.find((c) => c.slug === 'grain');
  const grainOn = !!grain && draft.selection.categoryId === grain.id;
  const verifiedOn = !!draft.flags.verified;
  const chips: { label: string; active: boolean; next: Filters }[] = [
    ...(grain
      ? [{ label: grain.name, active: grainOn, next: { ...draft, selection: grainOn ? EMPTY_SELECTION : categoryOnly(grain), attrs: {} } }]
      : []),
    { label: countryLabel('Russia', lang), active: draft.country.includes('Russia'), next: toggleValue(draft, 'country', 'Russia') },
    { label: t('pubX.home.chipVerified'), active: verifiedOn, next: { ...draft, flags: { ...draft.flags, verified: !verifiedOn } } },
  ];
  const picked = draft.selection.trail[draft.selection.trail.length - 1];
  const active = countActive(draft);

  return (
    <View style={s.card}>
      <View style={s.seg}>
        <View style={[s.segBtn, s.segOn]}><Text style={[s.segText, { color: C.white }]}>{t('pubX.home.link.buy')}</Text></View>
        <Pressable style={s.segBtn} onPress={sell} accessibilityRole="button">
          <Text style={s.segText}>{t('pubX.home.sell')}</Text>
        </Pressable>
      </View>
      <View style={s.input}>
        <Ionicons name="search" size={18} color={C.inkMuted} />
        <TextInput
          value={q}
          onChangeText={onQ}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          placeholder={t('pubX.home.heroSearchHint')}
          placeholderTextColor={C.inkMuted}
          style={s.inputText}
        />
      </View>
      <View style={s.cardRow}>
        <Pressable style={s.select} onPress={() => onOpen('category')} accessibilityRole="button">
          <Ionicons name="grid-outline" size={16} color={picked ? C.green : C.inkSoft} />
          <Text numberOfLines={1} style={s.selectText}>{picked ?? t('pubX.home.heroCategories')}</Text>
          <Ionicons name="chevron-down" size={15} color={C.inkSoft} />
        </Pressable>
        <Pressable style={s.searchBtn} onPress={onSearch} accessibilityRole="button">
          <Text numberOfLines={1} style={s.searchBtnText}>{t('common:search')}</Text>
        </Pressable>
      </View>
      <View style={s.heroChips}>
        {/* The whole filter panel, one tap from the hero. It leads the chips so
            it reads as the way to narrow further, not as another shortcut. */}
        <Pressable onPress={() => onOpen('filters')} style={[s.heroChip, s.filterChip]} accessibilityRole="button">
          <Ionicons name="options-outline" size={15} color={C.green} />
          <Text style={[s.heroChipText, { color: C.green }]}>{t('pubX.plp.filters')}</Text>
          {active ? <View style={s.filterCount}><Text style={s.filterCountText}>{active}</Text></View> : null}
        </Pressable>
        <Pressable onPress={onSort} style={[s.heroChip, s.filterChip]} accessibilityRole="button">
          <Ionicons name="swap-vertical" size={15} color={C.green} />
          <Text style={[s.heroChipText, { color: C.green }]}>
            {sort === 'relevance' ? t('pubX.plp.sort') : t('pubX.browse.sort.' + sort)}
          </Text>
        </Pressable>
        {chips.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => onDraft(c.next)}
            style={[s.heroChip, c.active && s.heroChipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: c.active }}
          >
            <Text style={[s.heroChipText, c.active && { color: C.white }]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Free-plan marker: a lock and an upgrade CTA into Plan & billing, shown until
 * the active role is on a paid plan. On iOS the plan is bought in-app through
 * the App Store, so the banner shows there too — except for a role whose own
 * ladder iOS does not sell (IAP_HIDDEN_LADDERS), which has nothing to buy.
 */
function FreePlanBanner() {
  const nav = useNavigation<Nav>();
  const { t } = useI18n();
  const { user, role } = useAuth();
  // Same key as BillingScreen, so a finished checkout clears the banner too.
  const { data } = useQuery<ApiBillingOverview>({
    queryKey: ['billing-overview'],
    queryFn: () => api.billing.overview(),
    enabled: !!user,
  });
  // Hidden until the overview loads: never flash an upsell at a paying account.
  if (!user || !role || !data || (data.entitlements[role]?.tier ?? 0) > 0) return null;
  if (IAP_AVAILABLE && IAP_HIDDEN_LADDERS.includes(role)) return null;
  return (
    <Pressable
      style={({ pressed }) => [s.plan, pressed && { opacity: 0.8 }]}
      onPress={() => nav.navigate('Section', { role, section: 'billing', title: t('nav:section.billing') })}
      accessibilityRole="button"
    >
      <View style={s.planIcon}><Ionicons name="lock-closed" size={18} color={C.gold} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.planTitle}>{t('billing.freeBannerTitle')}</Text>
        <Text style={s.planBody}>{t('billing.freeBannerBody')}</Text>
      </View>
      <View style={s.planBtn}><Text numberOfLines={1} style={s.planBtnText}>{t('billing.upgradeNow')}</Text></View>
    </Pressable>
  );
}

export function Home() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const fabClearance = useFabClearance();
  const { t } = useI18n();
  const { user, role } = useAuth();
  const basketAction = useBasketAction();
  const { unread: chatUnread, clear: clearChat } = useChatBadge();
  // The hero's composed query. It lives here, not in the hero, because the
  // category chips below open the same sheet, and it survives a trip to the
  // results and back because Home stays mounted under the pushed screen.
  const [heroQ, setHeroQ] = useState('');
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [sheet, setSheet] = useState<'category' | 'filters' | null>(null);
  const [sort, setSort] = useState('relevance');
  const [sortSheet, setSortSheet] = useState(false);

  const { data: categories = [], isError: catsError, refetch: refetchCats } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
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
  const toSearch = () => nav.navigate('Search');
  const showProducts = (filters: Filters) => nav.navigate('Products', { filters, q: heroQ.trim() || undefined, sort });
  // A category chip asks the next question instead of landing on a flat
  // category-wide list: the picker opens inside it (Almond, Cashew...), and the
  // node picked there leads on to its attributes (raw or roasted...).
  const pickIn = (c: ApiCategory) => {
    setDraft((d) => ({ ...d, selection: categoryOnly(c), attrs: {} }));
    setSheet('category');
  };
  // "See all" lands on the matching tab where the shop tabs exist; other
  // consoles have no Offers/Browse tab, so they get the Products route instead.
  const shop = isShopRole(role);
  const seeAllOffers = () =>
    shop ? nav.navigate('App', { screen: 'Offers' } as never) : nav.navigate('Products', { filters: { ...EMPTY_FILTERS, flags: { offer: true } } });
  const seeAllProducts = () => (shop ? nav.navigate('App', { screen: 'Browse' } as never) : nav.navigate('Products'));
  // The hero is the entry point for the top paid placement; with no live ad it
  // falls back to search rather than dead-ending.
  const heroOpen = () => (promoted[0] ? open(promoted[0]) : toSearch());
  const heroOff = banners?.heroEnabled === false;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      {/* Header — logo, chat, bell, basket, account (plus the search pill when the
          hero is off). Owns the status-bar inset. */}
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <View style={s.headerRow}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}><BrandLogo size={30} /></View>
          {/* Chat sits on the home bar again, not only under Account. */}
          <CircleBtn icon="chatbubbles-outline" badge={chatUnread} onPress={() => { clearChat(); nav.navigate('Community'); }} a11y={t('hub.community')} />
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

        {/* The hero carries the search; the pill only stands in when an admin
            has switched the hero off. */}
        {heroOff ? (
          <Pressable style={s.search} onPress={() => nav.navigate('Search', { focus: true })} accessibilityRole="search">
            <Ionicons name="search" size={19} color={C.inkMuted} />
            <Text numberOfLines={1} style={s.searchHint}>{t('pubX.home.searchHint')}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: fabClearance }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FreePlanBanner />

        {/* Hero — the web's headline and search card. On/off, eyebrow, title and
            CTA are Admin -> CMS overrides; the wholesale-only badge is not. */}
        {heroOff ? null : (
          <View style={s.heroWrap}>
            <LinearGradient colors={[C.evergreen, C.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={s.hero}>
              <View style={s.heroCircle} />
              {banners?.heroTag ? <Text style={[s.heroTag, microLabel()]}>{banners.heroTag}</Text> : null}
              <View style={s.wholesale}>
                <Ionicons name="cube-outline" size={14} color={C.mango} />
                <Text style={s.wholesaleText}>{t('pubX.home.wholesaleOnly')}</Text>
              </View>
              <Text style={s.heroTitle}>
                {banners?.heroTitle || (
                  <>
                    {t('pubX.home.heroTitle')} <Text style={{ color: C.mango }}>{t('pubX.home.heroTitleAccent')}</Text>
                  </>
                )}
              </Text>
              <HeroSearch
                categories={categories}
                q={heroQ}
                onQ={setHeroQ}
                draft={draft}
                onDraft={setDraft}
                sort={sort}
                onSort={() => setSortSheet(true)}
                onSearch={() => showProducts(draft)}
                onOpen={setSheet}
              />
              {banners?.heroCta ? (
                <Pressable onPress={heroOpen} style={s.heroBtn}>
                  <Text numberOfLines={1} style={s.heroBtnText}>{banners.heroCta}</Text>
                </Pressable>
              ) : null}
            </LinearGradient>
          </View>
        )}

        {/* The one category selector. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRail}>
          {categories.map((c, i) => (
            <CategoryChip key={c.id} cat={c} index={i} onPress={() => pickIn(c)} />
          ))}
          <Pressable onPress={() => nav.navigate('Products')} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
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

        {/* Order escrow is disabled at the server (legacy-finance.guard), so the
            "funds held until you confirm delivery" card promised a protection
            that does not operate. Restore it when order escrow actually ships. */}

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

      <FilterSheet
        visible={sheet !== null}
        pickCategory={sheet === 'category'}
        // Closing keeps the draft: nothing is committed until Search anyway,
        // and a category picked then dismissed should still read in the hero.
        onClose={(d) => {
          setDraft(d);
          setSheet(null);
        }}
        applied={draft}
        onApply={showProducts}
        categories={categories}
        categoriesError={catsError}
        onRetryCategories={() => void refetchCats()}
        search={heroQ}
      />
      <SortSheet
        visible={sortSheet}
        onClose={() => setSortSheet(false)}
        options={SORTS.map((sv) => ({ id: sv, label: t('pubX.browse.sort.' + sv) }))}
        value={sort}
        onChange={setSort}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.page, paddingBottom: space.md, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.lg },
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

  heroWrap: { marginHorizontal: space.lg, marginTop: space.lg, borderRadius: radius.card, overflow: 'hidden' },
  hero: { padding: 20 },
  heroCircle: { position: 'absolute', right: -40, top: -20, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTag: { ...type.micro, fontSize: 11, color: '#9ED8B0' },
  heroTitle: { ...type.h1, fontSize: 26, lineHeight: 31, color: C.white, marginTop: 12 },
  wholesale: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, backgroundColor: 'rgba(232,154,43,0.16)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  wholesaleText: { ...type.title, fontSize: 12, lineHeight: 16, color: C.mango, flexShrink: 1 },

  card: { marginTop: 18, backgroundColor: C.white, borderRadius: radius.card, padding: 12, gap: 10 },
  seg: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, padding: 4 },
  segBtn: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.green },
  segText: { ...type.title, color: C.inkSoft },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 },
  inputText: { flex: 1, ...type.body, color: C.ink, paddingVertical: 0 },
  cardRow: { flexDirection: 'row', gap: 8 },
  select: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 },
  selectText: { flex: 1, ...type.title, color: C.ink },
  searchBtn: { height: 46, borderRadius: 12, backgroundColor: C.green, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { ...type.title, color: C.white },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroChip: { backgroundColor: C.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  heroChipOn: { backgroundColor: C.green },
  heroChipText: { ...type.title, fontSize: 13, color: C.inkSoft },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.white, borderWidth: 1, borderColor: C.green },
  filterCount: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { ...type.micro, fontSize: 12, lineHeight: 14, color: C.white },
  heroBtn: { alignSelf: 'flex-start', marginTop: 14, backgroundColor: C.white, borderRadius: 22, paddingHorizontal: 20, height: 44, justifyContent: 'center' },
  heroBtnText: { ...type.title, fontSize: 14, color: C.evergreen },

  safeWrap: { marginHorizontal: space.lg, borderRadius: radius.card, overflow: 'hidden' },
  safe: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  safeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  safeTitle: { ...type.h3, fontSize: 15, color: C.white },
  safeBody: { ...type.caption, color: C.mint, marginTop: 1 },

  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: space.lg, marginTop: space.lg, backgroundColor: C.mangoSoft, borderWidth: 1, borderColor: '#E7C88A', borderRadius: radius.card, paddingVertical: 12, paddingHorizontal: 14 },
  planIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FBE7C2', alignItems: 'center', justifyContent: 'center' },
  planTitle: { ...type.title, fontSize: 14, color: '#7A5A12' },
  planBody: { ...type.caption, color: '#9A7A32', marginTop: 1 },
  planBtn: { backgroundColor: C.mango, borderRadius: 20, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  planBtnText: { ...type.title, fontSize: 13, color: C.white },

  rfq: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: space.lg, marginTop: space.xl, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: radius.card, padding: 16 },
  rfqIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  rfqTitle: { ...type.h3, fontSize: 15, color: C.ink },
  rfqBody: { ...type.caption, color: C.inkSoft, marginTop: 2 },
  rfqBtn: { backgroundColor: C.green, borderRadius: 22, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  rfqBtnText: { ...type.title, fontSize: 13, color: C.white },
});
