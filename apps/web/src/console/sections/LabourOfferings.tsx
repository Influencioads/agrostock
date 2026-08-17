import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Input } from '@agrotraders/ui';
import {
  LABOUR_ON_REQUEST,
  LABOUR_RATE_BASES,
  WORKER_TYPE_GROUPS,
  type ApiWorkerOffering,
  type ApiWorkerType,
  type LabourRateBasis,
  type WorkerTypeGroup,
} from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';

/**
 * "What kinds of worker do you supply, and what do you charge?"
 *
 * One screen for BOTH a loading company and an independent worker — they differ
 * only in `headcount` (a company fields thirty loaders, a person fields one), so
 * two copies of this would be two places to fix the same bug. Publishing here is
 * what puts either of them in the public directory; the company's actual crew
 * roster stays private and is managed on the Workers section.
 */

const BLANK = { rateBasis: 'per_hour' as LabourRateBasis, rateMin: '', rateMax: '', headcount: '', minHours: '', notes: '', isNegotiable: false };

export function LabourOfferings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const myRoles = [user?.role, ...(user?.roles ?? [])];
  const isCompany = myRoles.includes('loaderco') || myRoles.includes('workerco');

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Scoped to what this account may actually supply — a loading company's
  // picker must not offer packing types the write path would then refuse.
  const { data: types = [] } = useQuery<ApiWorkerType[]>({
    queryKey: ['labour-available-types'],
    queryFn: () => api.labour.availableTypes(),
  });
  const { data: mine = [], isLoading } = useQuery<ApiWorkerOffering[]>({
    queryKey: ['labour-mine'],
    queryFn: () => api.labour.mine(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['labour-mine'] });
    qc.invalidateQueries({ queryKey: ['labour-types'] });
  };

  /** Minor units, or undefined for a blank field — never 0, which is a real rate. */
  const cents = (v: string) => (v.trim() === '' ? undefined : Math.round(Number(v) * 100));
  const int = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const body = () => ({
    rateBasis: form.rateBasis,
    rateMinCents: form.rateBasis === LABOUR_ON_REQUEST ? undefined : cents(form.rateMin),
    rateMaxCents: form.rateBasis === LABOUR_ON_REQUEST ? undefined : cents(form.rateMax),
    headcount: int(form.headcount),
    minHours: int(form.minHours),
    notes: form.notes || undefined,
    isNegotiable: form.isNegotiable,
  });

  const save = useMutation({
    mutationFn: (id: string) => api.labour.update(id, body()),
    onSuccess: () => { setEditing(null); setForm(BLANK); invalidate(); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.labour.remove(id),
    onSuccess: invalidate,
  });
  const bulk = useMutation({
    mutationFn: () => api.labour.bulkAdd({ workerTypeIds: [...picked], ...body() }),
    onSuccess: () => { setPicked(new Set()); setForm(BLANK); invalidate(); },
  });

  const priced = useMemo(() => new Set(mine.map((o) => o.workerTypeId)), [mine]);
  const byGroup = useMemo(() => {
    const map = new Map<WorkerTypeGroup, ApiWorkerType[]>();
    for (const type of types) {
      if (!map.has(type.group)) map.set(type.group, []);
      map.get(type.group)!.push(type);
    }
    return map;
  }, [types]);

  const err = (m: { error: unknown }) =>
    (m.error as { response?: { data?: { message?: string } } })?.response?.data?.message;

  const startEdit = (o: ApiWorkerOffering) => {
    setEditing(o.id);
    setForm({
      rateBasis: o.rateBasis,
      rateMin: o.rateMinCents != null ? String(o.rateMinCents / 100) : '',
      rateMax: o.rateMaxCents != null ? String(o.rateMaxCents / 100) : '',
      headcount: o.headcount != null ? String(o.headcount) : '',
      minHours: o.minHours != null ? String(o.minHours) : '',
      notes: o.notes ?? '',
      isNegotiable: o.isNegotiable,
    });
  };

  const rateFields = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{t('labour.rateBasis')}</span>
        <select
          value={form.rateBasis}
          onChange={(e) => setForm((f) => ({ ...f, rateBasis: e.target.value as LabourRateBasis }))}
          className="w-full rounded-md border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-leaf"
        >
          {LABOUR_RATE_BASES.map((b) => (
            <option key={b} value={b}>{t(`enums:labourRateBasis.${b}`, { defaultValue: b })}</option>
          ))}
        </select>
      </label>
      {/* An "on request" row carries no figure at all — hiding the inputs is
          clearer than leaving two boxes the server will refuse to store. */}
      {form.rateBasis !== LABOUR_ON_REQUEST && (
        <div className="grid grid-cols-2 gap-2">
          <Input label={t('labour.rateMin')} type="number" value={form.rateMin} onChange={(e) => setForm((f) => ({ ...f, rateMin: e.target.value }))} />
          <Input label={t('labour.rateMax')} type="number" value={form.rateMax} onChange={(e) => setForm((f) => ({ ...f, rateMax: e.target.value }))} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {isCompany && (
          <Input label={t('labour.headcount')} type="number" value={form.headcount} onChange={(e) => setForm((f) => ({ ...f, headcount: e.target.value }))} />
        )}
        <Input label={t('labour.minHours')} type="number" value={form.minHours} onChange={(e) => setForm((f) => ({ ...f, minHours: e.target.value }))} />
      </div>
      <Input label={t('labour.notes')} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={form.isNegotiable} onChange={(e) => setForm((f) => ({ ...f, isNegotiable: e.target.checked }))} />
        {t('labour.negotiable')}
      </label>
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-extrabold text-ink">{t('labour.title')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{isCompany ? t('labour.subCompany') : t('labour.subWorker')}</p>
      </div>

      {/* published rates */}
      <Card className="p-0">
        <div className="border-b border-surface-border px-4 py-3 font-display font-bold text-ink">
          {t('labour.published', { count: mine.length })}
        </div>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-ink-soft">{t('common:loading')}</p>
        ) : mine.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-soft">{t('labour.noneYet')}</p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {mine.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{o.workerType.name}</span>
                  {!o.isActive && <Badge tone="slate">{t('labour.hidden')}</Badge>}
                  {o.isNegotiable && <Badge tone="mango">{t('labour.negotiable')}</Badge>}
                  <span className="ms-auto flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => (editing === o.id ? setEditing(null) : startEdit(o))}>
                      {t(editing === o.id ? 'common:cancel' : 'labour.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(o.id)}>{t('labour.remove')}</Button>
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-ink-soft">
                  {rateLabel(o, t)}
                  {o.headcount != null && ` · ${t('labour.upTo', { count: o.headcount })}`}
                  {o.minHours != null && ` · ${t('labour.minHoursShort', { count: o.minHours })}`}
                </div>
                {editing === o.id && (
                  <div className="mt-3 space-y-3 rounded-lg bg-brand-surface p-3">
                    {rateFields}
                    {err(save) && <p className="text-xs font-semibold text-status-error">{err(save)}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(o.id)}>
                        {save.isPending ? t('labour.saving') : t('labour.save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => api.labour.update(o.id, { isActive: !o.isActive }).then(invalidate)}
                      >
                        {t(o.isActive ? 'labour.hide' : 'labour.show')}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* the catalogue to price from */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display font-bold text-ink">{t('labour.addTitle')}</h3>
          {picked.size > 0 && (
            <span className="ms-auto flex items-center gap-2">
              <span className="text-sm text-ink-soft">{t('labour.selected', { count: picked.size })}</span>
              <Button size="sm" disabled={bulk.isPending} onClick={() => bulk.mutate()}>
                {bulk.isPending ? t('labour.saving') : t('labour.addSelected')}
              </Button>
            </span>
          )}
        </div>
        {/* One shared rate applies to everything ticked; each row is editable
            afterwards. Onboarding otherwise means filling a dozen forms. */}
        {picked.size > 0 && <div className="space-y-3 rounded-lg bg-brand-surface p-3">{rateFields}</div>}
        {err(bulk) && <p className="text-xs font-semibold text-status-error">{err(bulk)}</p>}

        {WORKER_TYPE_GROUPS.filter((g) => byGroup.has(g)).map((group) => (
          <div key={group}>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {t(`enums:workerTypeGroup.${group}`, { defaultValue: group })}
            </div>
            <div className="flex flex-wrap gap-2">
              {byGroup.get(group)!.map((type) => {
                const already = priced.has(type.id);
                const on = picked.has(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    disabled={already}
                    aria-pressed={on}
                    onClick={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(type.id)) next.delete(type.id);
                        else next.add(type.id);
                        return next;
                      })
                    }
                    className={
                      'rounded-full border px-3 py-1.5 text-sm font-semibold transition ' +
                      (already
                        ? 'cursor-not-allowed border-surface-border bg-surface-muted text-ink-soft opacity-60'
                        : on
                          ? 'border-brand bg-brand-surface text-brand-dark'
                          : 'border-surface-border text-ink-soft hover:border-brand-leaf')
                    }
                    title={already ? t('labour.alreadyPriced') : undefined}
                  >
                    {type.name}
                    {already && ' ✓'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/** A rate reads as one figure, a range, or "on request". */
export function rateLabel(
  o: Pick<ApiWorkerOffering, 'rateBasis' | 'rateMinCents' | 'rateMaxCents'>,
  t: (k: string, o?: Record<string, unknown>) => string,
  fmt: (c: number | null | undefined) => string = (c) => (c == null ? '—' : `$${(c / 100).toFixed(2)}`),
): string {
  if (o.rateBasis === LABOUR_ON_REQUEST) return t('labour.onRequest');
  const { rateMinCents: min, rateMaxCents: max } = o;
  if (min == null && max == null) return t('labour.onRequest');
  const basis = t(`enums:labourRateBasis.${o.rateBasis}`, { defaultValue: o.rateBasis });
  const amount = min != null && max != null && max !== min ? `${fmt(min)} – ${fmt(max)}` : fmt(min ?? max);
  return `${amount} ${basis}`;
}
