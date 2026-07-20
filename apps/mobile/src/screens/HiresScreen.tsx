import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiHireRequest } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, Row, Segmented, Txt } from '../ui';
import { C, space } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { useI18n } from '../i18n';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TONE: Record<string, 'green' | 'mango' | 'slate' | 'error'> = {
  pending: 'mango', accepted: 'green', declined: 'error', cancelled: 'slate',
};

function HireCard({ h, incoming, onAction }: { h: ApiHireRequest; incoming: boolean; onAction: () => void }) {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const other = incoming ? h.requester : h.targetUser;
  const detail = [h.cargo, h.fromCity && h.toCity ? `${h.fromCity} → ${h.toCity}` : null, h.location, h.workersNeeded ? t('compX.hires.workersCount', { count: h.workersNeeded }) : null]
    .filter(Boolean)
    .join(' · ');
  const act = async (fn: () => Promise<unknown>) => {
    await fn();
    onAction();
  };
  return (
    <Card style={{ gap: 8 }}>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <Txt variant="muted">{h.reference}</Txt>
        <Badge label={t('enums:hire_status.' + h.status)} tone={TONE[h.status] ?? 'slate'} />
        <Badge label={t('enums:hire_target.' + h.targetType)} tone="slate" />
        {!!h.order && <Badge label={t('compX.hires.orderRef', { ref: h.order.reference })} tone="info" />}
      </Row>
      <Txt variant="title">{incoming ? t('compX.hires.from', { name: other?.name ?? '—' }) : t('compX.hires.to', { name: other?.name ?? '—' })}</Txt>
      {(() => {
        // Enough to vet and contact the counterparty before accepting.
        const email = other?.email ?? other?.profile?.contactEmail;
        const phone = other?.profile?.phone ?? other?.profile?.whatsapp;
        const contact = [other?.country, email, phone].filter(Boolean).join(' · ');
        return contact ? <Txt variant="muted">{contact}{other?.kycStatus === 'verified' ? ` · ${t('compX.hires.kycVerified')}` : ''}</Txt> : null;
      })()}
      {detail ? <Txt variant="muted">{detail}</Txt> : null}
      {h.order?.product?.name ? <Txt variant="muted">{t('compX.hires.orderGoods', { name: h.order.product.name })}{h.order.amount ? ` · ${h.order.amount}` : ''}</Txt> : null}
      {h.message ? <Txt variant="muted">“{h.message}”</Txt> : null}
      {h.budgetCents != null ? <Txt variant="title" color={C.dark}>{t('compX.hires.budgetLabel')} ${(h.budgetCents / 100).toLocaleString()}</Txt> : null}
      <Row gap={8}>
        {other ? (
          <View style={{ flex: 1 }}>
            <Button title={t('compX.hires.message')} variant="outline" size="sm" icon="chatbubbles-outline" full onPress={() => nav.navigate('Community', { dmUserId: other.id, dmName: other.name })} />
          </View>
        ) : null}
        {incoming && h.status === 'pending' ? (
          <>
            <View style={{ flex: 1 }}><Button title={t('compX.hires.accept')} size="sm" icon="checkmark" full onPress={() => act(() => api.hires.accept(h.id))} /></View>
            <View style={{ flex: 1 }}><Button title={t('compX.hires.decline')} variant="outline" size="sm" full onPress={() => act(() => api.hires.decline(h.id))} /></View>
          </>
        ) : null}
        {!incoming && h.status === 'pending' ? (
          <View style={{ flex: 1 }}><Button title={t('compX.hires.cancel')} variant="outline" size="sm" full onPress={() => act(() => api.hires.cancel(h.id))} /></View>
        ) : null}
      </Row>
    </Card>
  );
}

/** Hire requests: incoming (providers accept/decline) + sent. */
type TargetFilter = 'all' | 'transporter' | 'loaderco' | 'worker';

export function HiresScreen() {
  const { t } = useI18n();
  const { roles } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<TargetFilter>('all');
  const isProvider = roles.some((r) => ['transporter', 'loaderco', 'worker'].includes(r));

  const incoming = useQuery({ queryKey: ['hires-incoming'], queryFn: () => api.hires.incoming(), enabled: isProvider });
  // The server filters `mine` by target type, so the key carries the filter.
  const sent = useQuery({
    queryKey: ['hires-sent', filter],
    queryFn: () => api.hires.mine(filter === 'all' ? undefined : { targetType: filter }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['hires-incoming'] });
    qc.invalidateQueries({ queryKey: ['hires-sent'] });
  };

  const sections: { title: string; data: ApiHireRequest[]; incoming: boolean }[] = [
    ...(isProvider ? [{ title: t('compX.hires.incomingTitle'), data: incoming.data ?? [], incoming: true }] : []),
    { title: t('compX.hires.sentTitle'), data: sent.data ?? [], incoming: false },
  ];

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      data={sections}
      keyExtractor={(s) => s.title}
      contentContainerStyle={{ padding: space.lg, gap: 12 }}
      renderItem={({ item: s }) => (
        <View style={{ gap: 10 }}>
          <Txt variant="label">{s.title}</Txt>
          {!s.incoming && (
            <Segmented
              options={[
                { id: 'all', label: t('compX.hires.filterAll') },
                { id: 'transporter', label: t('compX.hires.filterTransport') },
                { id: 'loaderco', label: t('compX.hires.filterLoaders') },
                { id: 'worker', label: t('compX.hires.filterWorkers') },
              ]}
              value={filter}
              onChange={(f) => setFilter(f as TargetFilter)}
            />
          )}
          {s.data.length === 0 ? (
            <EmptyState icon="briefcase-outline" title={s.incoming ? t('compX.hires.emptyIncoming') : t('compX.hires.emptySent')} />
          ) : (
            s.data.map((h) => <HireCard key={h.id} h={h} incoming={s.incoming} onAction={refresh} />)
          )}
        </View>
      )}
    />
  );
}
