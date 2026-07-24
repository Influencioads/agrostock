import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, EmptyState, QueryError, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Icon + tint per notification kind, so shipments, escrow and alerts read apart. */
function styleFor(n: AnyRec): { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string } {
  const type_ = String(n.type ?? '');
  if (n.system === 'community') return { icon: 'chatbubbles-outline', bg: C.surface, fg: C.green };
  if (n.system === 'support') return { icon: 'headset-outline', bg: C.surface, fg: C.green };
  if (type_.includes('order') || type_.includes('ship')) return { icon: 'car-outline', bg: C.mangoSoft, fg: C.mango };
  if (type_.includes('escrow') || type_.includes('fund')) return { icon: 'shield-checkmark-outline', bg: C.page, fg: C.inkSoft };
  if (type_.includes('hold') || type_.includes('qc') || type_.includes('alert')) return { icon: 'warning-outline', bg: '#F9E7E4', fg: C.error };
  if (type_.includes('price')) return { icon: 'trending-up', bg: C.page, fg: C.inkSoft };
  return { icon: 'document-text-outline', bg: C.surface, fg: C.green };
}

/** Row card for one notification. */
function NotifCard({ n, timeLabel, onPress }: { n: AnyRec; timeLabel: string; onPress: () => void }) {
  const st = styleFor(n);
  const unread = !n.readAt;
  return (
    <Card onPress={onPress} style={unread ? { backgroundColor: C.surface, borderColor: C.leaf } : undefined}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={[st_.tile, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={19} color={st.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="title">{n.title}</Txt>
          {n.body ? <Txt variant="muted" style={{ marginTop: 2 }}>{n.body}</Txt> : null}
        </View>
        <Text style={st_.time}>{timeLabel}</Text>
      </Row>
    </Card>
  );
}

const st_ = StyleSheet.create({
  tile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  time: { ...type.caption, fontSize: 11, color: C.inkMuted },
  eyebrow: { ...type.micro, color: C.inkMuted, marginTop: 4 },
});

function ago(iso: string | undefined, nowLabel: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return nowLabel;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function Notifications() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications.list(), enabled: !!user });
  const items = (q.data as AnyRec[]) ?? [];

  const open = (n: AnyRec) => {
    if (!n.readAt) api.notifications.read(n.id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
    // F05: honor an explicit product link before the coarse system fallback.
    const product = typeof n.linkUrl === 'string' ? n.linkUrl.match(/^\/product\/([^/?#]+)/) : null;
    if (product) { nav.navigate('ProductDetail', { slug: product[1] }); return; }
    if (n.system === 'community') nav.navigate('Community');
    else if (n.system === 'support') nav.navigate('Support');
  };

  const readAll = () => api.notifications.readAll().then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));

  if (!user) {
    return (
      <Screen>
        <Txt variant="h2">{t('pubX.notif.title')}</Txt>
        <EmptyState icon="notifications-outline" title={t('pubX.notif.signIn')} />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* The stack header already titles this screen — repeating it here read as
          a double heading. Only the actions row remains, right-aligned. */}
      <Row style={{ justifyContent: 'flex-end' }} gap={4}>
        {items.length > 0 ? <Button title={t('pubX.notif.markAllRead')} size="sm" variant="ghost" onPress={readAll} /> : null}
        <Ionicons
          name="options-outline"
          size={22}
          color={C.ink}
          onPress={() => nav.navigate('NotificationSettings')}
        />
      </Row>
      {q.isLoading ? (
        <SkeletonRows />
      ) : q.isError ? (
        // MOB-01: a fetch failure is "we couldn't load", not "you're all caught up".
        <QueryError onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="notifications-outline" title={t('pubX.notif.caughtUp')} />
      ) : (
        (() => {
          const isToday = (iso?: string) => iso && new Date(iso).toDateString() === new Date().toDateString();
          const today = items.filter((n) => isToday(n.createdAt));
          const earlier = items.filter((n) => !isToday(n.createdAt));
          return (
            <>
              {today.length > 0 ? (
                <>
                  <Text style={[st_.eyebrow, microLabel()]}>{t('pubX.notif.today')}</Text>
                  {today.map((n) => <NotifCard key={n.id} n={n} timeLabel={ago(n.createdAt, t('pubX.notif.now'))} onPress={() => open(n)} />)}
                </>
              ) : null}
              {earlier.length > 0 ? (
                <>
                  <Text style={[st_.eyebrow, microLabel(), { marginTop: 8 }]}>{t('pubX.notif.earlier')}</Text>
                  {earlier.map((n) => <NotifCard key={n.id} n={n} timeLabel={ago(n.createdAt, t('pubX.notif.now'))} onPress={() => open(n)} />)}
                </>
              ) : null}
            </>
          );
        })()
      )}
    </Screen>
  );
}
