import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, type BadgeTone, type IconName } from '@agrotraders/ui';
import type { ApiAttendance, ApiLoaderReviews } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';

interface Assignment {
  id: string;
  status: string;
  job?: { reference: string; location: string; payCents?: number | null; otp?: string | null; createdBy?: { name: string } };
}

const tone: Record<string, BadgeTone> = { assigned: 'gold', accepted: 'info', checked_in: 'green', completed: 'slate' };

export function WorkerJobs() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['worker-jobs'],
    queryFn: () => api.loaders.workerJobs() as Promise<never>,
  });
  const accept = useMutation({ mutationFn: (id: string) => api.loaders.accept(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['worker-jobs'] }) });
  const checkin = useMutation({ mutationFn: (id: string) => api.loaders.checkin(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['worker-jobs'] }) });
  const checkout = useMutation({
    mutationFn: (id: string) => api.loaders.checkout(id),
    onSuccess: () => {
      // Check-out completes a direct worker hire and pays out — refresh earnings too.
      qc.invalidateQueries({ queryKey: ['worker-jobs'] });
      qc.invalidateQueries({ queryKey: ['me-earnings'] });
      qc.invalidateQueries({ queryKey: ['me-wallet'] });
      qc.invalidateQueries({ queryKey: ['me-dashboard'] });
    },
  });

  return (
    <div>
      <h2 className="mb-5 font-display text-2xl font-extrabold text-ink">{t('console.worker.myJobs')}</h2>
      {isLoading ? <p className="text-ink-soft">{t('common:loading')}</p> : jobs.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('console.worker.noJobs')}</Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface text-brand-dark"><Icon name="worker" size={20} /></span>
                <div>
                  <div className="font-display font-bold text-ink">{a.job?.location}</div>
                  <div className="text-xs text-ink-soft">
                    #{a.job?.reference} · {a.job?.createdBy?.name}
                    {a.job?.payCents ? ` · $${(a.job.payCents / 100).toFixed(0)}` : ''}
                    {a.status === 'accepted' && a.job?.otp ? ` · ${t('console.worker.otp', { otp: a.job.otp })}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={tone[a.status] ?? 'slate'}>{t(`console.worker.assignmentStatus.${a.status}`, { defaultValue: a.status.replace('_', ' ') })}</Badge>
                {a.status === 'assigned' && <Button size="sm" disabled={accept.isPending} onClick={() => accept.mutate(a.id)}>{t('console.worker.accept')}</Button>}
                {a.status === 'accepted' && <Button size="sm" variant="accent" disabled={checkin.isPending} onClick={() => checkin.mutate(a.id)}>{t('console.worker.checkIn')}</Button>}
                {a.status === 'checked_in' && <Button size="sm" variant="accent" disabled={checkout.isPending} onClick={() => checkout.mutate(a.id)}>{t('console.worker.checkOut')}</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const starStr = (n: number) => '★★★★★☆☆☆☆☆'.slice(5 - Math.round(n), 10 - Math.round(n));

/** Worker home: earnings/completed/rating stats + an availability toggle. */
export function WorkerDashboard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: dash } = useQuery({ queryKey: ['me-dashboard'], queryFn: () => api.me.dashboard() });
  const kpis = dash?.kpis ?? {};
  const available = dash?.available ?? false;

  const toggle = useMutation({
    mutationFn: (next: boolean) => api.loaders.setWorkerAvailability(next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-dashboard'] }),
  });

  const stats: { icon: IconName; label: string; value: string }[] = [
    { icon: 'wallet', label: t('console.worker.totalEarned'), value: usd(kpis.earnedCents) },
    { icon: 'check', label: t('console.worker.jobsCompleted'), value: String(kpis.completed ?? 0) },
    { icon: 'worker', label: t('console.worker.assignments'), value: String(kpis.assignments ?? 0) },
    { icon: 'star', label: t('console.worker.rating'), value: dash?.rating ? dash.rating.toFixed(1) : '—' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.worker.dashboardTitle')}</h2>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display font-bold text-ink">{t('console.worker.availability')}</div>
          <div className="text-sm text-ink-soft">{available ? t('console.worker.online') : t('console.worker.offline')}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={available ? 'green' : 'slate'}>{available ? t('console.worker.availableBadge') : t('console.worker.offBadge')}</Badge>
          <Button size="sm" variant={available ? 'ghost' : 'accent'} disabled={toggle.isPending} onClick={() => toggle.mutate(!available)}>
            {available ? t('console.worker.goOffline') : t('console.worker.goOnline')}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="flex flex-col gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface text-brand-dark"><Icon name={s.icon} size={18} /></span>
            <div className="font-display text-2xl font-extrabold text-ink">{s.value}</div>
            <div className="text-xs text-ink-soft">{s.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** A worker's own shift history — check-ins and check-outs. */
export function WorkerAttendance() {
  const { t } = useI18n();
  const { data: rows = [], isLoading } = useQuery<ApiAttendance[]>({
    queryKey: ['worker-attendance'],
    queryFn: () => api.loaders.workerAttendance(),
  });
  const hours = (r: ApiAttendance) =>
    r.checkInAt && r.checkOutAt ? ((new Date(r.checkOutAt).getTime() - new Date(r.checkInAt).getTime()) / 3.6e6).toFixed(1) + 'h' : '—';
  return (
    <div>
      <h2 className="mb-5 font-display text-2xl font-extrabold text-ink">{t('console.worker.shiftHistory')}</h2>
      {isLoading ? <p className="text-ink-soft">{t('common:loading')}</p> : rows.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('console.worker.noShifts')}</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="font-display font-bold text-ink">{r.job?.location ?? t('console.worker.shiftFallback')}</div>
                <div className="text-xs text-ink-soft">
                  #{r.job?.reference} · {r.checkInAt ? new Date(r.checkInAt).toLocaleString() : '—'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={r.checkOutAt ? 'slate' : 'green'}>{r.checkOutAt ? t('console.worker.completed') : t('console.worker.onSite')}</Badge>
                <span className="font-numeric font-bold text-ink">{hours(r)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ratings & reviews left on the worker's completed jobs. */
export function WorkerReviews() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery<ApiLoaderReviews>({
    queryKey: ['worker-reviews'],
    queryFn: () => api.loaders.workerReviews(),
  });
  const list = data?.list ?? [];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.worker.ratingsReviews')}</h2>
        {data && data.count > 0 && (
          <p className="mt-1 text-sm text-ink-soft">
            <span className="font-numeric font-bold text-ink">{data.avg.toFixed(1)}</span> {t('console.worker.average', { avg: '' }).trim()} · {t('console.worker.reviewsCount', { count: data.count })}
          </p>
        )}
      </div>
      {isLoading ? <p className="text-ink-soft">{t('common:loading')}</p> : list.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('console.worker.noReviews')}</Card>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Card key={r.id} className="py-3">
              <div className="flex items-center justify-between">
                <div className="font-display font-bold text-ink">{r.rater?.name ?? t('console.worker.clientFallback')}</div>
                <span className="text-mango-deep" title={`${r.stars} / 5`}>{starStr(r.stars)}</span>
              </div>
              {r.text && <p className="mt-1 text-sm text-ink-soft">{r.text}</p>}
              <div className="mt-1 text-xs text-ink-soft">#{r.job?.reference} · {new Date(r.createdAt).toLocaleDateString()}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
