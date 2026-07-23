import { useState } from 'react';
import { Image, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiVehicle } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, Input, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C, radius } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { FormModal, PhotoPicker, type PickedImage } from './parts';

type Form = { type: string; plate: string; capacityMt: string; makeModel: string; year: string; notes: string };
const empty: Form = { type: '', plate: '', capacityMt: '', makeModel: '', year: '', notes: '' };

export function TransporterVehicles() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState<ApiVehicle | null>(null);
  const [open, setOpen] = useState(false);
  const { data: vehicles = [], isLoading } = useQuery<ApiVehicle[]>({ queryKey: ['vehicles'], queryFn: () => api.transport.vehicles(), enabled: !!user });
  const refresh = () => qc.invalidateQueries({ queryKey: ['vehicles'] });
  const del = useMutation({ mutationFn: (id: string) => api.transport.delVehicle(id), onSuccess: refresh });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">{t('transX.vehicles.title')}</Txt>
        <Button title={t('transX.actions.add')} icon="add" size="sm" onPress={() => { setEditing(null); setOpen(true); }} />
      </Row>

      {isLoading ? (
        <SkeletonRows />
      ) : vehicles.length === 0 ? (
        <EmptyState icon="bus-outline" title={t('transX.vehicles.emptyTitle')} body={t('transX.vehicles.emptyBody')} />
      ) : (
        vehicles.map((v) => (
          <Card key={v.id} style={{ gap: 10 }}>
            {v.photoUrl ? (
              <Image source={{ uri: assetUrl(v.photoUrl) }} style={{ width: '100%', height: 140, borderRadius: radius.md, backgroundColor: C.surface }} />
            ) : null}
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{v.type}</Txt>
                <Txt variant="muted">{v.plate}{v.capacityMt ? ` · ${v.capacityMt} MT` : ''}{v.makeModel ? ` · ${v.makeModel}` : ''}{v.year ? ` · ${v.year}` : ''}</Txt>
                {v.insuranceExpiry ? <Txt variant="muted">{t('transX.vehicles.insurance', { date: new Date(v.insuranceExpiry).toLocaleDateString() })}</Txt> : null}
              </View>
              <Badge label={v.status.replace('_', ' ')} tone={v.status === 'available' ? 'green' : v.status === 'on_trip' ? 'info' : 'warn'} />
            </Row>
            <Row gap={8}>
              <View style={{ flex: 1 }}><Button title={t('transX.actions.edit')} variant="outline" size="sm" full onPress={() => { setEditing(v); setOpen(true); }} /></View>
              <View style={{ flex: 1 }}><Button title={t('transX.actions.remove')} variant="outline" size="sm" full loading={del.isPending} onPress={() => del.mutate(v.id)} /></View>
            </Row>
          </Card>
        ))
      )}

      {open && <VehicleForm vehicle={editing} onClose={() => setOpen(false)} onSaved={refresh} />}
    </Screen>
  );
}

function VehicleForm({ vehicle, onClose, onSaved }: { vehicle: ApiVehicle | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(vehicle ? {
    type: vehicle.type, plate: vehicle.plate, capacityMt: vehicle.capacityMt ?? '', makeModel: vehicle.makeModel ?? '',
    year: vehicle.year ? String(vehicle.year) : '', notes: vehicle.notes ?? '',
  } : empty);
  const { t } = useI18n();
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [error, setError] = useState('');
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const body = { type: form.type, plate: form.plate, capacityMt: form.capacityMt || undefined, makeModel: form.makeModel || undefined, year: form.year ? Number(form.year) : undefined, notes: form.notes || undefined };
      const saved = vehicle ? await api.transport.updateVehicle(vehicle.id, body) : await api.transport.addVehicle(body);
      if (photo) await api.transport.uploadVehiclePhoto(saved.id, photo);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e) => setError(errMessage(e, t('transX.vehicles.saveError'))),
  });

  return (
    <FormModal visible title={vehicle ? t('transX.vehicles.editTitle') : t('transX.vehicles.addTitle')} onClose={onClose} onSubmit={() => save.mutate()} submitting={save.isPending} canSubmit={!!form.type.trim() && !!form.plate.trim()}>
      <PhotoPicker url={vehicle?.photoUrl} picked={photo} onPick={setPhoto} />
      <Input label={t('transX.vehicles.type')} placeholder={t('pubX.ph.vehicleType')} value={form.type} onChangeText={set('type')} />
      <Input label={t('transX.vehicles.plate')} placeholder="GJ-01-AB-1234" value={form.plate} onChangeText={set('plate')} />
      <Input label={t('transX.vehicles.capacity')} placeholder="28" keyboardType="numeric" value={form.capacityMt} onChangeText={set('capacityMt')} />
      <Input label={t('transX.vehicles.makeModel')} placeholder={t('pubX.ph.makeModel')} value={form.makeModel} onChangeText={set('makeModel')} />
      <Input label={t('transX.vehicles.year')} placeholder="2021" keyboardType="numeric" value={form.year} onChangeText={set('year')} />
      <Input label={t('transX.vehicles.notes')} placeholder={t('transX.vehicles.notesPlaceholder')} value={form.notes} onChangeText={set('notes')} />
      {error ? <Txt color={C.error}>{error}</Txt> : null}
    </FormModal>
  );
}
