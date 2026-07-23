import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LOCALE_LABELS, LOCALES, type Lang } from '@agrotraders/i18n';
import { useAuth } from '../auth/AuthProvider';
import { useI18n } from '../i18n';
import { ROLE_MENU } from '../navigation/menu';
import type { RootStackParamList } from '../navigation/types';
import { Button, Chip, EmptyState } from '../ui';
import { C, radius, space, type } from '../theme/tokens';
import { microLabel } from '../theme/casing';
import { CurrencyChips, useCurrency } from '../currency/CurrencyContext';
import { useChatBadge } from '../chat/ChatBadgeContext';
import { forwardChevron } from '../lib/rtl';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** `labelKey` resolves against the `nav` namespace; `go` receives the translated title. */
const MARKETPLACE: {
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  go: (nav: Nav, title: string) => void;
}[] = [
  { labelKey: 'nav:directory.sellers', icon: 'storefront-outline', go: (n, title) => n.navigate('Directory', { type: 'sellers', title }) },
  { labelKey: 'nav:directory.transporters', icon: 'car-outline', go: (n, title) => n.navigate('Directory', { type: 'transporters', title }) },
  { labelKey: 'nav:directory.loaders', icon: 'people-outline', go: (n, title) => n.navigate('Directory', { type: 'loaders', title }) },
  { labelKey: 'nav:directory.workers', icon: 'person-outline', go: (n, title) => n.navigate('Directory', { type: 'workers', title }) },
  { labelKey: 'nav:stack.AuctionsBoard', icon: 'hammer-outline', go: (n) => n.navigate('AuctionsBoard') },
  { labelKey: 'nav:stack.BuyerBidsBoard', icon: 'pricetags-outline', go: (n) => n.navigate('BuyerBidsBoard') },
  { labelKey: 'nav:stack.Requirements', icon: 'clipboard-outline', go: (n) => n.navigate('Requirements') },
];

/* ── Menu building blocks ─────────────────────────────────────────── */

/** A white band of rows under an optional eyebrow label. */
function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={s.group}>
      {title ? <Text style={[s.groupTitle, microLabel()]}>{title}</Text> : null}
      <View style={s.groupBody}>{children}</View>
    </View>
  );
}

/** One tappable settings row: icon, label, optional badge, disclosure chevron. */
function MenuRow({ icon, label, onPress, badge, danger, last }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  danger?: boolean;
  last?: boolean;
}) {
  const tint = danger ? C.error : C.green;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowRule, pressed && { opacity: 0.6 }]}>
      <View style={[s.rowIcon, danger && { backgroundColor: '#F9E7E4' }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[s.rowLabel, danger && { color: C.error }]} numberOfLines={1}>{label}</Text>
      {badge ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      {!danger ? <Ionicons name={forwardChevron()} size={17} color={C.inkSoft} /> : null}
    </Pressable>
  );
}

/** Language picker, modelled on `CurrencyChips`. Shown to guests too. */
function LanguageGroup() {
  const { lang, setLang, t } = useI18n();
  const pick = async (next: Lang) => {
    const needsRestart = await setLang(next);
    if (needsRestart) Alert.alert(t('common:language'), t('hub.restartNotice'));
  };
  return (
    <Group title={`${t('common:language')} · ${LOCALE_LABELS[lang] ?? lang}`}>
      <View style={s.chipWrap}>
        {LOCALES.map((l) => (
          <Chip key={l} label={LOCALE_LABELS[l]} active={l === lang} onPress={() => void pick(l)} />
        ))}
      </View>
    </Group>
  );
}

export function MoreHub() {
  const nav = useNavigation<Nav>();
  const { user, role, roles, activeRole, setActiveRole, logout } = useAuth();
  const { t } = useI18n();
  const { currency } = useCurrency();
  const { unread, clear } = useChatBadge();
  const menu = role ? ROLE_MENU[role] ?? [] : [];

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
        <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }}>
          <View style={{ backgroundColor: C.white }}>
            <EmptyState icon="person-outline" title={t('guest.heading')} body={t('guest.body')} />
            <View style={s.guestActions}>
              <Button full title={t('common:signIn')} icon="log-in-outline" onPress={() => nav.navigate('SignIn', {})} />
              <Button full title={t('guest.createAccount')} variant="outline" onPress={() => nav.navigate('SignUp')} />
            </View>
          </View>
          {/* Guests must be able to pick a language before they ever sign in. */}
          <LanguageGroup />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // KycStatus enum is pending | verified | rejected — there is no 'approved'.
  const kycApproved = user.kycStatus === 'verified';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: space.sm, paddingBottom: space.xl }} showsVerticalScrollIndicator={false}>
        {/* evergreen identity header — avatar, name, role + KYC pills */}
        <LinearGradient colors={['#0B3D2E', '#146B3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.identity}>
          <Pressable onPress={() => nav.navigate('ProfileForm')} style={s.identityRow}>
            <View style={s.identityAvatar}>
              <Text style={s.identityInitials}>{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ gap: 2 }}>
                <Text style={s.identityName} numberOfLines={1}>{user.name}</Text>
                {role ? <Text style={s.identitySub} numberOfLines={1}>{t(`roleSub.${role}`)}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {role ? (
                  <View style={s.rolePill}><Text style={[s.rolePillText, microLabel()]}>{t(`enums:role.${role}`)}</Text></View>
                ) : null}
                <View style={s.kycPill}>
                  <Ionicons name={kycApproved ? 'checkmark' : 'time-outline'} size={12} color={C.white} />
                  <Text style={[s.kycPillText, microLabel()]}>{kycApproved ? t('hub.kycVerified') : user.kycStatus}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </LinearGradient>

        {roles.length > 1 && (
          <Group title={t('hub.activeDashboard')}>
            <View style={s.chipWrap}>
              {roles.map((r) => (
                <Chip key={r} label={t(`enums:role.${r}`)} active={r === activeRole} onPress={() => setActiveRole(r)} />
              ))}
            </View>
          </Group>
        )}

        <Group>
          <MenuRow icon="chatbubbles-outline" label={t('hub.community')} badge={unread} onPress={() => { clear(); nav.navigate('Community'); }} />
          <MenuRow icon="headset-outline" label={t('hub.support')} last onPress={() => { clear(); nav.navigate('Support'); }} />
        </Group>

        {/* marketplace directories & boards (all roles) */}
        <Group title={t('hub.marketplace')}>
          {MARKETPLACE.map((m, i) => (
            <MenuRow
              key={m.labelKey}
              icon={m.icon}
              label={t(m.labelKey)}
              last={i === MARKETPLACE.length - 1}
              onPress={() => m.go(nav, t(m.labelKey))}
            />
          ))}
        </Group>

        <Group title={t('hub.account')}>
          <MenuRow icon="briefcase-outline" label={t('hub.myHires')} onPress={() => nav.navigate('Hires')} />
          <MenuRow icon="id-card-outline" label={t('hub.myProfile')} onPress={() => nav.navigate('ProfileForm')} />
          <MenuRow icon="git-branch-outline" label={t('hub.rolesAccess')} last onPress={() => nav.navigate('RolesAccess')} />
        </Group>

        {/* role-specific sections */}
        {menu.length > 0 ? (
          <Group title={role ? t(`enums:role.${role}`) : undefined}>
            {menu.map((m, i) => (
              <MenuRow
                key={m.id}
                icon={m.icon}
                label={t(`nav:section.${m.id}`)}
                last={i === menu.length - 1}
                onPress={() => nav.navigate('Section', { role: role!, section: m.id, title: t(`nav:section.${m.id}`) })}
              />
            ))}
          </Group>
        ) : null}

        <Group title={`${t('hub.displayCurrency')} · ${currency}`}>
          <CurrencyChips />
        </Group>

        <LanguageGroup />

        <Group>
          <MenuRow icon="notifications-outline" label={t('hub.notifications')} onPress={() => nav.navigate('Notifications')} />
          <MenuRow icon="log-out-outline" label={t('hub.logOut')} danger last onPress={logout} />
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  identity: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  identityAvatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  identityInitials: { ...type.h2, color: C.white },
  identityName: { ...type.h1, fontSize: 24, color: C.white },
  identitySub: { ...type.body, color: '#9ED8B0' },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  rolePillText: { ...type.micro, fontSize: 10.5, color: C.white },
  kycPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.leaf, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  kycPillText: { ...type.micro, fontSize: 10.5, color: C.white },

  group: { backgroundColor: C.white, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, marginHorizontal: space.lg, paddingVertical: 2 },
  groupTitle: { ...type.micro, color: C.inkMuted, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 2 },
  groupBody: { paddingHorizontal: space.lg },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingVertical: space.sm },

  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: 10 },
  rowRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  rowLabel: { ...type.title, fontSize: 15, color: C.ink, flex: 1 },
  badge: {
    backgroundColor: C.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: C.white, ...type.micro, fontSize: 10 },

  guestActions: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm },
});
