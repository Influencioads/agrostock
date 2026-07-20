import { Switch } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';

type Channel = 'email' | 'push' | 'inApp';

/** Per-category email/push/in-app toggles, backed by /notifications/preferences. */
export function NotificationSettings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery<NotificationPreferences>({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => api.notifications.getPreferences(),
    enabled: !!user,
  });

  const toggle = (category: string, channel: Channel, value: boolean) => {
    // Optimistic update, then persist.
    qc.setQueryData<NotificationPreferences>(['notifications', 'preferences'], (prev) =>
      prev
        ? {
            ...prev,
            categories: {
              ...prev.categories,
              [category]: { ...prev.categories[category as keyof typeof prev.categories], [channel]: value },
            },
          }
        : prev,
    );
    api.notifications
      .updatePreferences({ categories: { [category]: { [channel]: value } } as never })
      .then((next) => qc.setQueryData(['notifications', 'preferences'], next))
      .catch(() => qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] }));
  };

  if (!user) {
    return (
      <Screen>
        <EmptyState icon="notifications-outline" title={t('pubX.notif.signIn')} />
      </Screen>
    );
  }
  if (q.isLoading || !q.data) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <Txt variant="muted" style={{ marginBottom: 12 }}>
        {t('pubX.notif.chooseHow')}
      </Txt>
      {Object.entries(q.data.categories).map(([key, c]) => (
        <Card key={key} style={{ marginBottom: 10 }}>
          <Txt variant="title">{c.label}</Txt>
          <ToggleRow
            label={t('pubX.notif.email')}
            disabled={!c.transactional}
            value={c.email}
            onChange={(v) => toggle(key, 'email', v)}
          />
          <ToggleRow label={t('pubX.notif.push')} value={c.push} onChange={(v) => toggle(key, 'push', v)} />
          <ToggleRow label={t('pubX.notif.inApp')} value={c.inApp} onChange={(v) => toggle(key, 'inApp', v)} />
        </Card>
      ))}
    </Screen>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 8, opacity: disabled ? 0.4 : 1 }}>
      <Txt>{label}</Txt>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: C.green, false: '#ccc' }}
      />
    </Row>
  );
}
