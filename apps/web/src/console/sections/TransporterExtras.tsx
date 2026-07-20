import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal, type BadgeTone, type IconName } from '@agrotraders/ui';
import type { ApiDriver, ApiOrder } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd, orderLabel, orderTone } from '../lib';
import { OtpEntry, OrderDrawer, errMessage } from './order-parts';
import { BarChart } from './BarChart';
import { useDrivers, type Driver } from './transporterData';
import { InvoiceCenter, InvoiceBuilderModal, type BillableSubject } from './InvoiceCenter';

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl font-extrabold text-ink">{title}</h2>
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

interface QuoteRow {
  id: string;
  priceCents: number;
  etaDays?: number | null;
  status: string;
  createdAt?: string;
  request?: { reference: string; fromCity: string; toCity: string; cargo: string } | null;
}
const quoteTone: Record<string, BadgeTone> = { pending: 'warn', accepted: 'green', rejected: 'error' };

/** Quotes — prices the transporter has submitted on open loads. */
export function TransporterQuotes() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: quotes = [], isLoading } = useQuery<QuoteRow[]>({
    queryKey: ['my-quotes'],
    queryFn: () => api.transport.myQuotes() as Promise<QuoteRow[]>,
  });
  const withdraw = useMutation({
    mutationFn: (id: string) => api.transport.withdrawQuote(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-quotes'] }); qc.invalidateQueries({ queryKey: ['open-requests'] }); },
  });
  return (
    <div>
      <SectionHead title={t('console.nav.quotes')} sub={t('console.transporter.quotesSub')} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : quotes.length === 0 ? (
        <EmptyHint icon="file" title={t('console.transporter.noQuotesTitle')} body={t('console.transporter.noQuotesBody')} />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <Card key={q.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display font-bold text-ink">
                  {q.request ? `${q.request.fromCity} → ${q.request.toCity}` : t('console.transporter.loadFallback')}
                </div>
                <div className="text-xs text-ink-soft">
                  {q.request ? `#${q.request.reference} · ${q.request.cargo}` : ''}
                  {q.etaDays ? ` · ${t('console.transporter.etaDaysShort', { days: q.etaDays })}` : ''}
                  {q.createdAt ? ` · ${new Date(q.createdAt).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display font-extrabold text-ink">{usd(q.priceCents)}</span>
                <Badge tone={quoteTone[q.status] ?? 'slate'}>{t(`console.transporter.quoteStatus.${q.status}`, { defaultValue: q.status })}</Badge>
                {q.status === 'pending' && (
                  <Button size="sm" variant="outline" disabled={withdraw.isPending} onClick={() => withdraw.mutate(q.id)}>{t('console.transporter.withdraw')}</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** My Requests — transport requests this transporter raised, plus a create form. */
interface MyRequestRow {
  id: string;
  reference: string;
  fromCity: string;
  toCity: string;
  cargo: string;
  weightMt?: string | null;
  status: string;
  createdAt: string;
  quotes?: { id: string; priceCents: number; status: string; transporter?: { name: string } }[];
  trip?: { reference: string } | null;
}
const reqTone: Record<string, BadgeTone> = { open: 'info', quoted: 'warn', assigned: 'green', completed: 'slate', cancelled: 'error' };

export function TransporterMyRequests() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ fromCity: '', toCity: '', cargo: '', weightMt: '' });
  const [error, setError] = useState('');
  const { data: requests = [], isLoading } = useQuery<MyRequestRow[]>({
    queryKey: ['my-requests'],
    queryFn: () => api.transport.myRequests() as Promise<MyRequestRow[]>,
  });
  const create = useMutation({
    mutationFn: () => api.transport.createRequest({ fromCity: form.fromCity, toCity: form.toCity, cargo: form.cargo, weightMt: form.weightMt || undefined }),
    onSuccess: () => { setForm({ fromCity: '', toCity: '', cargo: '', weightMt: '' }); setError(''); qc.invalidateQueries({ queryKey: ['my-requests'] }); },
    onError: (e) => setError(errMessage(e, t('console.transporter.createRequestError'))),
  });
  const ready = form.fromCity.trim() && form.toCity.trim() && form.cargo.trim();

  return (
    <div>
      <SectionHead title={t('console.nav.myrequests')} sub={t('console.transporter.myRequestsSub')} />
      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Input label={t('console.transporter.from')} placeholder={t('console.ph.fromCity')} value={form.fromCity} onChange={(e) => setForm((f) => ({ ...f, fromCity: e.target.value }))} />
          <Input label={t('console.transporter.to')} placeholder={t('console.ph.toCity')} value={form.toCity} onChange={(e) => setForm((f) => ({ ...f, toCity: e.target.value }))} />
          <Input label={t('console.transporter.cargo')} placeholder={t('console.ph.cargo')} value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
          <div className="flex items-end gap-2">
            <Input label={t('console.transporter.weight')} placeholder="24" value={form.weightMt} onChange={(e) => setForm((f) => ({ ...f, weightMt: e.target.value }))} />
            <Button className="mb-0.5" disabled={!ready || create.isPending} onClick={() => create.mutate()}>{t('console.transporter.post')}</Button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      </Card>
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : requests.length === 0 ? (
        <EmptyHint icon="box" title={t('console.transporter.noReqTitle')} body={t('console.transporter.noReqBody')} />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display font-bold text-ink">{r.fromCity} → {r.toCity}</div>
                <div className="text-xs text-ink-soft">#{r.reference} · {r.cargo}{r.weightMt ? ` · ${r.weightMt} MT` : ''} · {t('console.transporter.quotesCount', { count: r.quotes?.length ?? 0 })}{r.trip ? ` · ${t('console.transporter.tripRef', { ref: r.trip.reference })}` : ''}</div>
              </div>
              <Badge tone={reqTone[r.status] ?? 'slate'}>{t(`console.transporter.reqStatus.${r.status}`, { defaultValue: r.status })}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Drivers — fleet roster with photo, licence, experience and rate. */
export function TransporterDrivers() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ApiDriver | null>(null);
  const [open, setOpen] = useState(false);
  const { data: drivers = [], isLoading } = useQuery<ApiDriver[]>({ queryKey: ['my-drivers'], queryFn: () => api.drivers.mine() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-drivers'] });
  const toggle = useMutation({ mutationFn: ({ id, status }: { id: string; status: 'active' | 'off' }) => api.drivers.update(id, { status }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.drivers.remove(id), onSuccess: refresh });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.nav.drivers')}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t('console.transporter.driversSub')}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} leftIcon={<Icon name="plus" size={16} />}>{t('console.transporter.addDriver')}</Button>
      </div>
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : drivers.length === 0 ? (
        <EmptyHint icon="user" title={t('console.transporter.noDriversTitle')} body={t('console.transporter.noDriversBody')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand-surface font-display font-bold text-brand-dark">
                  {d.photoUrl ? <img src={assetUrl(d.photoUrl)} alt="" className="h-full w-full object-cover" /> : d.name.charAt(0)}
                </span>
                <Badge tone={d.status === 'active' ? 'green' : 'slate'}>{t(`console.transporter.driverStatus.${d.status}`, { defaultValue: d.status })}</Badge>
              </div>
              <div className="mt-2 font-display font-bold text-ink">{d.name}</div>
              <div className="text-xs text-ink-soft">{d.vehicle ?? '—'} · ★ {d.ratingPct ?? 0}% · {t('console.dash.onTime', { pct: d.onTimePct ?? 0 })}</div>
              <div className="mt-1 space-y-0.5 text-xs text-ink-soft">
                {d.phone && <div>☎ {d.phone}</div>}
                {d.licenseNumber && <div>{t('console.transporter.licence', { num: d.licenseNumber })}{d.licenseExpiry ? ` · ${t('console.transporter.exp', { date: new Date(d.licenseExpiry).toLocaleDateString() })}` : ''}</div>}
                {(d.experienceYears != null || d.ratePerHourCents != null) && (
                  <div>{d.experienceYears != null ? t('console.transporter.yrsExp', { years: d.experienceYears }) : ''}{d.experienceYears != null && d.ratePerHourCents != null ? ' · ' : ''}{d.ratePerHourCents != null ? t('console.transporter.perHour', { amount: usd(d.ratePerHourCents) }) : ''}</div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(d); setOpen(true); }}>{t('console.loaderco.edit')}</Button>
                <Button variant="outline" size="sm" onClick={() => toggle.mutate({ id: d.id, status: d.status === 'active' ? 'off' : 'active' })}>
                  {d.status === 'active' ? t('console.transporter.offDuty2') : t('console.transporter.activate')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove.mutate(d.id)}>{t('console.loaderco.remove')}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {open && <DriverModal driver={editing} onClose={() => setOpen(false)} onSaved={refresh} />}
    </div>
  );
}

type DriverFormState = { name: string; vehicle: string; rating: string; onTime: string; phone: string; licenseNumber: string; licenseExpiry: string; experienceYears: string; ratePerHour: string };

function DriverModal({ driver, onClose, onSaved }: { driver: ApiDriver | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState<DriverFormState>(driver ? {
    name: driver.name, vehicle: driver.vehicle ?? '', rating: String(driver.ratingPct ?? 96), onTime: String(driver.onTimePct ?? 95),
    phone: driver.phone ?? '', licenseNumber: driver.licenseNumber ?? '', licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.slice(0, 10) : '',
    experienceYears: driver.experienceYears != null ? String(driver.experienceYears) : '', ratePerHour: driver.ratePerHourCents != null ? String(driver.ratePerHourCents / 100) : '',
  } : { name: '', vehicle: '', rating: '96', onTime: '95', phone: '', licenseNumber: '', licenseExpiry: '', experienceYears: '', ratePerHour: '' });
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const s = (k: keyof DriverFormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const preview = pendingPhoto ? URL.createObjectURL(pendingPhoto) : assetUrl(driver?.photoUrl) ?? null;

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        vehicle: form.vehicle.trim() || undefined,
        ratingPct: Math.min(100, Math.max(0, Math.round(Number(form.rating)) || 0)),
        onTimePct: Math.min(100, Math.max(0, Math.round(Number(form.onTime)) || 0)),
        phone: form.phone.trim() || undefined,
        licenseNumber: form.licenseNumber.trim() || undefined,
        licenseExpiry: form.licenseExpiry || undefined,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
        ratePerHourCents: form.ratePerHour ? Math.round(Number(form.ratePerHour) * 100) : undefined,
      };
      const saved = driver ? await api.drivers.update(driver.id, body) : await api.drivers.create(body);
      if (pendingPhoto) await api.drivers.uploadPhoto(saved.id, pendingPhoto);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e) => setError(errMessage(e, t('console.transporter.saveDriverError'))),
  });

  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={driver ? t('console.transporter.editDriver') : t('console.transporter.addDriverTitle')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button><Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? t('console.transporter.saving') : t('console.transporter.save')}</Button></>}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-brand-surface">
            {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Icon name="user" size={26} className="text-ink-soft" />}
          </div>
          <label className="cursor-pointer rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand-leaf hover:text-brand-dark">
            {preview ? t('console.transporter.changePhoto') : t('console.transporter.addPhoto')}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setPendingPhoto(f); }} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('console.transporter.name')} placeholder="Ravi K." value={form.name} onChange={s('name')} />
          <Input label={t('console.transporter.assignedVehicle')} placeholder="TR-441" value={form.vehicle} onChange={s('vehicle')} />
          <Input label={t('console.order.phone')} placeholder="+91…" value={form.phone} onChange={s('phone')} />
          <Input label={t('console.transporter.licenceNumber')} placeholder="MH-1420110012345" value={form.licenseNumber} onChange={s('licenseNumber')} />
          <Input label={t('console.transporter.licenceExpiry')} type="date" value={form.licenseExpiry} onChange={s('licenseExpiry')} />
          <Input label={t('console.transporter.experienceYears')} type="number" placeholder="8" value={form.experienceYears} onChange={s('experienceYears')} />
          <Input label={t('console.transporter.ratePerHour')} type="number" placeholder="12" value={form.ratePerHour} onChange={s('ratePerHour')} />
          <Input label={t('console.transporter.ratingPct')} type="number" placeholder="96" value={form.rating} onChange={s('rating')} />
          <Input label={t('console.transporter.onTimePct')} type="number" placeholder="95" value={form.onTime} onChange={s('onTime')} />
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

interface WalletData {
  balanceCents: number;
  txns?: { id: string; amountCents: number; type: string; note: string | null; createdAt: string }[];
}

/** Earnings — payout balance, trend and transaction history. */
export function TransporterEarnings() {
  const { t } = useI18n();
  const { data: wallet } = useQuery<WalletData>({
    queryKey: ['me-wallet'],
    queryFn: () => api.me.wallet() as Promise<WalletData>,
  });
  const txns = wallet?.txns ?? [];
  const { data: series } = useQuery({ queryKey: ['me-series'], queryFn: () => api.me.series() });
  return (
    <div className="space-y-6">
      <SectionHead title={t('console.nav.earnings')} sub={t('console.transporter.earningsSub')} />
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

interface TripRow {
  id: string;
  reference: string;
  fromCity: string;
  toCity: string;
  cargo: string;
  status: string;
  order?: { amount?: string | null } | null;
}

/**
 * Freight invoices, built on the shared platform-wide InvoiceCenter. The
 * "Ready to invoice" panel lists delivered trips not yet billed and opens the
 * full builder prefilled with the freight line.
 */
export function TransporterInvoices() {
  const { t } = useI18n();
  const [subject, setSubject] = useState<BillableSubject | null>(null);
  const { data: invoices = [] } = useQuery({ queryKey: ['my-invoices', 'issued'], queryFn: () => api.invoices.mine('issued') });
  const { data: trips = [] } = useQuery<TripRow[]>({ queryKey: ['my-trips'], queryFn: () => api.transport.myTrips() as Promise<TripRow[]> });

  const invoicedTripIds = new Set(invoices.filter((i) => i.kind === 'trip').map((i) => i.tripId));
  const billable = trips.filter((t) => t.status === 'delivered' && !invoicedTripIds.has(t.id));

  const open = (tr: TripRow) =>
    setSubject({
      kind: 'trip',
      subjectId: tr.id,
      title: tr.reference,
      subtitle: `${tr.fromCity} → ${tr.toCity} · ${tr.cargo}`,
      defaultLines: [{ description: t('console.transporter.freightLine', { from: tr.fromCity, to: tr.toCity, ref: tr.reference }), qty: 1, unitPrice: 0 }],
    });

  const panel =
    billable.length > 0 ? (
      <Card>
        <h3 className="mb-3 font-display font-bold text-ink">{t('console.transporter.readyToInvoice')}</h3>
        <div className="space-y-2">
          {billable.map((tr) => (
            <div key={tr.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2">
              <div className="text-sm">
                <div className="font-semibold text-ink">{tr.reference}</div>
                <div className="text-xs text-ink-soft">{tr.fromCity} → {tr.toCity} · {tr.cargo}</div>
              </div>
              <Button size="sm" onClick={() => open(tr)}>{t('console.transporter.raiseInvoice')}</Button>
            </div>
          ))}
        </div>
      </Card>
    ) : undefined;

  return (
    <>
      <InvoiceCenter title={t('console.nav.invoices')} sub={t('console.transporter.invoicesSub')} billable={panel} />
      {subject && <InvoiceBuilderModal subject={subject} onClose={() => setSubject(null)} />}
    </>
  );
}

/** The transporter's work queue: orders assigned to their trips, with OTP entry. */
export function TransporterOrders() {
  const { t } = useI18n();
  const orderText = (s: ApiOrder['status']) => t(`enums:order_status.${s}`, { defaultValue: orderLabel[s] ?? s });
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: orders = [], isLoading } = useQuery<ApiOrder[]>({
    queryKey: ['transporting-orders'],
    queryFn: () => api.orders.transporting(),
    refetchInterval: 15000,
  });

  return (
    <div>
      <SectionHead title={t('console.nav.loads')} sub={t('console.transporter.myLoadsSub')} />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : orders.length === 0 ? (
        <EmptyHint icon="truck" title={t('console.transporter.noLoadsTitle')} body={t('console.transporter.noLoadsBody')} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-surface text-2xl">
                    {o.product?.imageUrl ? <img src={assetUrl(o.product.imageUrl)} alt="" className="h-full w-full object-cover" /> : (o.product?.emoji ?? '📦')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-ink">{o.product?.name ?? t('console.transporter.loadFallback')} · #{o.reference}</div>
                    <div className="truncate text-xs text-ink-soft">
                      {o.seller?.name} → {o.buyer?.name}
                      {o.qty ? ` · ${o.qty}` : ''}
                      {o.driverName ? ` · ${t('console.transporter.driverNameLine', { name: o.driverName })}` : ''}
                      {o.vehiclePlate ? ` · ${o.vehiclePlate}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-extrabold text-ink">{o.amount}</span>
                  <Badge tone={orderTone[o.status] ?? 'slate'}>{orderText(o.status)}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setDetailId(o.id)}>{t('console.order.details')}</Button>
                </div>
              </div>

              {o.status === 'dispatched' && (
                <div className="mt-4 border-t border-surface-border pt-4">
                  <OtpEntry orderId={o.id} kind="pickup" />
                </div>
              )}
              {o.status === 'in_transit' && (
                <div className="mt-4 border-t border-surface-border pt-4">
                  <OtpEntry orderId={o.id} kind="delivery" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {detailId && <OrderDrawer orderId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

// Demo review quotes are translated via console.transporter.demoReviewN;
// company names stay literal.
const REVIEWS = [
  { id: 'r1', by: 'Karim Trading', textKey: 'console.transporter.demoReview1', stars: 5 },
  { id: 'r2', by: 'Punjab Agro Exports', textKey: 'console.transporter.demoReview2', stars: 5 },
  { id: 'r3', by: 'Gulf Commodities', textKey: 'console.transporter.demoReview3', stars: 4 },
];

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex text-mango-deep">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={13} className={i < n ? 'text-mango-deep' : 'text-surface-border'} />
      ))}
    </span>
  );
}

/** Ratings — fleet score, per-driver reliability and recent reviews. */
export function TransporterRatings() {
  const { t } = useI18n();
  const { drivers } = useDrivers();
  // Driver ratings are stored as a 0–100 percentage; show a 5-star equivalent.
  const avgPct = drivers.length ? drivers.reduce((s: number, d: Driver) => s + (d.ratingPct ?? 0), 0) / drivers.length : 0;
  const avgStars = avgPct / 20;

  return (
    <div className="space-y-6">
      <SectionHead title={t('console.nav.ratings')} sub={t('console.transporter.ratingsSub')} />
      <Card className="flex items-center gap-4">
        <div className="font-display text-4xl font-extrabold text-ink">{avgStars.toFixed(1)}</div>
        <div>
          <Stars n={Math.round(avgStars)} />
          <div className="mt-1 text-xs text-ink-soft">{t('console.transporter.fleetAvg', { count: drivers.length })}</div>
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg font-bold text-ink">{t('console.transporter.byDriver')}</h3>
        <div className="mt-4 space-y-4">
          {drivers.map((d) => (
            <div key={d.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">{d.name} · <span className="text-mango-deep">★ {d.ratingPct ?? 0}%</span></span>
                <span className="text-ink-soft">{t('console.dash.onTime', { pct: d.onTimePct ?? 0 })}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                <div className="h-full rounded-full bg-brand" style={{ width: `${d.onTimePct ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg font-bold text-ink">{t('console.transporter.recentReviews')}</h3>
        <div className="mt-4 space-y-3">
          {REVIEWS.map((r) => (
            <div key={r.id} className="border-b border-surface-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{r.by}</span>
                <Stars n={r.stars} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{t(r.textKey)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
