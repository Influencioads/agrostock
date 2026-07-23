import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiLoaderJob, ApiLoaderJobDetail, ApiLoaderWorker, ApiLoaderTeam } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Row, Screen, Segmented, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';

type TFn = (key: string, options?: Record<string, unknown>) => string;

const JOB_TONE: Record<string, 'slate' | 'info' | 'warn' | 'gold' | 'green'> = {
  open: 'slate', assigned: 'info', in_progress: 'warn', pending_proof: 'gold', completed: 'green',
};
function jobContext(j: ApiLoaderJob, t: TFn): string {
  return [j.order?.product?.name ?? j.cargo ?? undefined, j.order?.qty ?? undefined, j.createdBy ? t('loaderX.jobs.forName', { name: j.createdBy.name }) : undefined].filter(Boolean).join(' · ');
}

export function LoaderJobs() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const [tab, setTab] = useState('requests');
  const [manageId, setManageId] = useState<string | null>(null);
  const { data: open = [], isLoading: l1 } = useQuery<ApiLoaderJob[]>({ queryKey: ['jobs', 'open'], queryFn: () => api.loaders.openJobs(), enabled: !!user });
  const { data: mine = [], isLoading: l2 } = useQuery<ApiLoaderJob[]>({ queryKey: ['jobs', 'mine'], queryFn: () => api.loaders.myJobs(), enabled: !!user });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['jobs', 'open'] }); qc.invalidateQueries({ queryKey: ['jobs', 'mine'] }); };
  const claim = useMutation({ mutationFn: (id: string) => api.loaders.claimJob(id), onSuccess: refresh });

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('loaderX.jobs.title')}</Txt>
      <Segmented options={[{ id: 'requests', label: t('loaderX.jobs.tabRequests') }, { id: 'active', label: t('loaderX.jobs.tabActive') }]} value={tab} onChange={setTab} />

      {tab === 'requests' ? (
        l1 ? <SkeletonRows /> : open.length === 0 ? (
          <EmptyState icon="cube-outline" title={t('loaderX.jobs.emptyRequestsTitle')} body={t('loaderX.jobs.emptyRequestsBody')} />
        ) : open.map((j) => (
          <Card key={j.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Txt variant="title">{j.location}</Txt>
                <Txt variant="muted">#{j.reference} · {t('loaderX.plurals.workers', { count: j.workersNeeded })}{j.payCents != null ? ` · ${fmtCents(j.payCents)}` : ''}</Txt>
                {jobContext(j, t) ? <Txt variant="small" color={C.dark}>{jobContext(j, t)}</Txt> : null}
              </View>
              <Row gap={8}>
                <Button title={t('loaderX.jobs.details')} size="sm" variant="outline" onPress={() => setManageId(j.id)} />
                <Button title={t('loaderX.jobs.claim')} size="sm" loading={claim.isPending} onPress={() => claim.mutate(j.id)} />
              </Row>
            </Row>
          </Card>
        ))
      ) : l2 ? <SkeletonRows /> : mine.length === 0 ? (
        <EmptyState icon="people-outline" title={t('loaderX.jobs.emptyActiveTitle')} body={t('loaderX.jobs.emptyActiveBody')} />
      ) : mine.map((j) => (
        <Card key={j.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt variant="title">{j.location}</Txt>
              <Txt variant="muted">#{j.reference} · {t('loaderX.jobs.assignedCount', { a: (j.assignments ?? []).length, b: j.workersNeeded })}</Txt>
              {jobContext(j, t) ? <Txt variant="small" color={C.dark}>{jobContext(j, t)}</Txt> : null}
            </View>
            <Row gap={8}>
              <Badge label={j.status.replace('_', ' ')} tone={JOB_TONE[j.status] ?? 'slate'} />
              <Button title={t('loaderX.jobs.manage')} size="sm" variant="outline" onPress={() => setManageId(j.id)} />
            </Row>
          </Row>
        </Card>
      ))}

      {manageId && <JobSheet jobId={manageId} onClose={() => setManageId(null)} onChanged={refresh} />}
    </Screen>
  );
}

function JobSheet({ jobId, onClose, onChanged }: { jobId: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { data: job, isLoading } = useQuery<ApiLoaderJobDetail>({ queryKey: ['loader-job', jobId], queryFn: () => api.loaders.jobDetail(jobId) });
  const { data: workers = [] } = useQuery<ApiLoaderWorker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers() });
  const { data: teams = [] } = useQuery<ApiLoaderTeam[]>({ queryKey: ['teams'], queryFn: () => api.loaders.teams() });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['loader-job', jobId] }); onChanged(); };
  const claim = useMutation({ mutationFn: () => api.loaders.claimJob(jobId), onSuccess: () => { invalidate(); onClose(); } });
  const assign = useMutation({ mutationFn: (teamId?: string) => api.loaders.assign(jobId, { workerIds: [...picked], teamId }), onSuccess: () => { invalidate(); setPicked(new Set()); } });
  const unassign = useMutation({ mutationFn: (workerId: string) => api.loaders.unassign(jobId, workerId), onSuccess: invalidate });
  const setStatus = useMutation({ mutationFn: (status: string) => api.loaders.setJobStatus(jobId, status), onSuccess: invalidate });

  const assignedIds = useMemo(() => new Set((job?.assignments ?? []).map((a) => a.worker?.id)), [job]);
  const unclaimed = !!job && job.status === 'open';
  const owned = !!job && !unclaimed;
  const done = job?.status === 'completed';
  const toggle = (id?: string) => {
    if (!id) return;
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          {isLoading || !job ? <SkeletonRows /> : (
            <>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="h3">{job.location}</Txt>
                <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
              </Row>
              <Row gap={8} style={{ alignItems: 'center' }}>
                <Badge label={job.status.replace('_', ' ')} tone={JOB_TONE[job.status] ?? 'slate'} />
                <Txt variant="muted">#{job.reference} · {t('loaderX.jobs.assignedCount', { a: (job.assignments ?? []).length, b: job.workersNeeded })}</Txt>
              </Row>

              <Card style={{ gap: 4 }}>
                {job.createdBy ? <Txt variant="small">{t('loaderX.jobs.placedBy', { name: job.createdBy.name, role: job.createdBy.role })}</Txt> : null}
                {job.order?.product ? <Txt variant="small">{t('loaderX.jobs.productLabel')}: {job.order.product.name}{job.order.qty ? ` · ${job.order.qty}` : ''}</Txt> : job.cargo ? <Txt variant="small">{t('loaderX.jobs.cargoLabel')}: {job.cargo}</Txt> : null}
                {job.order?.reference ? <Txt variant="small">{t('loaderX.jobs.orderLabel')} #{job.order.reference}{job.order.buyer ? ` · ${t('loaderX.jobs.buyer', { name: job.order.buyer.name })}` : ''}</Txt> : null}
                {job.payCents != null ? <Txt variant="small">{t('loaderX.jobs.payLabel')}: {fmtCents(job.payCents)}</Txt> : null}
                {job.neededDate ? <Txt variant="small">{t('loaderX.jobs.neededLabel')}: {new Date(job.neededDate).toLocaleDateString()}</Txt> : null}
                {owned && job.otp ? <Txt variant="small">{t('loaderX.jobs.otpLabel')}: {job.otp}</Txt> : null}
                {job.notes ? <Txt variant="muted">“{job.notes}”</Txt> : null}
              </Card>

              {owned && (
                <>
                  <Txt variant="label">{t('loaderX.jobs.assignedCrew')}</Txt>
                  {(job.assignments ?? []).length === 0 ? <Txt variant="muted">{t('loaderX.jobs.noneAssigned')}</Txt> : (job.assignments ?? []).map((a) => (
                    <Card key={a.id}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Txt variant="title">{a.worker?.name}{a.worker?.skill ? ` · ${a.worker.skill}` : ''}</Txt>
                        <Row gap={8}>
                          <Badge label={a.status.replace('_', ' ')} tone="slate" />
                          {!done ? <Button title={t('loaderX.common.remove')} variant="ghost" size="sm" onPress={() => a.worker?.id && unassign.mutate(a.worker.id)} /> : null}
                        </Row>
                      </Row>
                    </Card>
                  ))}
                </>
              )}

              {owned && !done && (
                <>
                  <Txt variant="label">{t('loaderX.jobs.assignWorkers')}</Txt>
                  {workers.filter((w) => !assignedIds.has(w.id)).length === 0 ? (
                    <Txt variant="muted">{t('loaderX.jobs.allAssigned')}</Txt>
                  ) : workers.filter((w) => !assignedIds.has(w.id)).map((w) => (
                    <Pressable key={w.id} onPress={() => toggle(w.id)}>
                      <Card>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <Txt variant="title">{w.name}{w.team?.name ? ` · ${w.team.name}` : ''}</Txt>
                          <Ionicons name={picked.has(w.id) ? 'checkbox' : 'square-outline'} size={22} color={picked.has(w.id) ? C.green : C.border} />
                        </Row>
                      </Card>
                    </Pressable>
                  ))}
                  <Button title={`${t('loaderX.jobs.assign')}${picked.size ? ` (${picked.size})` : ''}`} icon="add" disabled={picked.size === 0} loading={assign.isPending} onPress={() => assign.mutate(undefined)} />
                  {teams.length > 0 && (
                    <>
                      <Txt variant="label">{t('loaderX.jobs.orAssignTeam')}</Txt>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {teams.map((tm) => (
                          <Button key={tm.id} title={`${tm.name} (${tm._count?.workers ?? 0})`} variant="outline" size="sm" loading={assign.isPending} onPress={() => assign.mutate(tm.id)} />
                        ))}
                      </ScrollView>
                    </>
                  )}
                </>
              )}

              <View style={{ gap: 8, marginTop: 8 }}>
                {unclaimed ? <Button title={t('loaderX.jobs.claimJob')} full loading={claim.isPending} onPress={() => claim.mutate()} /> : null}
                {owned && !done && job.status === 'in_progress' ? <Button title={t('loaderX.jobs.readyForProof')} variant="outline" full loading={setStatus.isPending} onPress={() => setStatus.mutate('pending_proof')} /> : null}
                {owned && !done ? <Button title={t('loaderX.jobs.markComplete')} variant="accent" full loading={setStatus.isPending} onPress={() => setStatus.mutate('completed')} /> : null}
              </View>
              <View style={{ height: 24 }} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
