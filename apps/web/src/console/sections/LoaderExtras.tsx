import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, type IconName } from '@agrotraders/ui';
import type { ApiLoaderJob, ApiLoaderWorker, ApiLoaderRate, ApiLoaderReviews, ApiAttendance } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { BarChart } from './BarChart';
import { JobDetailDrawer } from './JobDetailDrawer';

type Job = ApiLoaderJob;
type Worker = ApiLoaderWorker;

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

function EmptyHint({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <Card className="flex flex-col items-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-dark">
        <Icon name={icon} size={28} />
      </span>
      <p className="mt-3 font-display text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>
    </Card>
  );
}

const JOB_TONE: Record<string, 'slate' | 'info' | 'warn' | 'gold' | 'green'> = {
  open: 'slate', assigned: 'info', in_progress: 'warn', pending_proof: 'gold', completed: 'green',
};

/** One-line summary of what a job is for (product / cargo / order). */
function jobContext(j: Job, t: (k: string, o?: Record<string, unknown>) => string): string {
  const bits = [
    j.order?.product?.name ?? j.cargo ?? undefined,
    j.order?.qty ?? undefined,
    j.createdBy ? t('console.loaderco.forName', { name: j.createdBy.name }) : undefined,
  ].filter(Boolean);
  return bits.join(' · ');
}

/** Job Requests — open jobs the company can claim. */
export function LoaderJobRequests() {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: open = [], isLoading } = useQuery<Job[]>({ queryKey: ['open-jobs'], queryFn: () => api.loaders.openJobs() });
  return (
    <div>
      <SectionHead title={t('console.nav.jobrequests')} sub={t('console.loaderco.jobRequestsSub')} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : open.length === 0 ? (
        <EmptyHint icon="box" title={t('console.loaderco.noRequestsTitle')} body={t('console.loaderco.noRequestsBody')} />
      ) : (
        <div className="space-y-3">
          {open.map((j) => (
            <Card key={j.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display font-bold text-ink">{j.location}</div>
                <div className="text-xs text-ink-soft">#{j.reference} · {t('console.loaderco.workersNeeded', { count: j.workersNeeded })}{j.payCents != null ? ` · ${usd(j.payCents)}` : ''}</div>
                {jobContext(j, t) && <div className="mt-0.5 truncate text-xs text-brand-dark">{jobContext(j, t)}</div>}
              </div>
              <Button size="sm" variant="secondary" onClick={() => setOpenId(j.id)}>{t('console.loaderco.viewClaim')}</Button>
            </Card>
          ))}
        </div>
      )}
      <JobDetailDrawer jobId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** Active Jobs — claimed jobs the company is staffing. */
export function LoaderActiveJobs() {
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: mine = [], isLoading } = useQuery<Job[]>({ queryKey: ['my-jobs-lc'], queryFn: () => api.loaders.myJobs() });

  return (
    <div>
      <SectionHead title={t('console.nav.activejobs')} sub={t('console.loaderco.activeJobsSub')} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : mine.length === 0 ? (
        <EmptyHint icon="worker" title={t('console.loaderco.noActiveTitle')} body={t('console.loaderco.noActiveBody')} />
      ) : (
        <div className="space-y-3">
          {mine.map((j) => (
            <Card key={j.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display font-bold text-ink">{j.location}</div>
                <div className="text-xs text-ink-soft">
                  #{j.reference} · {t('console.loaderco.assignedCount', { n: (j.assignments ?? []).length, m: j.workersNeeded })}
                  {(j.assignments ?? []).length ? ` · ${(j.assignments ?? []).map((a) => a.worker?.name).join(', ')}` : ''}
                </div>
                {jobContext(j, t) && <div className="mt-0.5 truncate text-xs text-brand-dark">{jobContext(j, t)}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={JOB_TONE[j.status] ?? 'slate'}>{t(`console.dash.jobStatus.${j.status}`, { defaultValue: j.status.replace('_', ' ') })}</Badge>
                <Button size="sm" variant="secondary" onClick={() => setOpenId(j.id)}>{t('console.loaderco.manage')}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <JobDetailDrawer jobId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** Availability — weekly crew availability grid (weekday × slot), persisted server-side. */
const AVAIL_DAYS = [
  { n: 1, key: 'mon' }, { n: 2, key: 'tue' }, { n: 3, key: 'wed' },
  { n: 4, key: 'thu' }, { n: 5, key: 'fri' }, { n: 6, key: 'sat' },
];
const AVAIL_SLOTS = ['morning', 'afternoon', 'evening'];

export function LoaderAvailability() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['loader-availability'],
    queryFn: () => api.loaders.availability(),
  });
  const on = (weekday: number, slot: string) =>
    rows.some((r) => r.weekday === weekday && r.slot === slot && r.available);

  const save = useMutation({
    mutationFn: (cell: { weekday: number; slot: string; available: boolean }) => api.loaders.setAvailability([cell]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loader-availability'] }),
  });

  return (
    <div>
      <SectionHead title={t('console.nav.availability')} sub={t('console.loaderco.availabilitySub')} />
      {/* The scroller belongs INSIDE the Card, not on it: on the Card the p-5
          padding scrolls away with the grid and the right edge collapses. */}
      <Card>
        {isLoading ? (
          <p className="text-ink-soft">{t('common:loading')}</p>
        ) : (
          <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="mb-2 grid grid-cols-[110px_repeat(6,1fr)] items-center gap-2 text-center text-xs font-bold text-ink-soft">
              <span />
              {AVAIL_DAYS.map((d) => <span key={d.n}>{t(`console.dash.weekday.${d.key}`)}</span>)}
            </div>
            {AVAIL_SLOTS.map((slot) => (
              <div key={slot} className="mb-2 grid grid-cols-[110px_repeat(6,1fr)] items-center gap-2">
                <span className="text-sm font-semibold text-ink">{t(`console.dash.slot.${slot}`)}</span>
                {AVAIL_DAYS.map((d) => {
                  const active = on(d.n, slot);
                  return (
                    <button
                      key={d.n}
                      disabled={save.isPending}
                      onClick={() => save.mutate({ weekday: d.n, slot, available: !active })}
                      className={'h-8 rounded-md text-xs font-bold transition ' + (active ? 'bg-brand-leaf text-white hover:bg-brand' : 'bg-surface-bg text-ink-soft hover:bg-surface-border')}
                    >
                      {active ? '✓' : '—'}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/** Pricing — persisted per-service rate card. */
export function LoaderPricing() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [service, setService] = useState('');
  const [rate, setRate] = useState('');
  const { data: rates = [], isLoading } = useQuery<ApiLoaderRate[]>({ queryKey: ['loader-rates'], queryFn: () => api.loaders.rates() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['loader-rates'] });

  const add = useMutation({
    mutationFn: () => api.loaders.addRate({ service: service.trim(), rateCents: Math.round(Number(rate) * 100) }),
    onSuccess: () => { refresh(); setService(''); setRate(''); },
  });
  const update = useMutation({ mutationFn: (v: { id: string; rateCents: number }) => api.loaders.updateRate(v.id, { rateCents: v.rateCents }), onSuccess: refresh });
  const del = useMutation({ mutationFn: (id: string) => api.loaders.delRate(id), onSuccess: refresh });

  return (
    <div className="max-w-2xl">
      <SectionHead title={t('console.nav.pricing')} sub={t('console.loaderco.pricingSub')} />
      <Card padded={false} className="mb-5 divide-y divide-surface-border">
        {isLoading ? (
          <div className="px-5 py-6 text-sm text-ink-soft">{t('common:loading')}</div>
        ) : rates.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-ink-soft">{t('console.loaderco.noRates')}</div>
        ) : rates.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="text-sm font-semibold text-ink">{r.service}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-soft">$</span>
              <input
                defaultValue={(r.rateCents / 100).toFixed(2)}
                onBlur={(e) => { const c = Math.round(Number(e.target.value) * 100); if (c >= 0 && c !== r.rateCents) update.mutate({ id: r.id, rateCents: c }); }}
                className="h-9 w-20 rounded-md border border-surface-border px-2 text-end text-sm outline-none focus:border-brand-leaf"
              />
              <span className="text-sm text-ink-soft">/{r.unit}</span>
              <button onClick={() => del.mutate(r.id)} className="ms-1 text-ink-soft hover:text-status-error" aria-label={t('console.loaderco.removeRate')}><Icon name="x" size={16} /></button>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.6fr_1fr_auto] sm:items-end">
          <Input label={t('console.loaderco.newService')} placeholder={t('console.loaderco.phService')} value={service} onChange={(e) => setService(e.target.value)} />
          <Input label={t('console.loaderco.ratePerMt')} placeholder="5.00" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => add.mutate()} disabled={add.isPending || !service.trim() || !Number(rate)}>{t('console.loaderco.add')}</Button>
        </div>
      </Card>
    </div>
  );
}

/** Attendance — capture worker check-in/out and see who's available for work. */
export function LoaderAttendance() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [jobId, setJobId] = useState('');
  const { data: workers = [], isLoading } = useQuery<Worker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers() });
  const { data: jobs = [] } = useQuery<Job[]>({ queryKey: ['my-jobs-lc'], queryFn: () => api.loaders.myJobs() });
  const { data: rows = [] } = useQuery<ApiAttendance[]>({ queryKey: ['loader-attendance', today], queryFn: () => api.loaders.attendance(today) });

  const activeJobs = jobs.filter((j) => j.status !== 'completed');
  const openRowFor = (workerId: string) => rows.find((r) => r.worker?.id === workerId && !r.checkOutAt);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['loader-attendance', today] }); qc.invalidateQueries({ queryKey: ['workers'] }); };

  const checkin = useMutation({ mutationFn: (workerId: string) => api.loaders.attendanceCheckin(workerId, jobId), onSuccess: refresh });
  const checkout = useMutation({ mutationFn: (id: string) => api.loaders.attendanceCheckout(id), onSuccess: refresh });
  const setStatus = useMutation({ mutationFn: (v: { id: string; status: string }) => api.loaders.updateWorker(v.id, { status: v.status }), onSuccess: refresh });

  const counts = useMemo(() => ({
    on_site: workers.filter((w) => w.status === 'on_site').length,
    available: workers.filter((w) => w.status === 'available').length,
    off: workers.filter((w) => w.status === 'off').length,
  }), [workers]);

  return (
    <div className="space-y-5">
      <SectionHead title={t('console.nav.attendance')} sub={t('console.loaderco.attendanceSub')} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : workers.length === 0 ? (
        <EmptyHint icon="check" title={t('console.loaderco.noWorkersAttTitle')} body={t('console.loaderco.noWorkersAttBody')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([['on_site', t('console.loaderco.onSiteCount')], ['available', t('console.loaderco.availableForWork')], ['off', t('console.loaderco.offDuty')]] as const).map(([k, label]) => (
              <Card key={k}>
                <div className="text-xs text-ink-soft">{label}</div>
                <div className="mt-1 font-display text-2xl font-extrabold text-ink">{counts[k]}</div>
              </Card>
            ))}
          </div>

          <Card className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">{t('console.loaderco.checkAgainstJob')}</span>
              <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="h-10 rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf">
                <option value="">{t('console.loaderco.selectActiveJob')}</option>
                {activeJobs.map((j) => <option key={j.id} value={j.id}>#{j.reference} · {j.location}</option>)}
              </select>
            </label>
            <span className="text-xs text-ink-soft">{t('console.loaderco.pickJobHint')}</span>
          </Card>

          <Card padded={false}>
            <div className="divide-y divide-surface-border">
              {workers.map((w) => {
                const open = openRowFor(w.id);
                return (
                  <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-ink">{w.name}</span>
                      {w.skill && <span className="ms-1 text-xs text-ink-soft">· {w.skill}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={w.status === 'on_site' ? 'info' : w.status === 'available' ? 'green' : 'slate'}>{t(`console.dash.workerStatus.${w.status}`, { defaultValue: w.status.replace('_', ' ') })}</Badge>
                      {open ? (
                        <Button size="sm" variant="outline" disabled={checkout.isPending} onClick={() => checkout.mutate(open.id)}>{t('console.loaderco.checkOut')}</Button>
                      ) : (
                        <Button size="sm" variant="secondary" disabled={!jobId || checkin.isPending} onClick={() => checkin.mutate(w.id)}>{t('console.loaderco.checkIn')}</Button>
                      )}
                      <button
                        onClick={() => setStatus.mutate({ id: w.id, status: w.status === 'off' ? 'available' : 'off' })}
                        className="text-xs font-bold text-brand hover:underline"
                      >
                        {w.status === 'off' ? t('console.loaderco.markAvailable') : t('console.loaderco.markOff')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {rows.length > 0 && (
            <div>
              <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{t('console.loaderco.todaysLog')}</h3>
              <Card padded={false}>
                <div className="divide-y divide-surface-border">
                  {rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <span className="font-semibold text-ink">{r.worker?.name}</span>
                      <span className="text-xs text-ink-soft">
                        #{r.job?.reference} · {t('console.loaderco.inAt', { time: r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' })}
                        {' · '}{t('console.loaderco.outAt', { time: r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' })}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface WalletData {
  balanceCents: number;
  txns?: { id: string; amountCents: number; type: string; note: string | null; createdAt: string }[];
}

/** Earnings — payout balance, weekly team split and transactions. */
export function LoaderEarnings() {
  const { t } = useI18n();
  const { data: wallet } = useQuery<WalletData>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet() as Promise<WalletData> });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series() });
  const txns = wallet?.txns ?? [];

  return (
    <div className="space-y-6">
      <SectionHead title={t('console.nav.earnings')} sub={t('console.loaderco.earningsSub')} />
      <Card className="flex items-center gap-4 bg-brand-dock text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10"><Icon name="wallet" size={24} /></span>
        <div>
          <div className="text-xs text-mint/80">{t('console.money.availableBalance')}</div>
          <div className="font-display text-3xl font-extrabold">{usd(wallet?.balanceCents)}</div>
        </div>
      </Card>
      <BarChart title={t('console.money.earningsTrend')} caption={t('console.dash.perMonth')} data8={series?.data8} data12={series?.data12} />
      <div>
        <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{t('console.money.transactions')}</h3>
        {txns.length === 0 ? (
          <Card className="py-8 text-center text-ink-soft">{t('console.money.noTransactions')}</Card>
        ) : (
          <div className="space-y-2">
            {txns.map((tx) => (
              <Card key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-ink">{tx.note ?? t(`console.money.txType.${tx.type}`, { defaultValue: tx.type })}</div>
                  <div className="text-xs text-ink-soft">{new Date(tx.createdAt).toLocaleDateString()}</div>
                </div>
                <span className="font-numeric font-bold text-ink">{usd(tx.amountCents)}</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={13} className={i < n ? 'text-mango-deep' : 'text-surface-border'} />
      ))}
    </span>
  );
}

/** Reviews — real client feedback from completed jobs. */
export function LoaderReviews() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery<ApiLoaderReviews>({ queryKey: ['loader-reviews'], queryFn: () => api.loaders.reviews() });
  const list = data?.list ?? [];
  return (
    <div className="space-y-6">
      <SectionHead title={t('console.nav.reviews')} sub={t('console.loaderco.reviewsSub')} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : list.length === 0 ? (
        <EmptyHint icon="star" title={t('console.loaderco.noReviewsTitle')} body={t('console.loaderco.noReviewsBody')} />
      ) : (
        <>
          <Card className="flex items-center gap-4">
            <div className="font-display text-4xl font-extrabold text-ink">{(data?.avg ?? 0).toFixed(1)}</div>
            <div>
              <Stars n={Math.round(data?.avg ?? 0)} />
              <div className="mt-1 text-xs text-ink-soft">{t('console.loaderco.avgAcross', { count: data?.count ?? 0 })}</div>
            </div>
          </Card>
          <div className="space-y-3">
            {list.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">
                    {r.rater?.name ?? t('console.worker.clientFallback')}
                    {r.job?.reference ? <span className="text-ink-soft"> · #{r.job.reference}</span> : null}
                  </span>
                  <Stars n={r.stars} />
                </div>
                {r.text && <p className="mt-1 text-sm text-ink-soft">{r.text}</p>}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
