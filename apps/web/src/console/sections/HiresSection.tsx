import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal } from '@agrotraders/ui';
import type { ApiHireRequest } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';
import { chatBus } from '../../chat/chatBus';

const STATUS_TONE: Record<string, 'green' | 'mango' | 'slate' | 'error'> = {
  pending: 'mango',
  accepted: 'green',
  declined: 'error',
  cancelled: 'slate',
};

function HireRow({ h, incoming, onAction, onRate }: { h: ApiHireRequest; incoming: boolean; onAction: () => void; onRate?: (loaderJobId: string) => void }) {
  const { t } = useI18n();
  const other = incoming ? h.requester : h.targetUser;
  const detail = [h.cargo, h.fromCity && h.toCity ? `${h.fromCity} → ${h.toCity}` : null, h.location, h.workersNeeded ? t('console.hires.workersN', { count: h.workersNeeded }) : null]
    .filter(Boolean)
    .join(' · ');
  // Before accepting, the provider needs to vet and reach the counterparty.
  const contactEmail = other?.email ?? other?.profile?.contactEmail;
  const phone = other?.profile?.phone ?? other?.profile?.whatsapp;
  const contact = [other?.country, contactEmail, phone].filter(Boolean).join(' · ');

  const act = async (fn: () => Promise<unknown>) => {
    await fn();
    onAction();
  };

  return (
    <Card className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-numeric text-xs font-bold text-ink-soft">{h.reference}</span>
          <Badge tone={STATUS_TONE[h.status] ?? 'slate'}>{t(`enums:hire_status.${h.status}`, { defaultValue: h.status })}</Badge>
          <Badge tone="slate">{t(`enums:hire_target.${h.targetType}`, { defaultValue: h.targetType })}</Badge>
          {other?.kycStatus === 'verified' && <Badge tone="green" icon={<Icon name="shield" size={11} />}>{t('console.hires.kyc')}</Badge>}
          {h.order && <Badge tone="info">{t('console.hires.orderRef', { ref: h.order.reference })}</Badge>}
        </div>
        <div className="mt-1 font-display font-bold text-ink">
          {incoming ? t('console.hires.fromName', { name: other?.name ?? '—' }) : `${t('console.hires.toName', { name: other?.name ?? '—' })}${h.worker ? ` (${h.worker.name})` : ''}`}
        </div>
        {contact && <div className="text-xs text-ink-soft">{contact}</div>}
        {detail && <div className="text-sm text-ink-soft">{detail}</div>}
        {h.order?.product?.name && (
          <div className="mt-0.5 text-xs text-ink-soft">{t('console.hires.orderGoods', { name: h.order.product.name })}{h.order.amount ? ` · ${h.order.amount}` : ''}</div>
        )}
        {h.message && <div className="mt-1 text-xs italic text-ink-soft">“{h.message}”</div>}
        {h.budgetCents != null && <div className="mt-1 text-xs font-bold text-brand-dark">{t('console.hires.budget', { amount: `$${(h.budgetCents / 100).toLocaleString()}` })}</div>}
      </div>
      <div className="flex shrink-0 gap-2">
        {other && (
          <Button size="sm" variant="outline" leftIcon={<Icon name="message" size={14} />} onClick={() => chatBus.openCommunityDm(other.id, other.name)}>
            {t('console.hires.message')}
          </Button>
        )}
        {incoming && h.status === 'pending' && (
          <>
            <Button size="sm" leftIcon={<Icon name="check" size={14} />} onClick={() => act(() => api.hires.accept(h.id))}>
              {t('console.hires.accept')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => act(() => api.hires.decline(h.id))}>
              {t('console.hires.decline')}
            </Button>
          </>
        )}
        {!incoming && h.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => act(() => api.hires.cancel(h.id))}>
            {t('common:cancel')}
          </Button>
        )}
        {h.status === 'accepted' && (
          <Badge tone="green" icon={<Icon name="check" size={11} />}>
            {h.transportRequestId ? t('console.hires.tripCreated') : h.loaderJobId ? t('console.hires.jobCreated') : t('console.hires.accepted')}
          </Badge>
        )}
        {!incoming && h.status === 'accepted' && h.targetType === 'loaderco' && h.loaderJobId && onRate && (
          <Button size="sm" variant="outline" leftIcon={<Icon name="star" size={13} />} onClick={() => onRate(h.loaderJobId!)}>
            {t('console.hires.rate')}
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * Console "Hires" section. Providers (transporter / loaderco / worker) see
 * incoming requests with accept/decline; everyone sees the requests they sent.
 */
type TargetFilter = 'all' | 'transporter' | 'loaderco' | 'worker';
const FILTERS: { id: TargetFilter; label: string }[] = [
  { id: 'all', label: 'filterAll' },
  { id: 'transporter', label: 'filterTransport' },
  { id: 'loaderco', label: 'filterLoaders' },
  { id: 'worker', label: 'filterWorkers' },
];

export function HiresSection() {
  const { t } = useI18n();
  const { roles } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<TargetFilter>('all');
  const isProvider = roles.some((r) => ['transporter', 'loaderco', 'worker'].includes(r));

  const incoming = useQuery({
    queryKey: ['hires-incoming'],
    queryFn: () => api.hires.incoming(),
    enabled: isProvider,
  });
  // The server filters `mine` by target type, so the key carries the filter.
  const sent = useQuery({
    queryKey: ['hires-sent', filter],
    queryFn: () => api.hires.mine(filter === 'all' ? undefined : { targetType: filter }),
  });

  const [rateJobId, setRateJobId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['hires-incoming'] });
    qc.invalidateQueries({ queryKey: ['hires-sent'] });
  };

  return (
    <div>
      <h2 className="mb-5 font-display text-2xl font-extrabold text-ink">{t('console.nav.hires')}</h2>

      {isProvider && (
        <>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('console.hires.incomingRequests')}</p>
          <div className="mb-6 space-y-2">
            {(incoming.data ?? []).map((h) => (
              <HireRow key={h.id} h={h} incoming onAction={refresh} />
            ))}
            {(incoming.data ?? []).length === 0 && (
              <Card className="py-8 text-center text-sm text-ink-soft">{t('console.hires.noIncoming')}</Card>
            )}
          </div>
        </>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('console.hires.requestsSent')}</p>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={
                'rounded-full border px-3 py-1 text-xs font-semibold ' +
                (filter === f.id ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft')
              }
            >
              {t(`console.hires.${f.label}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {(sent.data ?? []).map((h) => (
          <HireRow key={h.id} h={h} incoming={false} onAction={refresh} onRate={setRateJobId} />
        ))}
        {(sent.data ?? []).length === 0 && (
          <Card className="py-8 text-center text-sm text-ink-soft">
            {filter === 'all' ? t('console.hires.noHiresAll') : t('console.hires.noHiresType')}
          </Card>
        )}
      </div>

      {rateJobId && <RateLoaderModal loaderJobId={rateJobId} onClose={() => setRateJobId(null)} />}
    </div>
  );
}

/** Rate the loader company after a job you hired for is completed. */
function RateLoaderModal({ loaderJobId, onClose }: { loaderJobId: string; onClose: () => void }) {
  const { t } = useI18n();
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const submit = useMutation({
    mutationFn: () => api.loaders.reviewJob(loaderJobId, { stars, text: text.trim() || undefined }),
    onSuccess: onClose,
  });
  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={t('console.hires.rateLoader')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button>
        <Button disabled={submit.isPending} onClick={() => submit.mutate()}>{t('console.hires.submitReview')}</Button></>}>
      <div className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} aria-label={t('console.hires.starsAria', { count: n })}>
              <Icon name="star" size={26} className={n <= stars ? 'text-mango-deep' : 'text-surface-border'} />
            </button>
          ))}
        </div>
        <Input label={t('console.hires.commentOptional')} placeholder={t('console.hires.phComment')} value={text} onChange={(e) => setText(e.target.value)} />
        {submit.isError && <p className="text-xs text-status-error">{t('console.hires.rateError')}</p>}
      </div>
    </Modal>
  );
}
