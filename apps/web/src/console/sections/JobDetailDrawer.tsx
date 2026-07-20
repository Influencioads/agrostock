import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Modal, type BadgeTone } from '@agrotraders/ui';
import type { ApiLoaderJobDetail, ApiLoaderWorker, ApiLoaderTeam } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';

const STATUS_TONE: Record<string, BadgeTone> = {
  open: 'slate', assigned: 'info', in_progress: 'warn', pending_proof: 'gold', completed: 'green',
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

/** Shared job drawer: full context + claim (open) or staff/complete (owned). */
export function JobDetailDrawer({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [teamId, setTeamId] = useState('');

  const { data: job, isLoading } = useQuery<ApiLoaderJobDetail>({
    queryKey: ['loader-job', jobId],
    queryFn: () => api.loaders.jobDetail(jobId!),
    enabled: !!jobId,
  });
  const { data: workers = [] } = useQuery<ApiLoaderWorker[]>({
    queryKey: ['workers'],
    queryFn: () => api.loaders.workers(),
    enabled: !!jobId,
  });
  const { data: teams = [] } = useQuery<ApiLoaderTeam[]>({
    queryKey: ['teams'],
    queryFn: () => api.loaders.teams(),
    enabled: !!jobId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['loader-job', jobId] });
    qc.invalidateQueries({ queryKey: ['open-jobs'] });
    qc.invalidateQueries({ queryKey: ['my-jobs-lc'] });
    qc.invalidateQueries({ queryKey: ['workers'] });
  };

  const claim = useMutation({ mutationFn: () => api.loaders.claimJob(jobId!), onSuccess: () => { invalidate(); onClose(); } });
  const assign = useMutation({
    mutationFn: () => api.loaders.assign(jobId!, { workerIds: [...picked], teamId: teamId || undefined }),
    onSuccess: () => { invalidate(); setPicked(new Set()); setTeamId(''); },
  });
  const unassign = useMutation({ mutationFn: (workerId: string) => api.loaders.unassign(jobId!, workerId), onSuccess: invalidate });
  const setStatus = useMutation({ mutationFn: (status: string) => api.loaders.setJobStatus(jobId!, status), onSuccess: invalidate });

  const assignedIds = useMemo(() => new Set((job?.assignments ?? []).map((a) => a.worker?.id)), [job]);
  const unclaimed = !!job && job.status === 'open';
  const owned = !!job && !unclaimed;
  const done = job?.status === 'completed';

  const toggle = (id?: string) => {
    if (!id) return;
    setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  return (
    <Modal closeLabel={t('common:close')} open={!!jobId} onClose={onClose} title={job ? `${job.location} · #${job.reference}` : t('console.loaderco.jobFallback')} className="max-w-2xl">
      {isLoading || !job ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[job.status] ?? 'slate'}>{t(`console.dash.jobStatus.${job.status}`, { defaultValue: job.status.replace('_', ' ') })}</Badge>
            <span className="text-xs text-ink-soft">{t('console.loaderco.workersAssigned', { n: (job.assignments ?? []).length, m: job.workersNeeded })}</span>
          </div>

          {/* Context — what the job is for, who placed it */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-bg p-4 sm:grid-cols-3">
            <Field label={t('console.loaderco.placedBy')} value={job.createdBy ? `${job.createdBy.name} (${job.createdBy.role})` : undefined} />
            <Field label={t('console.loaderco.product')} value={job.order?.product ? `${job.order.product.emoji ?? ''} ${job.order.product.name}`.trim() : job.cargo ?? undefined} />
            <Field label={t('console.loaderco.quantity')} value={job.order?.qty ?? undefined} />
            <Field label={t('console.loaderco.order')} value={job.order ? `#${job.order.reference}` : undefined} />
            <Field label={t('console.loaderco.buyer')} value={job.order?.buyer?.name} />
            <Field label={t('console.loaderco.seller')} value={job.order?.seller?.name} />
            <Field label={t('console.loaderco.pay')} value={job.payCents != null ? usd(job.payCents) : undefined} />
            <Field label={t('console.loaderco.needed')} value={job.neededDate ? new Date(job.neededDate).toLocaleDateString() : undefined} />
            <Field label={t('console.loaderco.location')} value={job.location} />
            {owned && job.otp && <Field label={t('console.loaderco.completionOtp')} value={job.otp} />}
          </div>
          {job.notes && <p className="text-sm italic text-ink-soft">“{job.notes}”</p>}

          {/* Assigned crew */}
          {owned && (
            <div>
              <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{t('console.loaderco.assignedCrew')}</h4>
              {(job.assignments ?? []).length === 0 ? (
                <p className="text-sm text-ink-soft">{t('console.loaderco.noAssigned')}</p>
              ) : (
                <div className="space-y-2">
                  {(job.assignments ?? []).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
                      <div className="text-sm font-semibold text-ink">
                        {a.worker?.name}
                        {a.worker?.skill ? <span className="ms-1 text-xs font-normal text-ink-soft">· {a.worker.skill}</span> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="slate">{t(`console.worker.assignmentStatus.${a.status}`, { defaultValue: a.status.replace('_', ' ') })}</Badge>
                        {!done && (
                          <button className="text-xs font-bold text-status-error hover:underline" disabled={unassign.isPending}
                            onClick={() => a.worker?.id && unassign.mutate(a.worker.id)}>{t('console.loaderco.remove')}</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attendance log */}
          {owned && (job.attendance ?? []).length > 0 && (
            <div>
              <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{t('console.nav.attendance')}</h4>
              <div className="space-y-1.5">
                {(job.attendance ?? []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs text-ink-soft">
                    <span className="font-semibold text-ink">{r.worker?.name}</span>
                    <span>
                      {t('console.loaderco.attIn', { time: r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' })}
                      {' · '}{t('console.loaderco.attOut', { time: r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staffing controls */}
          {owned && !done && (
            <Card className="space-y-3">
              <h4 className="font-display text-sm font-bold text-ink">{t('console.assignWorkers')}</h4>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {workers.filter((w) => !assignedIds.has(w.id)).map((w) => (
                  <label key={w.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-surface-bg">
                    <input type="checkbox" checked={picked.has(w.id)} onChange={() => toggle(w.id)} className="h-4 w-4 accent-brand-leaf" />
                    <span className="text-sm text-ink">{w.name}</span>
                    <span className="text-xs text-ink-soft">{w.team?.name ?? w.skill ?? ''}</span>
                  </label>
                ))}
                {workers.filter((w) => !assignedIds.has(w.id)).length === 0 && (
                  <p className="px-2 py-1 text-xs text-ink-soft">{t('console.loaderco.allOnJob')}</p>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">{t('console.loaderco.orWholeTeam')}</span>
                  <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-10 rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf">
                    <option value="">{t('console.loaderco.selectTeam')}</option>
                    {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name} ({tm._count?.workers ?? 0})</option>)}
                  </select>
                </label>
                <Button size="sm" leftIcon={<Icon name="plus" size={15} />} disabled={assign.isPending || (picked.size === 0 && !teamId)} onClick={() => assign.mutate()}>
                  {t('console.loaderco.assign')} {picked.size ? `(${picked.size})` : ''}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Footer actions differ by state */}
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-surface-border pt-4">
        <Button variant="ghost" onClick={onClose}>{t('console.loaderco.close')}</Button>
        {unclaimed && job && (
          <Button disabled={claim.isPending} onClick={() => claim.mutate()}>{claim.isPending ? t('console.loaderco.claiming') : t('console.loaderco.claimJob')}</Button>
        )}
        {owned && !done && (
          <>
            {job?.status === 'in_progress' && (
              <Button variant="secondary" disabled={setStatus.isPending} onClick={() => setStatus.mutate('pending_proof')}>{t('console.loaderco.readyProof')}</Button>
            )}
            <Button variant="accent" disabled={setStatus.isPending} onClick={() => setStatus.mutate('completed')}>{t('console.loaderco.markComplete')}</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
