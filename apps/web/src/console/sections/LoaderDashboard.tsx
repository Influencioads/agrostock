import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Icon, Stat, Stagger, StaggerItem } from '@agrotraders/ui';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { compactUsd } from '../lib';
import { BarChart } from './BarChart';

interface Job { id: string; reference: string; location: string; workersNeeded: number; status: string }
interface Worker { id: string; name: string; status: string }

const ACTIVE_JOB = ['assigned', 'in_progress', 'pending_proof'];
const jobTone: Record<string, 'slate' | 'warn' | 'info' | 'green'> = {
  open: 'slate', assigned: 'info', in_progress: 'warn', pending_proof: 'warn', completed: 'green',
};
// `key` indexes `console.dash.weekday.<key>`; the rendered label is translated.
const AVAIL_DAYS = [
  { n: 1, key: 'mon' }, { n: 2, key: 'tue' }, { n: 3, key: 'wed' },
  { n: 4, key: 'thu' }, { n: 5, key: 'fri' }, { n: 6, key: 'sat' },
];
const AVAIL_SLOTS = ['morning', 'afternoon', 'evening'];

export function LoaderDashboard({ name, onNavigate }: { name: string; onNavigate: (id: string) => void }) {
  const { t } = useI18n();
  const { data: mine = [] } = useQuery<Job[]>({ queryKey: ['my-jobs-lc'], queryFn: () => api.loaders.myJobs() as Promise<Job[]> });
  const { data: open = [] } = useQuery<Job[]>({ queryKey: ['open-jobs'], queryFn: () => api.loaders.openJobs() as Promise<Job[]> });
  const { data: workers = [] } = useQuery<Worker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers() as Promise<Worker[]> });
  const { data: wallet } = useQuery<{ balanceCents: number }>({ queryKey: ['me-wallet'], queryFn: () => api.me.wallet() as Promise<{ balanceCents: number }> });
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series() });
  const { data: availRows = [] } = useQuery({ queryKey: ['loader-availability'], queryFn: () => api.loaders.availability() });
  const availOn = (weekday: number, slot: string) => availRows.some((r) => r.weekday === weekday && r.slot === slot && r.available);

  const activeJobs = mine.filter((j) => ACTIVE_JOB.includes(j.status));
  const onSite = workers.filter((w) => w.status === 'on_site').length;
  const totalWorkers = workers.length || 48;
  const crewStatus = ['available', 'on_site', 'off'].map((s) => ({ status: s, count: workers.filter((w) => w.status === s).length }));
  const maxCrew = Math.max(1, ...crewStatus.map((c) => c.count));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.dash.welcome', { name: name.split(' ')[0] })}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('console.dash.loaderSub')}</p>
      </div>

      {/* KPI row */}
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StaggerItem><Stat className="h-full" icon={<Icon name="worker" size={18} />} value={String(activeJobs.length)} label={t('console.dash.activeJobs')} delta={`+${activeJobs.length}`} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="box" size={18} />} value={String(open.length)} label={t('console.dash.jobRequests')} delta={t('console.dash.new')} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="gauge" size={18} />} value={String(onSite)} label={t('console.dash.workersOnsite')} delta={`/${totalWorkers}`} up /></StaggerItem>
        <StaggerItem><Stat className="h-full" icon={<Icon name="wallet" size={18} />} value={compactUsd((wallet?.balanceCents ?? 0) / 100)} label={t('console.dash.thisMonth')} delta="+11%" up /></StaggerItem>
      </Stagger>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* earnings chart */}
        <BarChart title={t('console.dash.earningsTitle')} caption={t('console.dash.perMonth')} className="lg:col-span-2" data8={series?.data8} data12={series?.data12} />

        {/* crew availability (read-only snapshot; edit in the Availability section) */}
        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.crewAvailability')}</h3>
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[280px]">
              <div className="mb-1.5 grid grid-cols-[72px_repeat(6,1fr)] items-center gap-1.5 text-center text-[11px] font-bold text-ink-soft">
                <span />
                {AVAIL_DAYS.map((d) => <span key={d.n}>{t(`console.dash.weekday.${d.key}`)}</span>)}
              </div>
              {AVAIL_SLOTS.map((slot) => (
                <div key={slot} className="mb-1.5 grid grid-cols-[72px_repeat(6,1fr)] items-center gap-1.5">
                  <span className="text-xs font-semibold text-ink">{t(`console.dash.slot.${slot}`)}</span>
                  {AVAIL_DAYS.map((d) => (
                    <div
                      key={d.n}
                      title={`${t(`console.dash.slot.${slot}`)} · ${t(`console.dash.weekday.${d.key}`)}`}
                      className={'h-6 rounded-md ' + (availOn(d.n, slot) ? 'bg-brand-leaf' : 'bg-surface-bg')}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => onNavigate('availability')} className="mt-3 text-[11px] font-bold text-brand hover:underline">{t('console.dash.editAvailability')}</button>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* active jobs */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.activeJobs')}</h3>
            <button onClick={() => onNavigate('activejobs')} className="text-sm font-bold text-brand hover:underline">
              {t('common:viewAll')}
            </button>
          </div>
          <div className="mt-4 divide-y divide-surface-border">
            {activeJobs.slice(0, 5).map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-surface text-brand-dark">
                    <Icon name="worker" size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{j.location}</div>
                    <div className="truncate text-xs text-ink-soft">#{j.reference} · {t('console.dash.workersCount', { count: j.workersNeeded })}</div>
                  </div>
                </div>
                <Badge tone={jobTone[j.status] ?? 'slate'}>{t(`console.dash.jobStatus.${j.status}`, { defaultValue: j.status.replace('_', ' ') })}</Badge>
              </div>
            ))}
            {activeJobs.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">{t('console.dash.noActiveJobs')}</p>}
          </div>
        </Card>

        {/* crew status */}
        <Card>
          <h3 className="font-display text-lg font-bold text-ink">{t('console.dash.crewStatusTitle')}</h3>
          <div className="mt-4 space-y-4">
            {workers.length === 0 && <p className="py-4 text-center text-sm text-ink-soft">{t('console.dash.noWorkers')}</p>}
            {crewStatus.map((c) => (
              <div key={c.status}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t(`console.dash.workerStatus.${c.status}`, { defaultValue: c.status.replace('_', ' ') })}</span>
                  <span className="text-xs text-ink-soft">{t('console.dash.workersCount', { count: c.count })}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(c.count / maxCrew) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
