import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiCategory, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { C, radius, space } from '../../theme/tokens';
import { Card, Row, SectionHeader, Txt } from '../../ui';
import { ProductCard } from '../components';
import { useI18n } from '../../i18n';
import { useChatBadge } from '../../chat/ChatBadgeContext';
import type { RootStackParamList } from '../../navigation/types';
import { HOME_QUICK_LINKS, HOME_SERVICE_LINKS, type HomeLink } from './homeLinks';
import { BrandLogo } from '../../ui/BrandLogo';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function navigateHomeTarget(nav: Nav, link: HomeLink, t: (key: string) => string) {
  switch (link.route) {
    case 'Search':
      nav.navigate('Search', undefined);
      break;
    case 'Directory':
      nav.navigate('Directory', { type: link.dirType, title: t(link.titleKey) });
      break;
    case 'AuctionsBoard':
      nav.navigate('AuctionsBoard');
      break;
    case 'BuyerBidsBoard':
      nav.navigate('BuyerBidsBoard');
      break;
    case 'SafeDeal':
      nav.navigate('SafeDeal');
      break;
    case 'Offices':
      nav.navigate('Offices');
      break;
  }
}

/** Hero quick-access pills — every marketplace surface one tap away (mirrors web). */
export function Home() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { unread, clear } = useChatBadge();
  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const { data: offers = [] } = useQuery<ApiProduct[]>({ queryKey: ['products', 'offer'], queryFn: () => api.products.list({ offer: true }) });
  const { data: auctions = [] } = useQuery<ApiProduct[]>({ queryKey: ['auctions'], queryFn: () => api.auctions.list() as Promise<ApiProduct[]> });
  const { data: allProducts = [] } = useQuery<ApiProduct[]>({ queryKey: ['products', 'all'], queryFn: () => api.products.list({}) });
  // Products behind an approved, unpaused ad campaign lead the rail (no label, by design).
  const { data: promoted = [] } = useQuery<ApiProduct[]>({ queryKey: ['ads', 'promoted'], queryFn: () => api.ads.promoted(8) });
  const featured = useMemo(() => {
    const seen = new Set(promoted.map((p) => p.id));
    return [...promoted, ...allProducts.filter((p) => !seen.has(p.id))];
  }, [promoted, allProducts]);

  const open = (p: ApiProduct) => nav.navigate('ProductDetail', { slug: p.slug });

  // No 'top' edge on the SafeAreaView: the branded green header owns the status-bar
  // area itself (paddingTop: inset) so it reads as an immersive app header behind the
  // status bar, rather than leaving a plain band above it.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={[]}>
      {/* branded header — extends under the status bar */}
      <View style={{ backgroundColor: C.evergreen, paddingHorizontal: space.lg, paddingTop: insets.top + 6, paddingBottom: 14, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <BrandLogo size={32} inverse />
          <Row gap={14}>
            <Pressable onPress={() => nav.navigate('Notifications')}><Ionicons name="notifications-outline" size={22} color={C.white} /></Pressable>
            <Pressable onPress={() => nav.navigate('Cart')}><Ionicons name="cart-outline" size={22} color={C.white} /></Pressable>
          </Row>
        </Row>
        <Pressable onPress={() => nav.navigate('Search')} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: radius.pill, paddingHorizontal: 14, height: 44 }}>
          <Ionicons name="search" size={18} color={C.inkSoft} />
          <Text style={{ color: C.inkSoft }}>{t('pubX.home.searchHint')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* quick access — Buy · Sellers · Auctions · Bids · Transporters · Loaders · Workers */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {HOME_QUICK_LINKS.map((q) => (
            <Pressable
              key={q.labelKey}
              onPress={() => navigateHomeTarget(nav, q, t)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: radius.pill, paddingHorizontal: 14, height: 36 }}
            >
              <Ionicons name={q.icon} size={15} color={C.mangoDeep} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.ink }}>{t(q.labelKey)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {categories.map((c) => (
            <Pressable key={c.id} onPress={() => nav.navigate('Search', { category: c.slug, title: c.name })} style={{ alignItems: 'center', width: 72, gap: 6 }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 26 }}>{c.emoji ?? '🌾'}</Text>
              </View>
              <Text numberOfLines={1} style={{ fontSize: 11, color: C.ink }}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* services */}
        <Row gap={10}>
          {HOME_SERVICE_LINKS.map((sv) => (
            <Pressable key={sv.labelKey} onPress={() => navigateHomeTarget(nav, sv, t)} style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: C.white, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, paddingVertical: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: sv.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={sv.icon} size={20} color={C.dark} />
              </View>
              <Text style={{ fontSize: 11, color: C.ink, fontWeight: '600' }}>{t(sv.labelKey)}</Text>
            </Pressable>
          ))}
        </Row>

        {/* offers */}
        <View style={{ gap: 12 }}>
          <SectionHeader title={t('pubX.home.offersOfDay')} action={t('pubX.home.seeAll')} onAction={() => nav.navigate('Search')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {offers.map((p) => <ProductCard key={p.id} product={p} width={150} onPress={() => open(p)} />)}
            {offers.length === 0 ? <Txt variant="muted">{t('pubX.home.noOffers')}</Txt> : null}
          </ScrollView>
        </View>

        {/* auctions */}
        {auctions.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title={t('pubX.home.liveAuctions')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {auctions.map((p) => <ProductCard key={p.id} product={p} width={150} onPress={() => open(p)} />)}
            </ScrollView>
          </View>
        ) : null}

        {/* safe deal banner */}
        <Card onPress={() => nav.navigate('SafeDeal')} style={{ backgroundColor: C.evergreen, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="shield-checkmark" size={28} color={C.mango} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 15 }}>{t('pubX.home.safeDealTitle')}</Text>
            <Text style={{ color: C.mint, fontSize: 12, marginTop: 2 }}>{t('pubX.home.safeDealBody')}</Text>
          </View>
        </Card>

        {/* featured grid */}
        <View style={{ gap: 12 }}>
          <SectionHeader title={t('pubX.home.featured')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {featured.map((p) => (
              <View key={p.id} style={{ width: '47.5%' }}><ProductCard product={p} onPress={() => open(p)} /></View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating AgroTraders Community button (bottom-left, mirrors web). */}
      <Pressable
        onPress={() => {
          clear();
          nav.navigate('Community');
        }}
        style={{
          position: 'absolute',
          left: space.lg,
          bottom: space.xl,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.green,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#0B3D2E',
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
        accessibilityLabel={t('pubX.home.communityA11y')}
      >
        <Ionicons name="chatbubbles" size={26} color={C.white} />
        {unread > 0 ? (
          <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: C.error, borderRadius: 11, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: C.white }}>
            <Text style={{ color: C.white, fontSize: 11, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>
    </SafeAreaView>
  );
}
