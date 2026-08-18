import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Icon, Input, SearchSelect } from '@agrotraders/ui';
import type { ApiHireTargetType } from '@agrotraders/api-client';
import {
  hireBlockForService,
  hireFieldsForService,
  isFieldVisible,
  type ServiceHireField,
} from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';
import { CityInput } from '../GeoInputs';

export interface HireTarget {
  targetType: ApiHireTargetType;
  targetUserId: string;
  workerId?: string;
  name: string;
}

const TITLE_KEY = {
  transporter: 'site.hireTransporter',
  loaderco: 'site.hireLoader',
  workerco: 'site.hireWorkerCo',
  worker: 'site.hireWorker',
  service_provider: 'site.hireService',
} as const;

const BLANK = { message: '', fromCity: '', toCity: '', cargo: '', location: '', workersNeeded: '1', neededDate: '', budget: '' };

/** Shared input chrome, so a `<select>` and a `<textarea>` sit level with `<Input>`. */
const FIELD_CLASS = 'w-full rounded-md border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-leaf';
/** Matches `<Input>`'s own label, so a spec-driven select sits level with one. */
const LABEL_CLASS = 'mb-1.5 block text-sm font-semibold text-ink';

type Answers = Record<string, string | string[]>;

/**
 * One question from the shared spec.
 *
 * Labels resolve block-first (`hireQ.<block>.<key>`) then generic — `location`
 * asks a different question in a processing hire ("where the goods are now")
 * than in a warehousing one ("warehouse city"), and one label for both is how
 * you get an enquiry pointed at the wrong city.
 */
function SpecField({
  field,
  block,
  value,
  onChange,
}: {
  field: ServiceHireField;
  block: string | null;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const { t } = useI18n();
  const label = t(`hireQ.${block}.${field.key}`, { defaultValue: t(`hireQ.${field.key}`) });
  // Units already have a translated catalog; every other option set is `hireQ.opt`.
  const optLabel = (o: string) =>
    field.key === 'qtyUnit'
      ? t(`enums:unit.${o}`, { defaultValue: o })
      : t(`hireQ.opt.${field.key}.${o}`, { defaultValue: o });
  const req = field.required ? ' *' : '';

  if (field.type === 'city') {
    return (
      <CityInput
        label={label + req}
        value={typeof value === 'string' ? value : ''}
        onChange={(v) => onChange(v)}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <label className="block">
        <span className={LABEL_CLASS}>{label + req}</span>
        <select className={FIELD_CLASS} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>{optLabel(o)}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'multiselect') {
    const picked = Array.isArray(value) ? value : [];
    return (
      <div>
        <span className={LABEL_CLASS}>{label + req}</span>
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).map((o) => {
            const on = picked.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(on ? picked.filter((x) => x !== o) : [...picked, o])}
                className={
                  'rounded-full border px-2.5 py-1 text-xs font-semibold transition ' +
                  (on ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft hover:border-brand-leaf')
                }
              >
                {optLabel(o)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className="block">
        <span className={LABEL_CLASS}>{label + req}</span>
        <textarea rows={3} className={FIELD_CLASS} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }

  return (
    <Input
      label={label + req}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Direct-hire form: per-target-type fields → POST /hires.
 *
 * A service-provider hire asks the question set for the service being bought
 * (`hireFieldsForService`) and asks NO budget: a service is quoted, not bid on,
 * and the public rate is an estimate the provider revises once they see the
 * real location and volume. Every other target type keeps the budget + escrow
 * flow it already had.
 *
 * Pass `orderId` to source logistics from inside one of the seller's orders —
 * on accept the minted Trip attaches back to it so dispatch/OTP keeps working.
 * Pass `initial` (from `orderLogistics(order)`) so the route and cargo arrive
 * filled in rather than being retyped per provider; the server applies the same
 * fallbacks, so these are editable, not load-bearing.
 */
export function HireModal({
  target,
  orderId,
  initial,
  onClose,
}: {
  target: HireTarget;
  orderId?: string;
  initial?: Partial<typeof BLANK>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ ...BLANK, ...initial });
  const [ans, setAns] = useState<Answers>({});
  const [serviceNodeId, setServiceNodeId] = useState('');
  const [missing, setMissing] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const isTransport = target.targetType === 'transporter';
  const isService = target.targetType === 'service_provider';

  // Only the leaves this provider actually prices — the enquiry names one of
  // those or none, never an arbitrary node from the taxonomy.
  const services = useQuery({
    queryKey: ['provider-services', target.targetUserId],
    queryFn: () => api.services.providerServices(target.targetUserId),
    enabled: isService,
  });
  const picked = services.data?.find((s) => s.serviceNodeId === serviceNodeId);
  const slug = picked?.serviceNode.slug ?? null;
  const block = hireBlockForService(slug);
  const fields = useMemo(() => (isService ? hireFieldsForService(slug) : []), [isService, slug]);
  const visible = fields.filter((x) => isFieldVisible(x, ans));

  const send = useMutation({
    mutationFn: () => {
      // `col` fields are real HireRequest columns; everything else is `details`.
      const cols: Record<string, string> = {};
      const details: Record<string, string | number | string[]> = {};
      for (const x of visible) {
        const v = ans[x.key];
        if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
        if (x.col) cols[x.key] = String(v);
        else details[x.key] = x.type === 'number' ? Number(v) : v;
      }
      return api.hires.create({
        targetType: target.targetType,
        targetUserId: target.targetUserId,
        workerId: target.workerId,
        ...(isService
          ? {
              serviceNodeId: serviceNodeId || undefined,
              details: Object.keys(details).length ? details : undefined,
              cargo: cols.cargo || undefined,
              location: cols.location || undefined,
              fromCity: cols.fromCity || undefined,
              toCity: cols.toCity || undefined,
              message: cols.message || undefined,
              neededDate: cols.neededDate ? new Date(cols.neededDate).toISOString() : undefined,
            }
          : {
              message: f.message || undefined,
              fromCity: f.fromCity || undefined,
              toCity: f.toCity || undefined,
              cargo: f.cargo || undefined,
              location: f.location || undefined,
              workersNeeded: Number(f.workersNeeded) || undefined,
              neededDate: f.neededDate ? new Date(f.neededDate).toISOString() : undefined,
              budgetCents: f.budget ? Math.round(Number(f.budget) * 100) : undefined,
            }),
        orderId,
      });
    },
    onSuccess: (h) => setDone(h.reference),
  });

  const submit = () => {
    const gap = visible.find((x) => {
      if (!x.required) return false;
      const v = ans[x.key];
      return v === undefined || v === '' || (Array.isArray(v) && !v.length);
    });
    if (gap) {
      setMissing(t('hireQ.requiredMissing', { label: t(`hireQ.${block}.${gap.key}`, { defaultValue: t(`hireQ.${gap.key}`) }) }));
      return;
    }
    setMissing(null);
    send.mutate();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-ink">{t(TITLE_KEY[target.targetType])}</h3>
          <button onClick={onClose} className="rounded p-1 text-ink-soft hover:bg-brand-surface">
            <Icon name="x" size={18} />
          </button>
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">{t('site.hireIntro', { name: target.name })}</p>

        {done ? (
          <div className="mt-6 rounded-lg bg-brand-surface p-5 text-center">
            <div className="text-3xl">✅</div>
            <div className="mt-2 font-display font-bold text-ink">{t('site.requestSent', { ref: done })}</div>
            <p className="mt-1 text-sm text-ink-soft">{t('site.trackHires')}</p>
            <Button className="mt-4" fullWidth onClick={onClose}>{t('site.done')}</Button>
          </div>
        ) : !user ? (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-ink-soft">{t('site.signInHire')}</p>
            <Button fullWidth onClick={() => navigate('/login')}>{t('common:signIn')}</Button>
          </div>
        ) : isService ? (
          <div className="mt-4 space-y-3">
            {/* No budget field: a service is quoted, not bid on. */}
            <p className="rounded-lg bg-brand-surface px-3 py-2 text-xs leading-relaxed text-ink-soft">
              {t('hireQ.estimateNote')}
            </p>
            {services.data?.length ? (
              <SearchSelect
                label={t('hireQ.service')}
                placeholder={t('hireQ.servicePick')}
                value={serviceNodeId}
                onChange={setServiceNodeId}
                options={services.data.map((s) => ({
                  value: s.serviceNodeId,
                  label: s.serviceNode.name ?? s.serviceNode.nameEn,
                }))}
              />
            ) : services.isLoading ? null : (
              <p className="text-xs text-ink-soft">{t('hireQ.noServices')}</p>
            )}
            {visible.map((x) => (
              <SpecField
                key={x.key}
                field={x}
                block={block}
                value={ans[x.key]}
                onChange={(v) => setAns((p) => ({ ...p, [x.key]: v }))}
              />
            ))}
            {(missing || send.isError) && (
              <p className="text-xs font-semibold text-status-error">
                {missing ?? (send.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('site.sendError')}
              </p>
            )}
            <Button fullWidth disabled={send.isPending} onClick={submit} leftIcon={<Icon name="check" size={16} />}>
              {send.isPending ? t('site.sending') : t('site.sendRequest')}
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {isTransport ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {/* No country on a hire — the pickers search every country. */}
                  <CityInput label={t('site.from')} placeholder={t('site.ph.fromCity')} value={f.fromCity} onChange={(fromCity) => setF((p) => ({ ...p, fromCity }))} />
                  <CityInput label={t('site.to')} placeholder={t('site.ph.toCity')} value={f.toCity} onChange={(toCity) => setF((p) => ({ ...p, toCity }))} />
                </div>
                <Input label={t('site.cargo')} placeholder={t('site.ph.cargoQty')} value={f.cargo} onChange={set('cargo')} />
              </>
            ) : (
              <>
                <Input label={t('site.location')} placeholder={t('site.ph.location')} value={f.location} onChange={set('location')} />
                {(target.targetType === 'loaderco' || target.targetType === 'workerco') && (
                  <Input label={t('site.workersNeeded')} type="number" value={f.workersNeeded} onChange={set('workersNeeded')} />
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('site.neededBy')} type="date" value={f.neededDate} onChange={set('neededDate')} />
              <Input label={t('site.budget')} type="number" placeholder="4200" value={f.budget} onChange={set('budget')} />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('site.message')}</span>
              <textarea
                value={f.message}
                onChange={set('message')}
                rows={3}
                placeholder={t('site.describeJob')}
                className={FIELD_CLASS}
              />
            </label>
            {send.isError && (
              <p className="text-xs font-semibold text-status-error">
                {(send.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('site.sendError')}
              </p>
            )}
            <Button fullWidth disabled={send.isPending} onClick={() => send.mutate()} leftIcon={<Icon name="check" size={16} />}>
              {send.isPending ? t('site.sending') : t('site.sendRequest')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
