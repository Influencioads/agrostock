import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LOCALE_LABELS, LOCALES, type Lang } from '@agrotraders/i18n';
import { useAuth } from '../auth/AuthProvider';
import { useI18n } from '../i18n';
import { ROLE_MENU } from '../navigation/menu';
import type { RootStackParamList } from '../navigation/types';
import { Avatar, Button, Card, Chip, ListRow, Row, Screen, Txt } from '../ui';
import { C } from '../theme/tokens';
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

/** Language picker, modelled on `CurrencyChips`. Shown to guests too. */
function LanguageCard() {
  const { lang, setLang, t } = useI18n();
  const pick = async (next: Lang) => {
    const needsRestart = await setLang(next);
    if (needsRestart) Alert.alert(t('common:language'), t('hub.restartNotice'));
  };
  return (
    <Card style={{ gap: 10 }}>
      <Row gap={8}>
        <Ionicons name="globe-outline" size={18} color={C.dark} />
        <Txt variant="title">{t('common:language')}</Txt>
        <Txt variant="muted">· {LOCALE_LABELS[lang] ?? lang}</Txt>
      </Row>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {LOCALES.map((l) => (
          <Chip key={l} label={LOCALE_LABELS[l]} active={l === lang} onPress={() => void pick(l)} />
        ))}
      </Row>
    </Card>
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
      <Screen edges={['top']}>
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
          <Avatar name={t('guest.name')} size={56} />
          <Txt variant="h3">{t('guest.heading')}</Txt>
          <Txt variant="muted" style={{ textAlign: 'center' }}>{t('guest.body')}</Txt>
          <Button title={t('common:signIn')} icon="log-in-outline" onPress={() => nav.navigate('SignIn', {})} />
          <Button title={t('guest.createAccount')} variant="outline" onPress={() => nav.navigate('SignUp')} />
        </Card>
        {/* Guests must be able to pick a language before they ever sign in. */}
        <LanguageCard />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <Card>
        <Row gap={12}>
          <Avatar name={user.name} size={48} />
          <View style={{ flex: 1 }}>
            <Txt variant="title">{user.name}</Txt>
            <Txt variant="muted">{role ? t(`roleSub.${role}`) : ''}</Txt>
          </View>
        </Row>
      </Card>

      {roles.length > 1 && (
        <Card style={{ gap: 10 }}>
          <Txt variant="title">{t('hub.activeDashboard')}</Txt>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {roles.map((r) => (
              <Chip
                key={r}
                label={t(`enums:role.${r}`)}
                active={r === activeRole}
                onPress={() => setActiveRole(r)}
              />
            ))}
          </Row>
        </Card>
      )}

      <Card style={{ paddingVertical: 4 }}>
        <ListRow onPress={() => { clear(); nav.navigate('Community'); }}>
          <Row gap={12}>
            <Ionicons name="chatbubbles-outline" size={20} color={C.dark} />
            <Txt variant="body">{t('hub.community')}</Txt>
            {unread > 0 ? (
              <View style={{ backgroundColor: C.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                <Txt color={C.white} style={{ fontSize: 11, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Txt>
              </View>
            ) : null}
          </Row>
          <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
        </ListRow>
        <ListRow last onPress={() => { clear(); nav.navigate('Support'); }}>
          <Row gap={12}>
            <Ionicons name="headset-outline" size={20} color={C.dark} />
            <Txt variant="body">{t('hub.support')}</Txt>
          </Row>
          <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
        </ListRow>
      </Card>

      {/* marketplace directories & boards (all roles) */}
      <Card style={{ paddingVertical: 4 }}>
        {MARKETPLACE.map((m, i) => (
          <ListRow key={m.labelKey} last={i === MARKETPLACE.length - 1} onPress={() => m.go(nav, t(m.labelKey))}>
            <Row gap={12}>
              <Ionicons name={m.icon} size={20} color={C.dark} />
              <Txt variant="body">{t(m.labelKey)}</Txt>
            </Row>
            <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
          </ListRow>
        ))}
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <ListRow onPress={() => nav.navigate('Hires')}>
          <Row gap={12}>
            <Ionicons name="briefcase-outline" size={20} color={C.dark} />
            <Txt variant="body">{t('hub.myHires')}</Txt>
          </Row>
          <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
        </ListRow>
        <ListRow onPress={() => nav.navigate('ProfileForm')}>
          <Row gap={12}>
            <Ionicons name="id-card-outline" size={20} color={C.dark} />
            <Txt variant="body">{t('hub.myProfile')}</Txt>
          </Row>
          <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
        </ListRow>
        <ListRow last onPress={() => nav.navigate('RolesAccess')}>
          <Row gap={12}>
            <Ionicons name="git-branch-outline" size={20} color={C.dark} />
            <Txt variant="body">{t('hub.rolesAccess')}</Txt>
          </Row>
          <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
        </ListRow>
      </Card>

      {/* display currency */}
      <Card style={{ gap: 10 }}>
        <Row gap={8}>
          <Ionicons name="cash-outline" size={18} color={C.dark} />
          <Txt variant="title">{t('hub.displayCurrency')}</Txt>
          <Txt variant="muted">· {currency}</Txt>
        </Row>
        <CurrencyChips />
      </Card>

      {/* interface language */}
      <LanguageCard />

      <Card style={{ paddingVertical: 4 }}>
        {menu.map((m, i) => (
          <ListRow
            key={m.id}
            last={i === menu.length - 1}
            onPress={() => nav.navigate('Section', { role: role!, section: m.id, title: t(`nav:section.${m.id}`) })}
          >
            <Row gap={12}>
              <Ionicons name={m.icon} size={20} color={C.dark} />
              <Txt variant="body">{t(`nav:section.${m.id}`)}</Txt>
            </Row>
            <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
          </ListRow>
        ))}
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <ListRow onPress={() => nav.navigate('Notifications')}>
          <Row gap={12}><Ionicons name="notifications-outline" size={20} color={C.dark} /><Txt>{t('hub.notifications')}</Txt></Row>
          <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
        </ListRow>
        <ListRow last onPress={logout}>
          <Row gap={12}><Ionicons name="log-out-outline" size={20} color={C.error} /><Txt color={C.error}>{t('hub.logOut')}</Txt></Row>
        </ListRow>
      </Card>
    </Screen>
  );
}
