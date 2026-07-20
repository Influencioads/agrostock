import type { ReactNode } from 'react';
import { Button, Icon, motion, useReducedMotion } from '@agrotraders/ui';
import { useI18n } from '../i18n';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function BarChart({ data, unit, height = 160 }: { data: { m: string; v: number }[]; unit?: string; height?: number }) {
  const reduce = useReducedMotion();
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div>
      {unit && <p className="mb-2 text-xs text-ink-soft">{unit}</p>}
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const last = i === data.length - 1;
          const barH = Math.round((d.v / max) * (height - 24));
          return (
            <div key={d.m} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <motion.div
                className={'w-full rounded-t-md ' + (last ? 'bg-mango-gradient' : 'bg-gradient-to-b from-brand-leaf to-brand-dark')}
                style={{ height: barH }}
                title={`${d.m}: ${d.v}`}
                initial={reduce ? false : { height: 0 }}
                whileInView={reduce ? undefined : { height: barH }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
              />
              <span className="text-[11px] text-ink-soft">{d.m}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Placeholder({ title, icon = 'palette' as const }: { title: string; icon?: Parameters<typeof Icon>[0]['name'] }) {
  const { t } = useI18n();
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface text-brand-dark">
        <Icon name={icon} size={30} />
      </span>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-ink-soft">{t('placeholder.body')}</p>
      <Button variant="outline" className="mt-4">
        {t('placeholder.docs')}
      </Button>
    </div>
  );
}
