import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiRoute } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage, usd } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, Input, Loading, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { FormModal } from './parts';

type Form = { name: string; fromCity: string; fromCountry: string; toCity: string; toCountry: string; distanceKm: string; baseRate: string };
const empty: Form = { name: '', fromCity: '', fromCountry: '', toCity: '', toCountry: '', distanceKm: '', baseRate: '' };

export function TransporterRoutes() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState<ApiRoute | null>(null);
  const [open, setOpen] = useState(false);
  const { data: routes = [], isLoading } = useQuery<ApiRoute[]>({ queryKey: ['routes'], queryFn: () => api.transport.routes(), enabled: !!user });
  const refresh = () => qc.invalidateQueries({ queryKey: ['routes'] });
  const del = useMutation({ mutationFn: (id: string) => api.transport.delRoute(id), onSuccess: refresh });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">{t('transX.routes.title')}</Txt>
        <Button title={t('transX.actions.add')} icon="add" size="sm" onPress={() => { setEditing(null); setOpen(true); }} />
      </Row>

      {isLoading ? (
        <Loading />
      ) : routes.length === 0 ? (
        <EmptyState icon="git-network-outline" title={t('transX.routes.emptyTitle')} body={t('transX.routes.emptyBody')} />
      ) : (
        routes.map((r) => {
          const intl = r.fromCountry && r.toCountry && r.fromCountry !== r.toCountry;
          return (
            <Card key={r.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="title">{r.name}</Txt>
                  <Txt variant="muted">{r.fromCity}{r.fromCountry ? `, ${r.fromCountry}` : ''} → {r.toCity}{r.toCountry ? `, ${r.toCountry}` : ''}</Txt>
                  <Txt variant="muted">{r.distanceKm ? t('transX.routes.kmUnit', { km: r.distanceKm }) : '—'}{r.baseRateCents ? ` · ${t('transX.routes.base')} ${usd(r.baseRateCents)}` : ''}</Txt>
                </View>
                {intl ? <Badge label={t('transX.routes.international')} tone="info" /> : null}
              </Row>
              <Row gap={8}>
                <View style={{ flex: 1 }}><Button title={t('transX.actions.edit')} variant="outline" size="sm" full onPress={() => { setEditing(r); setOpen(true); }} /></View>
                <View style={{ flex: 1 }}><Button title={t('transX.actions.remove')} variant="outline" size="sm" full loading={del.isPending} onPress={() => del.mutate(r.id)} /></View>
              </Row>
            </Card>
          );
        })
      )}

      {open && <RouteForm route={editing} onClose={() => setOpen(false)} onSaved={refresh} />}
    </Screen>
  );
}

function RouteForm({ route, onClose, onSaved }: { route: ApiRoute | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(route ? {
    name: route.name, fromCity: route.fromCity, fromCountry: route.fromCountry ?? '', toCity: route.toCity, toCountry: route.toCountry ?? '',
    distanceKm: route.distanceKm ? String(route.distanceKm) : '', baseRate: route.baseRateCents ? String(route.baseRateCents / 100) : '',
  } : empty);
  const { t } = useI18n();
  const [error, setError] = useState('');
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name, fromCity: form.fromCity, toCity: form.toCity, fromCountry: form.fromCountry || undefined, toCountry: form.toCountry || undefined,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined, baseRateCents: form.baseRate ? Math.round(Number(form.baseRate) * 100) : undefined,
      };
      return route ? api.transport.updateRoute(route.id, body) : api.transport.addRoute(body);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e) => setError(errMessage(e, t('transX.routes.saveError'))),
  });

  return (
    <FormModal visible title={route ? t('transX.routes.editTitle') : t('transX.routes.addTitle')} onClose={onClose} onSubmit={() => save.mutate()} submitting={save.isPending} canSubmit={!!form.name.trim() && !!form.fromCity.trim() && !!form.toCity.trim()}>
      <Input label={t('transX.routes.name')} placeholder={t('pubX.ph.routeName')} value={form.name} onChangeText={set('name')} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('transX.routes.fromCity')} placeholder={t('pubX.ph.cityMundra')} value={form.fromCity} onChangeText={set('fromCity')} /></View>
        <View style={{ flex: 1 }}><Input label={t('transX.routes.fromCountry')} placeholder={t('pubX.ph.countryIndia')} value={form.fromCountry} onChangeText={set('fromCountry')} /></View>
      </Row>
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('transX.routes.toCity')} placeholder={t('pubX.ph.cityDubai')} value={form.toCity} onChangeText={set('toCity')} /></View>
        <View style={{ flex: 1 }}><Input label={t('transX.routes.toCountry')} placeholder={t('pubX.ph.countryUae')} value={form.toCountry} onChangeText={set('toCountry')} /></View>
      </Row>
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('transX.routes.distance')} placeholder="1900" keyboardType="numeric" value={form.distanceKm} onChangeText={set('distanceKm')} /></View>
        <View style={{ flex: 1 }}><Input label={t('transX.routes.baseRate')} placeholder="1200" keyboardType="numeric" value={form.baseRate} onChangeText={set('baseRate')} /></View>
      </Row>
      {error ? <Txt color={C.error}>{error}</Txt> : null}
    </FormModal>
  );
}
