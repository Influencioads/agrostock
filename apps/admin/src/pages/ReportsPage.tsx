import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Stat, Icon } from '@agrotraders/ui';
import { PageHeader, BarChart } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Localized short month name; falls back to English if ICU data is unavailable. */
function monthLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  } catch {
    return MONTHS_EN[d.getMonth()];
  }
}

function toPoints(series: number[] | undefined, locale: string): { m: string; v: number }[] {
  const data = series ?? [];
  const now = new Date();
  return data.map((v, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (data.length - 1 - i), 1);
    return { m: monthLabel(d, locale), v };
  });
}

function presetRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { from: iso(d), to: iso(now) };
  }
  if (preset === 'quarter') {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    return { from: iso(d), to: iso(now) };
  }
  if (preset === 'year') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return { from: iso(d), to: iso(now) };
  }
  return {};
}

const usd = (cents: number) => '$' + (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

export function ReportsPage() {
  const { t, lang } = useI18n();
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const { data: reports } = useQuery({ queryKey: ['admin-reports', range], queryFn: () => api.admin.reports(range), retry: 1 });

  const volumePoints = toPoints(reports?.volumeSeries, lang);
  const growthPoints = toPoints(reports?.growthSeries, lang);
  const hasVolume = volumePoints.some((p) => p.v > 0);
  const hasGrowth = growthPoints.some((p) => p.v > 0);

  const cards = [
    { label: t('reports.stats.newUsers'), value: (reports?.kpis.newUsers ?? 0).toLocaleString(), icon: 'user' as const },
    { label: t('reports.stats.orders'), value: (reports?.kpis.orders ?? 0).toLocaleString(), icon: 'box' as const },
    { label: t('reports.stats.gmv'), value: usd(reports?.kpis.gmvCents ?? 0), icon: 'wallet' as const },
    { label: t('reports.stats.escrowReleased'), value: usd(reports?.kpis.escrowReleasedCents ?? 0), icon: 'shield' as const },
  ];

  function exportCsv() {
    const rows = [
      ['metric', 'value'],
      ['newUsers', String(reports?.kpis.newUsers ?? 0)],
      ['orders', String(reports?.kpis.orders ?? 0)],
      ['gmvCents', String(reports?.kpis.gmvCents ?? 0)],
      ['escrowReleasedCents', String(reports?.kpis.escrowReleasedCents ?? 0)],
      ...Object.entries(reports?.usersByRole ?? {}).map(([k, v]) => [`users_${k}`, String(v)]),
      ...Object.entries(reports?.ordersByStatus ?? {}).map(([k, v]) => [`orders_${k}`, String(v)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title={t('page.reports.title')}
        subtitle={t('page.reports.subtitle')}
        action={<Badge tone={reports ? 'green' : 'warn'}>{reports ? t('apiBadge.live') : t('apiBadge.connecting')}</Badge>}
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          {['month', 'quarter', 'year', 'all'].map((p) => (
            <button key={p} onClick={() => setRange(presetRange(p))} className="rounded-full bg-brand-surface px-3 py-1 text-xs font-semibold capitalize text-ink-soft hover:text-ink">
              {p === 'all' ? t('range.allTime') : t(`reports.preset.${p}`)}
            </button>
          ))}
        </div>
        <label className="text-xs text-ink-soft">
          {t('range.from')}
          <input type="date" value={range.from ?? ''} onChange={(e) => setRange({ ...range, from: e.target.value || undefined })} className="ms-2 h-8 rounded-md border border-surface-border px-2 text-sm" />
        </label>
        <label className="text-xs text-ink-soft">
          {t('range.to')}
          <input type="date" value={range.to ?? ''} onChange={(e) => setRange({ ...range, to: e.target.value || undefined })} className="ms-2 h-8 rounded-md border border-surface-border px-2 text-sm" />
        </label>
        <button onClick={exportCsv} className="ms-auto rounded-md border border-surface-border px-3 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
          {t('reports.exportCsv')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Stat key={c.label} className="h-full" label={c.label} value={c.value} icon={<Icon name={c.icon} size={18} />} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">{t('reports.orderVolume')}</h3>
            <Badge tone="slate">{t('reports.months12')}</Badge>
          </div>
          <p className="text-xs text-ink-soft">{t('reports.perMonthSettled')}</p>
          <div className="mt-4">{hasVolume ? <BarChart data={volumePoints} /> : <div className="flex h-40 items-center justify-center text-sm text-ink-soft">{t('reports.noSettled')}</div>}</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">{t('reports.userGrowth')}</h3>
            <Badge tone="slate">{t('reports.months12')}</Badge>
          </div>
          <p className="text-xs text-ink-soft">{t('reports.signupsPerMonth')}</p>
          <div className="mt-4">{hasGrowth ? <BarChart data={growthPoints} /> : <div className="flex h-40 items-center justify-center text-sm text-ink-soft">{t('reports.noSignups')}</div>}</div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-display font-bold text-ink">{t('reports.usersByRole')}</h3>
          <div className="space-y-1.5 text-sm">
            {Object.entries(reports?.usersByRole ?? {}).map(([role, count]) => (
              <div key={role} className="flex justify-between">
                <span className="capitalize text-ink-soft">{t(`enums:role.${role}`, { defaultValue: role })}</span>
                <span className="font-semibold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 font-display font-bold text-ink">{t('reports.ordersByStatus')}</h3>
          <div className="space-y-1.5 text-sm">
            {Object.entries(reports?.ordersByStatus ?? {}).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="capitalize text-ink-soft">{t(`enums:order_status.${status}`, { defaultValue: status })}</span>
                <span className="font-semibold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
