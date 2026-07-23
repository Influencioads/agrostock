import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiLoaderWorker, ApiLoaderTeam } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Input, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { TagInput } from '../components/TagInput';

const STATUS_TONE = { on_site: 'info', available: 'green', off: 'slate' } as const;

export function LoaderWorkers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ApiLoaderWorker | null>(null);
  const { data: workers = [], isLoading } = useQuery<ApiLoaderWorker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers(), enabled: !!user });
  const del = useMutation({ mutationFn: (id: string) => api.loaders.delWorker(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['workers'] }) });

  return (
    <Screen edges={['top']}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">{t('loaderX.workers.title')}</Txt>
        <Button title={t('loaderX.common.add')} icon="add" size="sm" onPress={() => setAddOpen(true)} />
      </Row>
      {isLoading ? <SkeletonRows /> : workers.length === 0 ? (
        <EmptyState icon="people-outline" title={t('loaderX.workers.emptyTitle')} body={t('loaderX.workers.emptyBody')} />
      ) : workers.map((w) => (
        <Card key={w.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt variant="title">{w.name}</Txt>
              <Txt variant="muted">{w.skill ?? t('loaderX.workers.generalCrew')} · ★ {w.rating ?? '—'}{w.team?.name ? ` · ${w.team.name}` : ''}</Txt>
              {w.phone ? <Txt variant="muted">{w.phone}{w.dailyWageCents != null ? ` · ${fmtCents(w.dailyWageCents)}/day` : ''}</Txt> : null}
              <Txt variant="small" color={w.user ? C.dark : C.inkSoft}>{w.user ? t('loaderX.workers.loginEnabled') : t('loaderX.workers.loginDisabled')}</Txt>
            </View>
            <View style={{ gap: 8, alignItems: 'flex-end' }}>
              <Badge label={w.status.replace('_', ' ')} tone={STATUS_TONE[w.status as keyof typeof STATUS_TONE] ?? 'slate'} />
              <Row gap={6}>
                <Button title={t('loaderX.common.edit')} variant="outline" size="sm" onPress={() => setEditing(w)} />
                <Button title={t('loaderX.common.remove')} variant="ghost" size="sm" onPress={() => del.mutate(w.id)} />
              </Row>
            </View>
          </Row>
        </Card>
      ))}
      {addOpen && <AddWorkerSheet onClose={() => setAddOpen(false)} />}
      {editing && <EditWorkerSheet worker={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{title}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
          </Row>
          {children}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function TeamPicker({ teams, value, onChange }: { teams: ApiLoaderTeam[]; value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{t('loaderX.workers.teamLabel')}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ id: '', name: t('loaderX.workers.noTeam') } as ApiLoaderTeam, ...teams].map((tm) => (
          <Pressable key={tm.id || 'none'} onPress={() => onChange(tm.id)}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: value === tm.id ? C.green : C.white, borderColor: value === tm.id ? C.green : C.border }}>
              <Txt style={{ color: value === tm.id ? C.white : C.ink, fontWeight: '700', fontSize: 13 }}>{tm.name}</Txt>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function AddWorkerSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [f, setF] = useState({
    name: '', phone: '', skill: '', wage: '', teamId: '',
    originCity: '', originCountry: '', operatingCities: [] as string[], operatingCountries: [] as string[], minWorkHours: '',
    withLogin: false, loginHandle: '', loginPassword: '',
  });
  const set = (k: keyof typeof f) => (v: string | boolean | string[]) => setF((p) => ({ ...p, [k]: v }));
  const { data: teams = [] } = useQuery<ApiLoaderTeam[]>({ queryKey: ['teams'], queryFn: () => api.loaders.teams() });
  const add = useMutation({
    mutationFn: () => api.loaders.addWorker({
      name: f.name.trim(), phone: f.phone.trim() || undefined, skill: f.skill.trim() || undefined,
      dailyWageCents: f.wage ? Math.round(Number(f.wage) * 100) : undefined, teamId: f.teamId || undefined,
      originCity: f.originCity.trim() || undefined, originCountry: f.originCountry.trim() || undefined,
      operatingCities: f.operatingCities, operatingCountries: f.operatingCountries,
      minWorkHours: f.minWorkHours.trim() && Number.isFinite(Number(f.minWorkHours)) ? Number(f.minWorkHours) : undefined,
      loginHandle: f.withLogin ? (f.loginHandle.trim() || f.phone.trim()) : undefined,
      loginPassword: f.withLogin ? f.loginPassword : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workers'] }); onClose(); },
  });
  const loginInvalid = f.withLogin && (!(f.loginHandle.trim() || f.phone.trim()) || f.loginPassword.length < 6);
  return (
    <Sheet title={t('loaderX.workers.addTitle')} onClose={onClose}>
      <Input label={t('loaderX.workers.fullName')} placeholder={t('pubX.ph.workerName')} value={f.name} onChangeText={set('name')} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('loaderX.workers.phone')} placeholder="+92 300…" value={f.phone} onChangeText={set('phone')} /></View>
        <View style={{ flex: 1 }}><Input label={t('loaderX.workers.skill')} placeholder={t('pubX.ph.skillForklift')} value={f.skill} onChangeText={set('skill')} /></View>
      </Row>
      <Input label={t('loaderX.workers.dailyWage')} keyboardType="numeric" placeholder="20" value={f.wage} onChangeText={set('wage')} />
      <TeamPicker teams={teams} value={f.teamId} onChange={(id) => setF((p) => ({ ...p, teamId: id }))} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('pubX.dir.originCountry')} placeholder={t('pubX.ph.countryIndia')} value={f.originCountry} onChangeText={set('originCountry') as (v: string) => void} /></View>
        <View style={{ flex: 1 }}><Input label={t('pubX.dir.originCity')} placeholder={t('pubX.ph.cityAmritsar')} value={f.originCity} onChangeText={set('originCity') as (v: string) => void} /></View>
      </Row>
      <TagInput label={t('pubX.dir.operatingCountries')} value={f.operatingCountries} onChange={(v) => set('operatingCountries')(v)} placeholder={t('pubX.ph.opCountries')} />
      <TagInput label={t('pubX.dir.operatingCities')} value={f.operatingCities} onChange={(v) => set('operatingCities')(v)} placeholder={t('pubX.ph.opCities')} />
      <Input label={t('pubX.dir.opsMinHours')} keyboardType="number-pad" placeholder="4" value={f.minWorkHours} onChangeText={set('minWorkHours') as (v: string) => void} />
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="label">{t('loaderX.workers.createLogin')}</Txt>
        <Switch value={f.withLogin} onValueChange={(v) => set('withLogin')(v)} />
      </Row>
      {f.withLogin && (
        <>
          <Input label={t('loaderX.workers.loginHandle')} placeholder={t('loaderX.workers.loginHandlePlaceholder')} value={f.loginHandle} onChangeText={set('loginHandle')} />
          <Input label={t('loaderX.workers.tempPassword')} secureTextEntry value={f.loginPassword} onChangeText={set('loginPassword')} />
        </>
      )}
      {add.isError ? <Txt color={C.error} variant="small">{(add.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('loaderX.workers.addError')}</Txt> : null}
      <Button title={t('loaderX.workers.addBtn')} icon="checkmark" full loading={add.isPending} disabled={!f.name.trim() || loginInvalid} onPress={() => add.mutate()} />
    </Sheet>
  );
}

function EditWorkerSheet({ worker, onClose }: { worker: ApiLoaderWorker; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [f, setF] = useState({
    name: worker.name, phone: worker.phone ?? '', skill: worker.skill ?? '',
    wage: worker.dailyWageCents != null ? String(worker.dailyWageCents / 100) : '', teamId: worker.team?.id ?? '', status: worker.status,
    originCity: worker.originCity ?? '', originCountry: worker.originCountry ?? '',
    operatingCities: worker.operatingCities ?? [], operatingCountries: worker.operatingCountries ?? [],
    minWorkHours: worker.minWorkHours != null ? String(worker.minWorkHours) : '',
  });
  const set = (k: keyof typeof f) => (v: string | string[]) => setF((p) => ({ ...p, [k]: v }));
  const { data: teams = [] } = useQuery<ApiLoaderTeam[]>({ queryKey: ['teams'], queryFn: () => api.loaders.teams() });
  const save = useMutation({
    mutationFn: () => api.loaders.updateWorker(worker.id, {
      name: f.name.trim(), phone: f.phone.trim(), skill: f.skill.trim(),
      dailyWageCents: f.wage ? Math.round(Number(f.wage) * 100) : undefined, teamId: f.teamId || null, status: f.status,
      originCity: f.originCity.trim(), originCountry: f.originCountry.trim(),
      operatingCities: f.operatingCities, operatingCountries: f.operatingCountries,
      minWorkHours: f.minWorkHours.trim() && Number.isFinite(Number(f.minWorkHours)) ? Number(f.minWorkHours) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workers'] }); onClose(); },
  });
  const STATUSES = [{ id: 'available', label: t('loaderX.workers.status.available') }, { id: 'on_site', label: t('loaderX.workers.status.on_site') }, { id: 'off', label: t('loaderX.workers.status.off') }];
  return (
    <Sheet title={t('loaderX.workers.editTitle')} onClose={onClose}>
      <Input label={t('loaderX.workers.fullName')} value={f.name} onChangeText={set('name')} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('loaderX.workers.phone')} value={f.phone} onChangeText={set('phone')} /></View>
        <View style={{ flex: 1 }}><Input label={t('loaderX.workers.skill')} value={f.skill} onChangeText={set('skill')} /></View>
      </Row>
      <Input label={t('loaderX.workers.dailyWage')} keyboardType="numeric" value={f.wage} onChangeText={set('wage')} />
      <TeamPicker teams={teams} value={f.teamId} onChange={(id) => setF((p) => ({ ...p, teamId: id }))} />
      <View style={{ gap: 6 }}>
        <Txt variant="label">{t('loaderX.workers.availabilityLabel')}</Txt>
        <Row gap={8}>
          {STATUSES.map((st) => (
            <Pressable key={st.id} onPress={() => set('status')(st.id)}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: f.status === st.id ? C.green : C.white, borderColor: f.status === st.id ? C.green : C.border }}>
                <Txt style={{ color: f.status === st.id ? C.white : C.ink, fontWeight: '700', fontSize: 13 }}>{st.label}</Txt>
              </View>
            </Pressable>
          ))}
        </Row>
      </View>
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('pubX.dir.originCountry')} value={f.originCountry} onChangeText={set('originCountry') as (v: string) => void} /></View>
        <View style={{ flex: 1 }}><Input label={t('pubX.dir.originCity')} value={f.originCity} onChangeText={set('originCity') as (v: string) => void} /></View>
      </Row>
      <TagInput label={t('pubX.dir.operatingCountries')} value={f.operatingCountries} onChange={(v) => set('operatingCountries')(v)} placeholder={t('pubX.ph.opCountries')} />
      <TagInput label={t('pubX.dir.operatingCities')} value={f.operatingCities} onChange={(v) => set('operatingCities')(v)} placeholder={t('pubX.ph.opCities')} />
      <Input label={t('pubX.dir.opsMinHours')} keyboardType="number-pad" value={f.minWorkHours} onChangeText={set('minWorkHours') as (v: string) => void} />
      <Button title={t('loaderX.common.save')} icon="checkmark" full loading={save.isPending} disabled={!f.name.trim()} onPress={() => save.mutate()} />
    </Sheet>
  );
}
