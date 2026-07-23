import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal, type BadgeTone } from '@agrotraders/ui';
import type { ApiInvoice, ApiInvoiceKind, ApiLoaderJob, ApiOrder } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { DownloadInvoiceButton, errMessage } from './order-parts';

/* ─────────────────────────────────────────────────────────────────────────
 * Platform-wide invoice tooling. Every issuing role (seller, transporter,
 * loader company, worker) shares the same builder, list, and detail view so
 * the flow — editable line items, tax, due date, notes, PDF, mark paid/void —
 * behaves identically everywhere.
 * ──────────────────────────────────────────────────────────────────────── */

const statusTone: Record<string, BadgeTone> = { paid: 'green', void: 'slate', issued: 'gold', draft: 'warn' };

export interface DraftLine {
  description: string;
  qty: number;
  unit?: string;
  /** Dollars in the form; converted to cents on submit. */
  unitPrice: number;
}

/** A thing that can be billed, surfaced in a role's "Ready to invoice" panel. */
export interface BillableSubject {
  kind: ApiInvoiceKind;
  subjectId: string;
  title: string;
  subtitle?: string;
  defaultLines: DraftLine[];
}

/* ── Builder ──────────────────────────────────────────────────────────── */

export function InvoiceBuilderModal({ subject, onClose }: { subject: BillableSubject; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [lines, setLines] = useState<DraftLine[]>(subject.defaultLines.length ? subject.defaultLines : [{ description: '', qty: 1, unitPrice: 0 }]);
  const [tax, setTax] = useState('0');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.unitPrice) || 0) * (Number(l.qty) || 0), 0);
  const total = subtotal + (Number(tax) || 0);

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { description: '', qty: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, j) => j !== i)));

  const raise = useMutation({
    mutationFn: () =>
      api.invoices.create({
        kind: subject.kind,
        subjectId: subject.subjectId,
        lines: lines
          .filter((l) => l.description.trim())
          .map((l) => ({ description: l.description.trim(), qty: Number(l.qty) || 1, unit: l.unit?.trim() || undefined, unitPriceCents: Math.round((Number(l.unitPrice) || 0) * 100) })),
        taxCents: Math.round((Number(tax) || 0) * 100),
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-invoices'] });
      qc.invalidateQueries({ queryKey: ['my-trips'] });
      qc.invalidateQueries({ queryKey: ['incoming-orders'] });
      onClose();
    },
    onError: (e) => setError(errMessage(e, t('console.order.invoiceError'))),
  });

  const canSubmit = subtotal > 0 && lines.some((l) => l.description.trim());

  return (
    <Modal closeLabel={t('common:close')}
      open
      onClose={onClose}
      title={t('console.invoice.builderTitle', { title: subject.title })}
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">{t('console.invoice.total')} <strong className="text-ink">{usd(Math.round(total * 100))}</strong></span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
            <Button disabled={!canSubmit || raise.isPending} onClick={() => raise.mutate()}>{raise.isPending ? t('console.invoice.raising') : t('console.invoice.raiseInvoice')}</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {subject.subtitle && <p className="text-sm text-ink-soft">{subject.subtitle}</p>}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{t('console.invoice.lineItems')}</span>
            <Button size="sm" variant="ghost" leftIcon={<Icon name="plus" size={14} />} onClick={addLine}>{t('console.invoice.addLine')}</Button>
          </div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              // Inside a modal at 360px the fixed 4rem+6rem+auto tracks left
              // ~60px for the description. Description gets its own full-width
              // row on a phone; qty / price / remove share the second.
              <div key={i} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2 sm:grid-cols-[1fr_4rem_6rem_auto]">
                <div className="col-span-full sm:col-span-1">
                  <Input label={i === 0 ? t('console.invoice.description') : undefined} placeholder={t('console.invoice.linePlaceholder')} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                </div>
                <Input label={i === 0 ? t('console.invoice.qty') : undefined} type="number" value={String(l.qty)} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
                <Input label={i === 0 ? t('console.invoice.unitPrice') : undefined} type="number" value={String(l.unitPrice)} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} />
                <button type="button" title={t('console.invoice.removeLine')} className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-brand-surface hover:text-red-600 disabled:opacity-30" disabled={lines.length === 1} onClick={() => removeLine(i)}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t('console.order.tax')} type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
          <Input label={t('console.invoice.dueOptional')} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
        <Input label={t('console.order.notesOptional')} placeholder={t('console.invoice.notesPlaceholder')} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="rounded-lg bg-brand-surface px-3 py-2 text-sm">
          <div className="flex justify-between text-ink-soft"><span>{t('console.invoice.subtotal')}</span><span>{usd(Math.round(subtotal * 100))}</span></div>
          <div className="flex justify-between text-ink-soft"><span>{t('console.invoice.taxLabel')}</span><span>{usd(Math.round((Number(tax) || 0) * 100))}</span></div>
          <div className="mt-1 flex justify-between border-t border-surface-border pt-1 font-display font-bold text-ink"><span>{t('console.invoice.total')}</span><span>{usd(Math.round(total * 100))}</span></div>
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

/* ── Detail ───────────────────────────────────────────────────────────── */

export function InvoiceDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: inv, isLoading } = useQuery<ApiInvoice>({ queryKey: ['invoice-detail', id], queryFn: () => api.invoices.get(id) });
  const setStatus = useMutation({
    mutationFn: () => api.invoices.setStatus(id, 'void'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-invoices'] }); qc.invalidateQueries({ queryKey: ['invoice-detail', id] }); },
  });
  const isIssuer = !!inv && !!user && inv.issuer?.id === user.id;

  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={inv ? t('console.invoice.detailTitle', { number: inv.number }) : t('console.invoice.invoiceFallback')} className="max-w-xl">
      {isLoading || !inv ? (
        <p className="py-8 text-center text-ink-soft">{t('common:loading')}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge tone={statusTone[inv.status] ?? 'slate'}>{t(`console.invoice.status.${inv.status}`, { defaultValue: inv.status })}</Badge>
            <span className="font-display text-2xl font-extrabold text-ink">{usd(inv.totalCents)}</span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <Row k={t('console.invoice.from')} v={inv.issuer?.name} />
            <Row k={t('console.invoice.to')} v={inv.recipient?.name} />
            <Row k={t('console.invoice.issued')} v={new Date(inv.issuedAt).toLocaleDateString()} />
            <Row k={t('console.invoice.due')} v={inv.dueAt ? new Date(inv.dueAt).toLocaleDateString() : '—'} />
            {inv.paidAt && <Row k={t('console.invoice.paid')} v={new Date(inv.paidAt).toLocaleDateString()} />}
          </dl>
          {/* Scroll, don't clip: this table lives in a modal (the narrowest container
              in the app), so `overflow-hidden` cut long descriptions and translated
              headers off with no way to reach them. */}
          {inv.lines && inv.lines.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-surface-border">
              <table className="w-full min-w-[26rem] text-sm">
                <thead><tr className="bg-brand-surface text-start text-xs font-bold uppercase tracking-wide text-ink-soft"><th className="px-3 py-2 text-start">{t('console.invoice.item')}</th><th className="px-3 py-2 text-end">{t('console.invoice.qty')}</th><th className="px-3 py-2 text-end">{t('console.invoice.amount')}</th></tr></thead>
                <tbody>
                  {inv.lines.map((l) => (
                    <tr key={l.id} className="border-t border-surface-border/70"><td className="px-3 py-2 text-ink">{l.description}</td><td className="px-3 py-2 text-end text-ink-soft">{l.qty}{l.unit ? ` ${l.unit}` : ''}</td><td className="px-3 py-2 text-end font-numeric font-semibold text-ink">{usd(l.amountCents)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between text-sm"><span className="text-ink-soft">{t('console.invoice.subtotal')}</span><span>{usd(inv.subtotalCents)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-ink-soft">{t('console.invoice.taxLabel')}</span><span>{usd(inv.taxCents)}</span></div>
          {inv.notes && <p className="rounded-lg bg-brand-surface px-3 py-2 text-sm text-ink-soft">{inv.notes}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surface-border pt-3">
            {isIssuer && inv.status === 'issued' && (
              <>
                <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate()}>{t('console.invoice.void')}</Button>
              </>
            )}
            <DownloadInvoiceButton id={inv.id} label={t('console.invoice.downloadPdf')} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-surface-border/60 py-1">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="truncate font-semibold text-ink">{v ?? '—'}</dd>
    </div>
  );
}

/* ── List / center ────────────────────────────────────────────────────── */

const STATUS_FILTERS = ['all', 'issued', 'paid', 'void'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

/**
 * The shared invoices screen. `billable` renders a role-specific "ready to
 * invoice" panel above the lists (delivered trips, deliverable orders, …).
 */
export function InvoiceCenter({ title, sub, billable }: { title?: string; sub?: string; billable?: React.ReactNode }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'issued' | 'received'>('issued');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery<ApiInvoice[]>({
    queryKey: ['my-invoices', tab],
    queryFn: () => api.invoices.mine(tab),
  });
  const shown = useMemo(() => (status === 'all' ? invoices : invoices.filter((i) => i.status === status)), [invoices, status]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{title ?? t('console.nav.invoices')}</h2>
        {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
      </div>

      {billable}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {(['issued', 'received'] as const).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} className={'rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ' + (tab === tb ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft')}>{tb === 'issued' ? t('console.invoice.tabIssued') : t('console.invoice.tabReceived')}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={'rounded-full border px-3 py-1 text-xs font-semibold capitalize ' + (status === s ? 'border-brand bg-brand-surface text-brand-dark' : 'border-surface-border text-ink-soft')}>{t(`console.invoice.filter.${s}`)}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : shown.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{status === 'all' ? t('console.invoice.noInvoices', { tab: tab === 'issued' ? t('console.invoice.tabIssued') : t('console.invoice.tabReceived') }) : t('console.invoice.noInvoicesFiltered', { tab: tab === 'issued' ? t('console.invoice.tabIssued') : t('console.invoice.tabReceived'), status: t(`console.invoice.filter.${status}`) })}</Card>
      ) : (
        <Card padded={false} className="divide-y divide-surface-border">
          {shown.map((inv) => (
            <button key={inv.id} onClick={() => setDetailId(inv.id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3 text-start hover:bg-brand-surface/50">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-surface text-brand-dark"><Icon name="file" size={16} /></span>
                <div>
                  <div className="text-sm font-semibold text-ink">{inv.number}</div>
                  <div className="text-xs text-ink-soft">{tab === 'issued' ? t('console.invoice.toName', { name: inv.recipient?.name ?? '—' }) : t('console.invoice.fromName', { name: inv.issuer?.name ?? '—' })} · {new Date(inv.issuedAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={statusTone[inv.status] ?? 'slate'}>{t(`console.invoice.status.${inv.status}`, { defaultValue: inv.status })}</Badge>
                <span className="font-display font-extrabold text-ink">{usd(inv.totalCents)}</span>
              </div>
            </button>
          ))}
        </Card>
      )}

      {detailId && <InvoiceDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

/* ── Role-specific wrappers with a "Ready to invoice" panel ───────────── */

/** A small "Ready to invoice" list that opens the shared builder. */
function BillablePanel({ items, onPick }: { items: { key: string; title: string; subtitle: string; subject: BillableSubject }[]; onPick: (s: BillableSubject) => void }) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <Card>
      <h3 className="mb-3 font-display font-bold text-ink">{t('console.transporter.readyToInvoice')}</h3>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2">
            <div className="text-sm"><div className="font-semibold text-ink">{it.title}</div><div className="text-xs text-ink-soft">{it.subtitle}</div></div>
            <Button size="sm" onClick={() => onPick(it.subject)}>{t('console.invoice.raiseInvoice')}</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Seller invoices — bill buyers for dispatched/delivered orders. */
export function SellerInvoices() {
  const { t } = useI18n();
  const [subject, setSubject] = useState<BillableSubject | null>(null);
  const { data: invoices = [] } = useQuery<ApiInvoice[]>({ queryKey: ['my-invoices', 'issued'], queryFn: () => api.invoices.mine('issued') });
  const { data: orders = [] } = useQuery<ApiOrder[]>({ queryKey: ['incoming-orders'], queryFn: () => api.orders.incoming() });
  const invoiced = new Set(invoices.filter((i) => i.kind === 'order').map((i) => i.orderId));
  const items = orders
    .filter((o) => ['dispatched', 'in_transit', 'delivered'].includes(o.status) && !invoiced.has(o.id))
    .map((o) => ({
      key: o.id,
      title: `${o.product?.name ?? t('console.order.orderFallback')} · #${o.reference}`,
      subtitle: `${o.buyer?.name ?? ''} · ${o.amount}`,
      subject: {
        kind: 'order' as const,
        subjectId: o.id,
        title: `#${o.reference}`,
        subtitle: t('console.invoice.goodsFor', { product: o.product?.name ?? t('console.invoice.goods'), buyer: o.buyer?.name ?? t('console.invoice.buyerFallback') }),
        defaultLines: [{ description: t('console.invoice.orderLine', { product: o.product?.name ?? t('console.invoice.goods'), ref: o.reference }), qty: o.qtyValue ?? 1, unit: o.qtyUnit ?? undefined, unitPrice: (o.unitPriceCents ?? o.amountCents ?? 0) / 100 }],
      },
    }));
  return (
    <>
      <InvoiceCenter title={t('console.nav.invoices')} sub={t('console.invoice.sellerSub')} billable={<BillablePanel items={items} onPick={setSubject} />} />
      {subject && <InvoiceBuilderModal subject={subject} onClose={() => setSubject(null)} />}
    </>
  );
}

/** Loader-company invoices — bill job creators for completed crews. */
export function LoadercoInvoices() {
  const { t } = useI18n();
  const [subject, setSubject] = useState<BillableSubject | null>(null);
  const { data: invoices = [] } = useQuery<ApiInvoice[]>({ queryKey: ['my-invoices', 'issued'], queryFn: () => api.invoices.mine('issued') });
  const { data: jobs = [] } = useQuery<ApiLoaderJob[]>({ queryKey: ['my-jobs'], queryFn: () => api.loaders.myJobs() });
  const invoiced = new Set(invoices.filter((i) => i.kind === 'loaderjob').map((i) => i.loaderJobId));
  const items = jobs
    .filter((j) => !['open', 'cancelled'].includes(j.status) && !invoiced.has(j.id))
    .map((j) => ({
      key: j.id,
      title: `${j.reference} · ${j.location}`,
      subtitle: `${t('console.dash.workersCount', { count: j.workersNeeded })} · ${j.status}`,
      subject: {
        kind: 'loaderjob' as const,
        subjectId: j.id,
        title: j.reference,
        subtitle: t('console.invoice.crewAt', { location: j.location }),
        defaultLines: [{ description: t('console.invoice.crewLine', { location: j.location, ref: j.reference }), qty: j.workersNeeded, unit: 'worker', unitPrice: j.payCents ? j.payCents / Math.max(j.workersNeeded, 1) / 100 : 0 }],
      },
    }));
  return (
    <>
      <InvoiceCenter title={t('console.nav.invoices')} sub={t('console.invoice.loadercoSub')} billable={<BillablePanel items={items} onPick={setSubject} />} />
      {subject && <InvoiceBuilderModal subject={subject} onClose={() => setSubject(null)} />}
    </>
  );
}

/** Worker invoices — view issued/received; raise from a shift in the Jobs section. */
export function WorkerInvoices() {
  const { t } = useI18n();
  return <InvoiceCenter title={t('console.nav.invoices')} sub={t('console.invoice.workerSub')} />;
}
