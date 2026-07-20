import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Icon, Input } from '@agrotraders/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';

export interface HireTarget {
  targetType: 'transporter' | 'loaderco' | 'worker';
  targetUserId: string;
  workerId?: string;
  name: string;
}

const TITLE_KEY = {
  transporter: 'site.hireTransporter',
  loaderco: 'site.hireLoader',
  worker: 'site.hireWorker',
} as const;

/**
 * Direct-hire form: per-target-type fields → POST /hires.
 * Pass `orderId` to source logistics from inside one of the seller's orders —
 * the server prefills cargo from the order and, on accept, attaches the minted
 * Trip back to it so dispatch/OTP keeps working.
 */
export function HireModal({ target, orderId, onClose }: { target: HireTarget; orderId?: string; onClose: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ message: '', fromCity: '', toCity: '', cargo: '', location: '', workersNeeded: '1', neededDate: '', budget: '' });
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const send = useMutation({
    mutationFn: () =>
      api.hires.create({
        targetType: target.targetType,
        targetUserId: target.targetUserId,
        workerId: target.workerId,
        message: f.message || undefined,
        fromCity: f.fromCity || undefined,
        toCity: f.toCity || undefined,
        cargo: f.cargo || undefined,
        location: f.location || undefined,
        workersNeeded: Number(f.workersNeeded) || undefined,
        neededDate: f.neededDate ? new Date(f.neededDate).toISOString() : undefined,
        budgetCents: f.budget ? Math.round(Number(f.budget) * 100) : undefined,
        orderId,
      }),
    onSuccess: (h) => setDone(h.reference),
  });

  const isTransport = target.targetType === 'transporter';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
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
        ) : (
          <div className="mt-4 space-y-3">
            {isTransport ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Input label={t('site.from')} placeholder={t('site.ph.fromCity')} value={f.fromCity} onChange={set('fromCity')} />
                  <Input label={t('site.to')} placeholder={t('site.ph.toCity')} value={f.toCity} onChange={set('toCity')} />
                </div>
                <Input label={t('site.cargo')} placeholder={t('site.ph.cargoQty')} value={f.cargo} onChange={set('cargo')} />
              </>
            ) : (
              <>
                <Input label={t('site.location')} placeholder={t('site.ph.location')} value={f.location} onChange={set('location')} />
                {target.targetType === 'loaderco' && (
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
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-leaf"
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
