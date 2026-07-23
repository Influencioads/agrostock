import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type {
  ApiLoaderWorker, ApiLoaderTeam, ApiLoaderJob, ApiLoaderRate, ApiLoaderReviews, ApiAttendance,
} from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Input, RatingStars, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { forwardChevron } from '../../lib/rtl';

const DAYS = [
  { n: 1, k: 'mon' }, { n: 2, k: 'tue' }, { n: 3, k: 'wed' },
  { n: 4, k: 'thu' }, { n: 5, k: 'fri' }, { n: 6, k: 'sat' },
];
const SLOTS = ['morning', 'afternoon', 'evening'];

/* ── Earnings ─────────────────────────────────────────────────────────── */
// Read-only earnings (payouts from completed jobs) + withdraw, shared platform-wide.
export { EarningsScreen as LoaderEarnings } from '../components/MoneyScreens';

/* ── Pricing (rate card) ──────────────────────────────────────────────── */
export function LoaderPricing() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const [service, setService] = useState('');
  const [rate, setRate] = useState('');
  const { data: rates = [], isLoading } = useQuery<ApiLoaderRate[]>({ queryKey: ['loader-rates'], queryFn: () => api.loaders.rates(), enabled: !!user });
  const refresh = () => qc.invalidateQueries({ queryKey: ['loader-rates'] });
  const add = useMutation({ mutationFn: () => api.loaders.addRate({ service: service.trim(), rateCents: Math.round(Number(rate) * 100) }), onSuccess: () => { refresh(); setService(''); setRate(''); } });
  const del = useMutation({ mutationFn: (id: string) => api.loaders.delRate(id), onSuccess: refresh });
  return (
    <Screen>
      <Txt variant="h2">{t('loaderX.pricing.title')}</Txt>
      <Txt variant="muted">{t('loaderX.pricing.subtitle')}</Txt>
      <Card>
        <Row gap={8} style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 2 }}><Input label={t('loaderX.pricing.serviceLabel')} placeholder={t('pubX.ph.serviceBulkLoading')} value={service} onChangeText={setService} /></View>
          <View style={{ flex: 1 }}><Input label={t('loaderX.pricing.ratePerMt')} keyboardType="numeric" placeholder="4.50" value={rate} onChangeText={setRate} /></View>
          <Button title={t('loaderX.common.add')} icon="add" loading={add.isPending} disabled={!service.trim() || !Number(rate)} onPress={() => add.mutate()} />
        </Row>
      </Card>
      {isLoading ? <SkeletonRows /> : rates.length === 0 ? (
        <EmptyState icon="cash-outline" title={t('loaderX.pricing.emptyTitle')} body={t('loaderX.pricing.emptyBody')} />
      ) : rates.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="title">{r.service}</Txt>
            <Row gap={10}>
              <Txt variant="title">{fmtCents(r.rateCents)}/{r.unit}</Txt>
              <Pressable onPress={() => del.mutate(r.id)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={C.error} /></Pressable>
            </Row>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

/* ── Reviews ──────────────────────────────────────────────────────────── */
export function LoaderReviews() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, isLoading } = useQuery<ApiLoaderReviews>({ queryKey: ['loader-reviews'], queryFn: () => api.loaders.reviews(), enabled: !!user });
  const list = data?.list ?? [];
  return (
    <Screen>
      <Txt variant="h2">{t('loaderX.reviews.title')}</Txt>
      {isLoading ? <SkeletonRows /> : list.length === 0 ? (
        <EmptyState icon="star-outline" title={t('loaderX.reviews.emptyTitle')} body={t('loaderX.reviews.emptyBody')} />
      ) : (
        <>
          <Card>
            <Row gap={12} style={{ alignItems: 'center' }}>
              <Txt style={{ fontSize: 36, fontWeight: '800', color: C.ink }}>{(data?.avg ?? 0).toFixed(1)}</Txt>
              <View><RatingStars n={Math.round(data?.avg ?? 0)} /><Txt variant="muted">{t('loaderX.reviews.across', { count: data?.count ?? 0 })}</Txt></View>
            </Row>
          </Card>
          {list.map((r) => (
            <Card key={r.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="title">{r.rater?.name ?? t('loaderX.reviews.clientFallback')}</Txt>
                <RatingStars n={r.stars} />
              </Row>
              {r.text ? <Txt variant="muted" style={{ marginTop: 4 }}>{r.text}</Txt> : null}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

/* ── Availability grid ────────────────────────────────────────────────── */
export function LoaderAvailability() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['loader-availability'], queryFn: () => api.loaders.availability(), enabled: !!user });
  const on = (weekday: number, slot: string) => rows.some((r) => r.weekday === weekday && r.slot === slot && r.available);
  const save = useMutation({
    mutationFn: (cell: { weekday: number; slot: string; available: boolean }) => api.loaders.setAvailability([cell]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loader-availability'] }),
  });
  return (
    <Screen>
      <Txt variant="h2">{t('loaderX.availability.title')}</Txt>
      <Txt variant="muted">{t('loaderX.availability.subtitle')}</Txt>
      {isLoading ? <SkeletonRows /> : (
        <Card style={{ gap: 8 }}>
          <Row gap={6}>
            <View style={{ width: 74 }} />
            {DAYS.map((d) => <Txt key={d.n} variant="muted" style={{ flex: 1, textAlign: 'center' }}>{t('loaderX.days.' + d.k)}</Txt>)}
          </Row>
          {SLOTS.map((slot) => (
            <Row key={slot} gap={6} style={{ alignItems: 'center' }}>
              <Txt variant="small" style={{ width: 74 }}>{t('loaderX.slots.' + slot)}</Txt>
              {DAYS.map((d) => {
                const active = on(d.n, slot);
                return (
                  <Pressable key={d.n} style={{ flex: 1 }} disabled={save.isPending} onPress={() => save.mutate({ weekday: d.n, slot, available: !active })}>
                    <View style={{ height: 30, borderRadius: 8, backgroundColor: active ? C.leaf : C.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt style={{ color: active ? C.white : C.inkSoft, fontWeight: '800' }}>{active ? '✓' : '—'}</Txt>
                    </View>
                  </Pressable>
                );
              })}
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}

/* ── Attendance ───────────────────────────────────────────────────────── */
export function LoaderAttendance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [jobId, setJobId] = useState('');
  const { data: workers = [], isLoading } = useQuery<ApiLoaderWorker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers(), enabled: !!user });
  const { data: jobs = [] } = useQuery<ApiLoaderJob[]>({ queryKey: ['jobs', 'mine'], queryFn: () => api.loaders.myJobs(), enabled: !!user });
  const { data: rows = [] } = useQuery<ApiAttendance[]>({ queryKey: ['loader-attendance', today], queryFn: () => api.loaders.attendance(today), enabled: !!user });
  const activeJobs = jobs.filter((j) => j.status !== 'completed');
  const openRowFor = (workerId: string) => rows.find((r) => r.worker?.id === workerId && !r.checkOutAt);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['loader-attendance', today] }); qc.invalidateQueries({ queryKey: ['workers'] }); };
  const checkin = useMutation({ mutationFn: (workerId: string) => api.loaders.attendanceCheckin(workerId, jobId), onSuccess: refresh });
  const checkout = useMutation({ mutationFn: (id: string) => api.loaders.attendanceCheckout(id), onSuccess: refresh });

  return (
    <Screen>
      <Txt variant="h2">{t('loaderX.attendance.title')}</Txt>
      {isLoading ? <SkeletonRows /> : workers.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title={t('loaderX.attendance.emptyTitle')} body={t('loaderX.attendance.emptyBody')} />
      ) : (
        <>
          <Card style={{ gap: 8 }}>
            <Txt variant="label">{t('loaderX.attendance.checkAgainstJob')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {activeJobs.length === 0 ? <Txt variant="muted">{t('loaderX.attendance.noActiveJobs')}</Txt> : activeJobs.map((j) => (
                <Pressable key={j.id} onPress={() => setJobId(j.id)}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: jobId === j.id ? C.green : C.white, borderColor: jobId === j.id ? C.green : C.border }}>
                    <Txt style={{ color: jobId === j.id ? C.white : C.ink, fontWeight: '700', fontSize: 13 }}>#{j.reference}</Txt>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
          {workers.map((w) => {
            const open = openRowFor(w.id);
            return (
              <Card key={w.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View><Txt variant="title">{w.name}</Txt>{w.skill ? <Txt variant="muted">{w.skill}</Txt> : null}</View>
                  <Row gap={8}>
                    <Badge label={w.status.replace('_', ' ')} tone={w.status === 'on_site' ? 'info' : w.status === 'available' ? 'green' : 'slate'} />
                    {open ? (
                      <Button title={t('loaderX.attendance.checkOut')} size="sm" variant="outline" loading={checkout.isPending} onPress={() => checkout.mutate(open.id)} />
                    ) : (
                      <Button title={t('loaderX.attendance.checkIn')} size="sm" disabled={!jobId} loading={checkin.isPending} onPress={() => checkin.mutate(w.id)} />
                    )}
                  </Row>
                </Row>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

/* ── Teams ────────────────────────────────────────────────────────────── */
export function LoaderTeams() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [detail, setDetail] = useState<ApiLoaderTeam | null>(null);
  const { data: teams = [], isLoading } = useQuery<ApiLoaderTeam[]>({ queryKey: ['teams'], queryFn: () => api.loaders.teams(), enabled: !!user });
  const refresh = () => qc.invalidateQueries({ queryKey: ['teams'] });
  const add = useMutation({ mutationFn: () => api.loaders.addTeam(name.trim()), onSuccess: () => { refresh(); setName(''); } });
  return (
    <Screen>
      <Txt variant="h2">{t('loaderX.teams.title')}</Txt>
      <Card>
        <Row gap={8}>
          <View style={{ flex: 1 }}><Input placeholder={t('loaderX.teams.namePlaceholder')} value={name} onChangeText={setName} /></View>
          <Button title={t('loaderX.common.add')} icon="add" loading={add.isPending} disabled={!name.trim()} onPress={() => add.mutate()} />
        </Row>
      </Card>
      {isLoading ? <SkeletonRows /> : teams.length === 0 ? (
        <EmptyState icon="grid-outline" title={t('loaderX.teams.emptyTitle')} body={t('loaderX.teams.emptyBody')} />
      ) : teams.map((tm) => (
        <Card key={tm.id} onPress={() => setDetail(tm)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Txt variant="title">{tm.name}</Txt>
              <Txt variant="muted">{t('loaderX.plurals.workers', { count: tm._count?.workers ?? tm.workers?.length ?? 0 })}{(tm.workers ?? []).length ? ` · ${(tm.workers ?? []).map((w) => w.name).join(', ')}` : ''}</Txt>
            </View>
            <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
          </Row>
        </Card>
      ))}
      {detail && <TeamSheet team={detail} onClose={() => setDetail(null)} onChanged={refresh} />}
    </Screen>
  );
}

function TeamSheet({ team, onClose, onChanged }: { team: ApiLoaderTeam; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState(team.name);
  const { data: workers = [] } = useQuery<ApiLoaderWorker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers() });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['workers'] }); onChanged(); };
  const members = useMemo(() => workers.filter((w) => w.team?.id === team.id), [workers, team.id]);
  const available = useMemo(() => workers.filter((w) => w.team?.id !== team.id), [workers, team.id]);
  const rename = useMutation({ mutationFn: () => api.loaders.updateTeam(team.id, name.trim()), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: () => api.loaders.delTeam(team.id), onSuccess: () => { refresh(); onClose(); } });
  const setTeam = useMutation({ mutationFn: (v: { id: string; teamId: string | null }) => api.loaders.updateWorker(v.id, { teamId: v.teamId }), onSuccess: refresh });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '85%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{team.name}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
          </Row>
          <Row gap={8} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}><Input label={t('loaderX.teams.nameLabel')} value={name} onChangeText={setName} /></View>
            <Button title={t('loaderX.teams.rename')} variant="outline" loading={rename.isPending} disabled={name.trim() === team.name} onPress={() => rename.mutate()} />
          </Row>
          <Txt variant="label">{t('loaderX.teams.membersCount', { count: members.length })}</Txt>
          {members.length === 0 ? <Txt variant="muted">{t('loaderX.teams.noMembers')}</Txt> : members.map((w) => (
            <Card key={w.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="title">{w.name}</Txt>
                <Button title={t('loaderX.common.remove')} variant="ghost" size="sm" onPress={() => setTeam.mutate({ id: w.id, teamId: null })} />
              </Row>
            </Card>
          ))}
          <Txt variant="label">{t('loaderX.teams.addMembers')}</Txt>
          {available.length === 0 ? <Txt variant="muted">{t('loaderX.teams.allOnTeam')}</Txt> : available.map((w) => (
            <Card key={w.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="title">{w.name}{w.team?.name ? ` · ${w.team.name}` : ''}</Txt>
                <Button title={t('loaderX.common.add')} size="sm" onPress={() => setTeam.mutate({ id: w.id, teamId: team.id })} />
              </Row>
            </Card>
          ))}
          <Button title={t('loaderX.teams.deleteTeam')} variant="danger" loading={remove.isPending} onPress={() => remove.mutate()} />
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
