import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { errMessage, type Tone } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, Input, Loading, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';

interface Req {
  id: string; reference: string; fromCity: string; toCity: string; cargo: string; weightMt?: string | null;
  status: string; quotes?: unknown[]; trip?: { reference: string } | null;
}
const reqTone: Record<string, Tone> = { open: 'info', quoted: 'warn', assigned: 'green', completed: 'slate', cancelled: 'error' };

/** Loads this transporter posted for others to quote on, plus a create form. */
export function TransporterMyRequests() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({ fromCity: '', toCity: '', cargo: '', weightMt: '' });
  const [error, setError] = useState('');
  const { data: requests = [], isLoading } = useQuery<Req[]>({ queryKey: ['requests', 'mine'], queryFn: () => api.transport.myRequests() as Promise<Req[]>, enabled: !!user });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const create = useMutation({
    mutationFn: () => api.transport.createRequest({ fromCity: form.fromCity, toCity: form.toCity, cargo: form.cargo, weightMt: form.weightMt || undefined }),
    onSuccess: () => { setForm({ fromCity: '', toCity: '', cargo: '', weightMt: '' }); setError(''); qc.invalidateQueries({ queryKey: ['requests', 'mine'] }); },
    onError: (e) => setError(errMessage(e, t('transX.myRequests.createError'))),
  });
  const ready = form.fromCity.trim() && form.toCity.trim() && form.cargo.trim();

  return (
    <Screen>
      <Txt variant="h2">{t('transX.myRequests.title')}</Txt>
      <Txt variant="muted">{t('transX.myRequests.subtitle')}</Txt>

      <Card style={{ gap: 10 }}>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Input label={t('transX.myRequests.from')} placeholder={t('pubX.ph.cityMundra')} value={form.fromCity} onChangeText={set('fromCity')} /></View>
          <View style={{ flex: 1 }}><Input label={t('transX.myRequests.to')} placeholder={t('pubX.ph.cityDubai')} value={form.toCity} onChangeText={set('toCity')} /></View>
        </Row>
        <Input label={t('transX.myRequests.cargo')} placeholder={t('pubX.ph.cargoBasmati')} value={form.cargo} onChangeText={set('cargo')} />
        <Input label={t('transX.myRequests.weight')} placeholder="24" keyboardType="numeric" value={form.weightMt} onChangeText={set('weightMt')} />
        <Button title={t('transX.myRequests.post')} loading={create.isPending} disabled={!ready} onPress={() => create.mutate()} />
        {error ? <Txt color={C.error}>{error}</Txt> : null}
      </Card>

      {isLoading ? (
        <Loading />
      ) : requests.length === 0 ? (
        <EmptyState icon="cube-outline" title={t('transX.myRequests.emptyTitle')} body={t('transX.myRequests.emptyBody')} />
      ) : (
        requests.map((r) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{r.fromCity} → {r.toCity}</Txt>
                <Txt variant="muted">#{r.reference} · {r.cargo}{r.weightMt ? ` · ${r.weightMt} MT` : ''} · {t('transX.quotesCount', { count: r.quotes?.length ?? 0 })}{r.trip ? ` · ${t('transX.myRequests.trip')} ${r.trip.reference}` : ''}</Txt>
              </View>
              <Badge label={r.status} tone={reqTone[r.status] ?? 'slate'} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
