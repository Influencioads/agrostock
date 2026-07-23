import { useState } from 'react';
import { Image, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiDriver } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { Avatar, Badge, Button, Card, EmptyState, Input, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { FormModal, PhotoPicker, type PickedImage } from './parts';

type Form = { name: string; vehicle: string; rating: string; onTime: string; phone: string; licenseNumber: string; experienceYears: string; ratePerHour: string };
const empty: Form = { name: '', vehicle: '', rating: '96', onTime: '95', phone: '', licenseNumber: '', experienceYears: '', ratePerHour: '' };

export function TransporterDrivers() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState<ApiDriver | null>(null);
  const [open, setOpen] = useState(false);
  const { data: drivers = [], isLoading } = useQuery<ApiDriver[]>({ queryKey: ['my-drivers'], queryFn: () => api.drivers.mine(), enabled: !!user });
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-drivers'] });
  const toggle = useMutation({ mutationFn: ({ id, status }: { id: string; status: 'active' | 'off' }) => api.drivers.update(id, { status }), onSuccess: refresh });
  const del = useMutation({ mutationFn: (id: string) => api.drivers.remove(id), onSuccess: refresh });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">{t('transX.drivers.title')}</Txt>
        <Button title={t('transX.actions.add')} icon="add" size="sm" onPress={() => { setEditing(null); setOpen(true); }} />
      </Row>

      {isLoading ? (
        <SkeletonRows />
      ) : drivers.length === 0 ? (
        <EmptyState icon="people-outline" title={t('transX.drivers.emptyTitle')} body={t('transX.drivers.emptyBody')} />
      ) : (
        drivers.map((d) => (
          <Card key={d.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={10}>
                {d.photoUrl ? <Image source={{ uri: assetUrl(d.photoUrl) }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface }} /> : <Avatar name={d.name} size={44} />}
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="title">{d.name}</Txt>
                  <Txt variant="muted">{d.vehicle ?? '—'} · ★ {d.ratingPct ?? 0}% · {t('transX.drivers.onTime')} {d.onTimePct ?? 0}%</Txt>
                </View>
              </Row>
              <Badge label={d.status} tone={d.status === 'active' ? 'green' : 'slate'} />
            </Row>
            {(d.phone || d.licenseNumber || d.experienceYears != null || d.ratePerHourCents != null) && (
              <View>
                {d.phone ? <Txt variant="muted">☎ {d.phone}</Txt> : null}
                {d.licenseNumber ? <Txt variant="muted">{t('transX.drivers.licence')} {d.licenseNumber}{d.licenseExpiry ? ` · ${t('transX.drivers.exp')} ${new Date(d.licenseExpiry).toLocaleDateString()}` : ''}</Txt> : null}
                {(d.experienceYears != null || d.ratePerHourCents != null) ? (
                  <Txt variant="muted">{d.experienceYears != null ? t('transX.drivers.yrsExp', { years: d.experienceYears }) : ''}{d.experienceYears != null && d.ratePerHourCents != null ? ' · ' : ''}{d.ratePerHourCents != null ? `${fmtCents(d.ratePerHourCents)}${t('transX.drivers.perHr')}` : ''}</Txt>
                ) : null}
              </View>
            )}
            <Row gap={8}>
              <View style={{ flex: 1 }}><Button title={t('transX.actions.edit')} variant="outline" size="sm" full onPress={() => { setEditing(d); setOpen(true); }} /></View>
              <View style={{ flex: 1 }}><Button title={d.status === 'active' ? t('transX.drivers.offDuty') : t('transX.drivers.activate')} variant="outline" size="sm" full onPress={() => toggle.mutate({ id: d.id, status: d.status === 'active' ? 'off' : 'active' })} /></View>
              <View style={{ flex: 1 }}><Button title={t('transX.actions.remove')} variant="outline" size="sm" full loading={del.isPending} onPress={() => del.mutate(d.id)} /></View>
            </Row>
          </Card>
        ))
      )}

      {open && <DriverForm driver={editing} onClose={() => setOpen(false)} onSaved={refresh} />}
    </Screen>
  );
}

function DriverForm({ driver, onClose, onSaved }: { driver: ApiDriver | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(driver ? {
    name: driver.name, vehicle: driver.vehicle ?? '', rating: String(driver.ratingPct ?? 96), onTime: String(driver.onTimePct ?? 95),
    phone: driver.phone ?? '', licenseNumber: driver.licenseNumber ?? '', experienceYears: driver.experienceYears != null ? String(driver.experienceYears) : '',
    ratePerHour: driver.ratePerHourCents != null ? String(driver.ratePerHourCents / 100) : '',
  } : empty);
  const { t } = useI18n();
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [error, setError] = useState('');
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(), vehicle: form.vehicle.trim() || undefined,
        ratingPct: Math.min(100, Math.max(0, Math.round(Number(form.rating)) || 0)),
        onTimePct: Math.min(100, Math.max(0, Math.round(Number(form.onTime)) || 0)),
        phone: form.phone.trim() || undefined, licenseNumber: form.licenseNumber.trim() || undefined,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
        ratePerHourCents: form.ratePerHour ? Math.round(Number(form.ratePerHour) * 100) : undefined,
      };
      const saved = driver ? await api.drivers.update(driver.id, body) : await api.drivers.create(body);
      if (photo) await api.drivers.uploadPhoto(saved.id, photo);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e) => setError(errMessage(e, t('transX.drivers.saveError'))),
  });

  return (
    <FormModal visible title={driver ? t('transX.drivers.editTitle') : t('transX.drivers.addTitle')} onClose={onClose} onSubmit={() => save.mutate()} submitting={save.isPending} canSubmit={!!form.name.trim()}>
      <PhotoPicker url={driver?.photoUrl} picked={photo} onPick={setPhoto} round />
      <Input label={t('transX.drivers.name')} placeholder={t('pubX.ph.driverName')} value={form.name} onChangeText={set('name')} />
      <Input label={t('transX.drivers.vehicle')} placeholder="TR-441" value={form.vehicle} onChangeText={set('vehicle')} />
      <Input label={t('transX.drivers.phone')} placeholder="+91…" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />
      <Input label={t('transX.drivers.licenceNumber')} placeholder="MH-1420110012345" value={form.licenseNumber} onChangeText={set('licenseNumber')} />
      <Input label={t('transX.drivers.experience')} placeholder="8" keyboardType="numeric" value={form.experienceYears} onChangeText={set('experienceYears')} />
      <Input label={t('transX.drivers.rate')} placeholder="12" keyboardType="numeric" value={form.ratePerHour} onChangeText={set('ratePerHour')} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('transX.drivers.ratingPct')} placeholder="96" keyboardType="numeric" value={form.rating} onChangeText={set('rating')} /></View>
        <View style={{ flex: 1 }}><Input label={t('transX.drivers.onTimePct')} placeholder="95" keyboardType="numeric" value={form.onTime} onChangeText={set('onTime')} /></View>
      </Row>
      {error ? <Txt color={C.error}>{error}</Txt> : null}
    </FormModal>
  );
}
