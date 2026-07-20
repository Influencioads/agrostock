import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Modal } from '@agrotraders/ui';
import type { ApiHireRequest, ApiOrder } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { HireModal, type HireTarget } from '../../components/site/HireModal';

type Tab = 'transporter' | 'loaderco' | 'worker';

// label/empty index `console.hires.*`; translated at render.
const TAB_COPY: Record<Tab, { label: string; empty: string }> = {
  transporter: { label: 'tabTransporters', empty: 'emptyTransporters' },
  loaderco: { label: 'tabLoaders', empty: 'emptyLoaders' },
  worker: { label: 'tabWorkers', empty: 'emptyWorkers' },
};

const statusTone = { pending: 'warn', accepted: 'green', declined: 'error', cancelled: 'slate' } as const;

/** One directory row, regardless of whether it came from workers or companies. */
interface ProviderRow {
  id: string;
  /** The User id to address the hire to. Absent for an unlinked worker record. */
  userId?: string;
  name: string;
  detail: string;
  workerId?: string;
}

/**
 * "Arrange logistics" for one order: hire a transporter, a loading company, or
 * individual workers. Every hire is stamped with this order's id, so once a
 * transporter accepts, the minted Trip attaches to the order and the existing
 * dispatch / pickup-OTP / delivery-OTP flow takes over unchanged.
 */
export function ArrangeLogisticsModal({ order, onClose }: { order: ApiOrder; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('transporter');
  const [hiring, setHiring] = useState<HireTarget | null>(null);

  // Hires already raised against this order — the seller shouldn't double-book.
  const { data: hires = [] } = useQuery<ApiHireRequest[]>({
    queryKey: ['order-hires', order.id],
    queryFn: () => api.hires.mine({ orderId: order.id }),
    refetchInterval: 15000,
  });

  // Workers come back in a different shape to sellers/transporters/loadercos,
  // so both are normalised to one row before rendering.
  const { data: providers = [], isLoading } = useQuery<ProviderRow[]>({
    queryKey: ['directory', tab],
    queryFn: async () => {
      if (tab === 'worker') {
        const workers = await api.directory.workers();
        return workers.map((w) => ({
          id: w.id,
          userId: w.user?.id,
          name: w.name,
          detail: `${w.rating ?? '—'} ★ · ${t(`console.dash.workerStatus.${w.status}`, { defaultValue: w.status })}`,
          workerId: w.id,
        }));
      }
      const list = tab === 'transporter' ? await api.directory.transporters() : await api.directory.loaders();
      return list.map((d) => ({
        id: d.id,
        userId: d.id,
        name: d.name,
        detail: [d.country, d.kycStatus].filter(Boolean).join(' · '),
      }));
    },
  });

  const alreadyHired = new Set(hires.filter((h) => h.status !== 'declined' && h.status !== 'cancelled').map((h) => h.targetUser?.id));
  const acceptedTransporter = hires.find((h) => h.targetType === 'transporter' && h.status === 'accepted');

  return (
    <>
      <Modal closeLabel={t('common:close')} open onClose={onClose} title={t('console.hires.arrangeTitle', { ref: order.reference })} className="max-w-2xl">
        <div className="space-y-5">
          {hires.length > 0 && (
            <section>
              <h4 className="mb-2 font-display font-bold text-ink">{t('console.hires.hiresForOrder')}</h4>
              <div className="space-y-2">
                {hires.map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{h.targetUser?.name ?? t('console.hires.providerFallback')}</div>
                      <div className="text-xs text-ink-soft">
                        #{h.reference} · {t(`enums:hire_target.${h.targetType}`, { defaultValue: h.targetType })}
                        {h.fromCity && h.toCity ? ` · ${h.fromCity} → ${h.toCity}` : ''}
                      </div>
                    </div>
                    <Badge tone={statusTone[h.status]}>{t(`enums:hire_status.${h.status}`, { defaultValue: h.status })}</Badge>
                  </div>
                ))}
              </div>
              {acceptedTransporter && (
                <p className="mt-2 rounded-lg bg-brand-surface px-3 py-2 text-xs text-ink-soft">{t('console.hires.acceptedNote', { name: acceptedTransporter.targetUser?.name })}</p>
              )}
            </section>
          )}

          <section>
            <div className="mb-3 flex gap-2">
              {(Object.keys(TAB_COPY) as Tab[]).map((tb) => (
                <button
                  key={tb}
                  onClick={() => setTab(tb)}
                  className={
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ' +
                    (tab === tb ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft')
                  }
                >
                  {t(`console.hires.${TAB_COPY[tb].label}`)}
                </button>
              ))}
            </div>

            {isLoading ? (
              <p className="py-6 text-center text-ink-soft">{t('common:loading')}</p>
            ) : providers.length === 0 ? (
              <p className="py-6 text-center text-ink-soft">{t(`console.hires.${TAB_COPY[tab].empty}`)}</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {providers.map((p) => {
                  const hired = !!p.userId && alreadyHired.has(p.userId);
                  return (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink">{p.name}</div>
                        <div className="text-xs text-ink-soft">{p.detail}</div>
                      </div>
                      {hired ? (
                        <Badge tone="slate">{t('console.hires.requested')}</Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!p.userId}
                          onClick={() => setHiring({ targetType: tab, targetUserId: p.userId!, workerId: p.workerId, name: p.name })}
                        >
                          {t('console.hires.hire')}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </Modal>

      {hiring && (
        <HireModal
          target={hiring}
          orderId={order.id}
          onClose={() => {
            setHiring(null);
            qc.invalidateQueries({ queryKey: ['order-hires', order.id] });
            qc.invalidateQueries({ queryKey: ['my-hires'] });
          }}
        />
      )}
    </>
  );
}
