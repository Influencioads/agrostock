import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiRoleRequest } from '@agrotraders/api-client';
import type { Tone } from '../lib/format';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { useI18n } from '../i18n';
import { Badge, Button, Card, EmptyState, Input, Row, Screen, SkeletonRows, Txt } from '../ui';

const REQUESTABLE = ['buyer', 'seller', 'transporter', 'loaderco', 'worker'];
const STATUS_TONE: Record<string, Tone> = { pending: 'warn', approved: 'green', rejected: 'error' };

function errMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
}

export function RolesAccess() {
  const { t } = useI18n();
  const { roles } = useAuth();
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery<ApiRoleRequest[]>({
    queryKey: ['my-role-requests'],
    queryFn: () => api.me.roleRequests(),
  });
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const request = useMutation({
    mutationFn: (role: string) => api.me.requestRole(role, note || undefined),
    onSuccess: () => {
      setNote('');
      setErr('');
      void qc.invalidateQueries({ queryKey: ['my-role-requests'] });
    },
    onError: (e) => setErr(errMessage(e, t('rolesAccess.submitError'))),
  });

  const pendingFor = (role: string) => requests.some((r) => r.role === role && r.status === 'pending');
  const available = REQUESTABLE.filter((r) => !roles.includes(r));

  return (
    <Screen>
      <Txt variant="h2">{t('rolesAccess.title')}</Txt>
      <Txt variant="muted">{t('rolesAccess.subtitle')}</Txt>

      <Card style={{ gap: 10 }}>
        <Txt variant="title">{t('rolesAccess.activeRoles')}</Txt>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {roles.map((r) => (
            <Badge key={r} label={t(`enums:role.${r}`)} tone="green" />
          ))}
        </Row>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt variant="title">{t('rolesAccess.requestAnother')}</Txt>
        <Txt variant="muted">{t('rolesAccess.approvalNote')}</Txt>
        {!!err && <Txt color="#C94343">{err}</Txt>}
        <Input
          label={t('rolesAccess.noteLabel')}
          placeholder={t('rolesAccess.notePh')}
          value={note}
          onChangeText={setNote}
        />
        {available.length === 0 ? (
          <Txt variant="muted">{t('rolesAccess.allHeld')}</Txt>
        ) : (
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {available.map((r) => (
              <Button
                key={r}
                title={pendingFor(r) ? t('rolesAccess.pending', { role: t(`enums:role.${r}`) }) : t('rolesAccess.request', { role: t(`enums:role.${r}`) })}
                variant="outline"
                size="sm"
                disabled={request.isPending || pendingFor(r)}
                onPress={() => request.mutate(r)}
              />
            ))}
          </Row>
        )}
      </Card>

      <Txt variant="title">{t('rolesAccess.history')}</Txt>
      {isLoading ? (
        <SkeletonRows />
      ) : requests.length === 0 ? (
        <EmptyState icon="documents-outline" title={t('rolesAccess.emptyTitle')} body={t('rolesAccess.emptyBody')} />
      ) : (
        requests.map((r) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Txt variant="title">{t(`enums:role.${r.role}`)}</Txt>
                <Txt variant="muted">{new Date(r.createdAt).toLocaleDateString()}</Txt>
              </View>
              <Badge label={t(`rolesAccess.status.${r.status}`, { defaultValue: r.status })} tone={STATUS_TONE[r.status] ?? 'slate'} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
