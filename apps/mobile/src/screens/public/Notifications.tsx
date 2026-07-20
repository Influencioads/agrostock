import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Icon per notification system so Community & Live Support read distinctly. */
function iconFor(n: AnyRec): keyof typeof Ionicons.glyphMap {
  if (n.system === 'community') return 'chatbubbles-outline';
  if (n.system === 'support') return 'headset-outline';
  if (String(n.type).includes('order')) return 'cube-outline';
  return 'notifications-outline';
}

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
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">{t('pubX.notif.title')}</Txt>
        <Row gap={4}>
          {items.length > 0 ? <Button title={t('pubX.notif.markAllRead')} size="sm" variant="ghost" onPress={readAll} /> : null}
          <Ionicons
            name="options-outline"
            size={22}
            color={C.ink}
            onPress={() => nav.navigate('NotificationSettings')}
          />
        </Row>
      </Row>
      {q.isLoading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState icon="notifications-outline" title={t('pubX.notif.caughtUp')} />
      ) : (
        items.map((n) => (
          <Card key={n.id} onPress={() => open(n)} style={n.readAt ? undefined : { borderColor: C.green }}>
            <Row gap={12}>
              <Ionicons name={iconFor(n)} size={22} color={C.green} />
              <View style={{ flex: 1 }}>
                <Txt variant="title">{n.title}</Txt>
                <Txt variant="muted">{n.body ? `${n.body} · ` : ''}{ago(n.createdAt, t('pubX.notif.now'))}</Txt>
              </View>
              {!n.readAt ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green }} /> : null}
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
