import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal, type BadgeTone } from '@agrotraders/ui';
import type { ApiRoute, ApiVehicle } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { errMessage } from './order-parts';

const tripNext: Record<string, string | null> = { pending: 'loading', loading: 'in_transit', in_transit: 'delivered', delivered: null, delayed: 'in_transit' };
const tripTone: Record<string, BadgeTone> = { pending: 'slate', loading: 'warn', in_transit: 'info', delivered: 'green', delayed: 'error' };

/* ── Single-photo uploader (create-then-upload aware) ────────────────── */
function PhotoField({ url, pending, onFile, onClear }: { url?: string | null; pending?: File | null; onFile: (f: File) => void; onClear: () => void }) {
  const { t } = useI18n();
  const preview = pending ? URL.createObjectURL(pending) : assetUrl(url) ?? null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-surface-border bg-brand-surface">
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Icon name="truck" size={26} className="text-ink-soft" />}
      </div>
      <div className="flex flex-col gap-1">
        <label className="cursor-pointer rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand-leaf hover:text-brand-dark">
          {preview ? t('console.transporter.changePhoto') : t('console.transporter.addPhoto')}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
        </label>
        {preview && <button type="button" onClick={onClear} className="text-xs text-red-600 hover:underline">{t('console.loaderco.remove')}</button>}
      </div>
    </div>
  );
}

/* ── Requests → submit quote (price + ETA) ───────────────────────────── */
export function TransporterRequests() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { price: string; eta: string }>>({});
  const { data: requests = [], isLoading } = useQuery<Array<{ id: string; reference: string; fromCity: string; toCity: string; cargo: string; createdBy?: { name: string }; _count?: { quotes: number } }>>({
    queryKey: ['open-requests'],
    queryFn: () => api.transport.requestsOpen() as Promise<never>,
  });
  const quote = useMutation({
    mutationFn: ({ id, priceCents, etaDays }: { id: string; priceCents: number; etaDays?: number }) => api.transport.quote(id, { priceCents, etaDays }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['open-requests'] }); qc.invalidateQueries({ queryKey: ['my-quotes'] }); },
  });
  const set = (id: string, k: 'price' | 'eta', v: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? { price: '', eta: '' }), [k]: v } }));

  return (
    <div>
      <h2 className="mb-5 min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.nav.requests')}</h2>
      {isLoading ? <p className="text-ink-soft">{t('common:loading')}</p> : requests.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('console.transporter.noRequests')}</Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const d = drafts[r.id] ?? { price: '', eta: '' };
            return (
              <Card key={r.id} className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="font-display font-bold text-ink">{r.fromCity} → {r.toCity}</div>
                  <div className="text-xs text-ink-soft">#{r.reference} · {r.cargo} · {r.createdBy?.name} · {t('console.transporter.quotesCount', { count: r._count?.quotes ?? 0 })}</div>
                </div>
                {/* 112 + 96 + ~80px of button overflowed the ~280px a Card gives
                    it on a phone; the fields now share the row and shrink. */}
                <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
                  <div className="min-w-[6rem] flex-1 sm:w-28 sm:flex-none"><Input label={t('console.transporter.quotePrice')} type="number" value={d.price} onChange={(e) => set(r.id, 'price', e.target.value)} /></div>
                  <div className="min-w-[5rem] flex-1 sm:w-24 sm:flex-none"><Input label={t('console.transporter.etaDays')} type="number" value={d.eta} onChange={(e) => set(r.id, 'eta', e.target.value)} /></div>
                  <Button className="mb-0.5 shrink-0" size="sm" disabled={quote.isPending || !Number(d.price)} onClick={() => quote.mutate({ id: r.id, priceCents: Math.round(Number(d.price) * 100), etaDays: Number(d.eta) || undefined })}>
                    {t('console.transporter.quote')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Trips → advance status ──────────────────────────────────────────── */
export function TransporterTrips() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: trips = [], isLoading } = useQuery<Array<{ id: string; reference: string; fromCity: string; toCity: string; cargo: string; status: string; otp: string | null }>>({
    queryKey: ['my-trips'],
    queryFn: () => api.transport.myTrips() as Promise<never>,
  });
  const adv = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.transport.setTripStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-trips'] }),
  });
  return (
    <div>
      <h2 className="mb-5 min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.dash.activeTrips')}</h2>
      {isLoading ? <p className="text-ink-soft">{t('common:loading')}</p> : trips.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('console.transporter.noTrips')}</Card>
      ) : (
        <div className="space-y-3">
          {trips.map((tr) => {
            const next = tripNext[tr.status];
            return (
              <Card key={tr.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display font-bold text-ink">{tr.fromCity} → {tr.toCity}</div>
                  <div className="text-xs text-ink-soft">#{tr.reference} · {tr.cargo} {tr.otp ? `· ${t('console.worker.otp', { otp: tr.otp })}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={tripTone[tr.status] ?? 'slate'}>{t(`console.dash.tripStatus.${tr.status}`, { defaultValue: tr.status.replace('_', ' ') })}</Badge>
                  {next && <Button size="sm" disabled={adv.isPending} onClick={() => adv.mutate({ id: tr.id, status: next })}>{t('console.order.markStatus', { status: t(`console.dash.tripStatus.${next}`, { defaultValue: next.replace('_', ' ') }) })}</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Vehicles (add / edit / photo / rich fields) ─────────────────────── */
type VehicleForm = { type: string; plate: string; capacityMt: string; makeModel: string; year: string; insuranceExpiry: string; notes: string };
const emptyVehicle: VehicleForm = { type: '', plate: '', capacityMt: '', makeModel: '', year: '', insuranceExpiry: '', notes: '' };

export function TransporterVehicles() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ApiVehicle | null>(null);
  const [open, setOpen] = useState(false);
  const { data: vehicles = [] } = useQuery<ApiVehicle[]>({ queryKey: ['vehicles'], queryFn: () => api.transport.vehicles() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['vehicles'] });
  const del = useMutation({ mutationFn: (id: string) => api.transport.delVehicle(id), onSuccess: refresh });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.nav.vehicles')}</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }} leftIcon={<Icon name="plus" size={16} />}>{t('console.transporter.addVehicle')}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <Card key={v.id}>
            <div className="mb-2 h-32 overflow-hidden rounded-xl border border-surface-border bg-brand-surface">
              {v.photoUrl ? <img src={assetUrl(v.photoUrl)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Icon name="truck" size={28} className="text-ink-soft" /></div>}
            </div>
            <div className="flex items-center justify-between">
              <div className="font-display font-bold text-ink">{v.type}</div>
              <Badge tone={v.status === 'available' ? 'green' : v.status === 'on_trip' ? 'info' : 'warn'}>{t(`console.transporter.vehicleStatus.${v.status}`, { defaultValue: v.status.replace('_', ' ') })}</Badge>
            </div>
            <div className="text-xs text-ink-soft">{v.plate}{v.capacityMt ? ` · ${v.capacityMt} MT` : ''}{v.makeModel ? ` · ${v.makeModel}` : ''}{v.year ? ` · ${v.year}` : ''}</div>
            {v.insuranceExpiry && <div className="mt-0.5 text-xs text-ink-soft">{t('console.transporter.insuranceTo', { date: new Date(v.insuranceExpiry).toLocaleDateString() })}</div>}
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" fullWidth onClick={() => { setEditing(v); setOpen(true); }}>{t('console.loaderco.edit')}</Button>
              <Button variant="outline" size="sm" disabled={del.isPending} onClick={() => del.mutate(v.id)}>{t('console.loaderco.remove')}</Button>
            </div>
          </Card>
        ))}
        {vehicles.length === 0 && <Card className="py-8 text-center text-ink-soft sm:col-span-2 lg:col-span-3">{t('console.transporter.noVehicles')}</Card>}
      </div>
      {open && <VehicleModal vehicle={editing} onClose={() => setOpen(false)} onSaved={refresh} />}
    </div>
  );
}

function VehicleModal({ vehicle, onClose, onSaved }: { vehicle: ApiVehicle | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState<VehicleForm>(vehicle ? {
    type: vehicle.type, plate: vehicle.plate, capacityMt: vehicle.capacityMt ?? '', makeModel: vehicle.makeModel ?? '',
    year: vehicle.year ? String(vehicle.year) : '', insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.slice(0, 10) : '', notes: vehicle.notes ?? '',
  } : emptyVehicle);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [error, setError] = useState('');
  const s = (k: keyof VehicleForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        type: form.type, plate: form.plate, capacityMt: form.capacityMt || undefined, makeModel: form.makeModel || undefined,
        year: form.year ? Number(form.year) : undefined, insuranceExpiry: form.insuranceExpiry || undefined, notes: form.notes || undefined,
      };
      const saved = vehicle ? await api.transport.updateVehicle(vehicle.id, body) : await api.transport.addVehicle(body);
      if (pendingPhoto) await api.transport.uploadVehiclePhoto(saved.id, pendingPhoto);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e) => setError(errMessage(e, t('console.transporter.saveVehicleError'))),
  });

  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={vehicle ? t('console.transporter.editVehicle') : t('console.transporter.addVehicleTitle')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button><Button disabled={!form.type.trim() || !form.plate.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? t('console.transporter.saving') : t('console.transporter.save')}</Button></>}>
      <div className="space-y-3">
        <PhotoField url={clearPhoto ? null : vehicle?.photoUrl} pending={pendingPhoto} onFile={(f) => { setPendingPhoto(f); setClearPhoto(false); }} onClear={() => { setPendingPhoto(null); setClearPhoto(true); }} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('console.transporter.type')} placeholder={t('console.ph.vehicleType')} value={form.type} onChange={s('type')} />
          <Input label={t('console.transporter.plate')} placeholder="GJ-01-AB-1234" value={form.plate} onChange={s('plate')} />
          <Input label={t('console.transporter.capacity')} placeholder="28" value={form.capacityMt} onChange={s('capacityMt')} />
          <Input label={t('console.transporter.makeModel')} placeholder={t('console.ph.makeModel')} value={form.makeModel} onChange={s('makeModel')} />
          <Input label={t('console.transporter.year')} type="number" placeholder="2021" value={form.year} onChange={s('year')} />
          <Input label={t('console.transporter.insuranceExpiry')} type="date" value={form.insuranceExpiry} onChange={s('insuranceExpiry')} />
        </div>
        <Input label={t('console.transporter.notes')} placeholder={t('console.ph.vehicleNotes')} value={form.notes} onChange={s('notes')} />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

/* ── Routes (add / edit, country-to-country + base rate) ─────────────── */
type RouteForm = { name: string; fromCity: string; fromCountry: string; toCity: string; toCountry: string; distanceKm: string; baseRate: string };
const emptyRoute: RouteForm = { name: '', fromCity: '', fromCountry: '', toCity: '', toCountry: '', distanceKm: '', baseRate: '' };

export function TransporterRoutes() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ApiRoute | null>(null);
  const [open, setOpen] = useState(false);
  const { data: routes = [] } = useQuery<ApiRoute[]>({ queryKey: ['routes'], queryFn: () => api.transport.routes() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['routes'] });
  const del = useMutation({ mutationFn: (id: string) => api.transport.delRoute(id), onSuccess: refresh });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.nav.routes')}</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }} leftIcon={<Icon name="plus" size={16} />}>{t('console.transporter.addRoute')}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((r) => (
          <Card key={r.id}>
            <Icon name="globe" size={22} className="text-brand-dark" />
            <div className="mt-2 font-display font-bold text-ink">{r.name}</div>
            <div className="text-xs text-ink-soft">
              {r.fromCity}{r.fromCountry ? `, ${r.fromCountry}` : ''} → {r.toCity}{r.toCountry ? `, ${r.toCountry}` : ''}
            </div>
            <div className="mt-0.5 text-xs text-ink-soft">{r.distanceKm ? t('console.order.distanceKm', { km: r.distanceKm }) : '—'}{r.baseRateCents ? ` · ${t('console.transporter.baseRate', { amount: usd(r.baseRateCents) })}` : ''}{r.fromCountry && r.toCountry && r.fromCountry !== r.toCountry ? ` · ${t('console.transporter.international')}` : ''}</div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" fullWidth onClick={() => { setEditing(r); setOpen(true); }}>{t('console.loaderco.edit')}</Button>
              <Button variant="outline" size="sm" disabled={del.isPending} onClick={() => del.mutate(r.id)}>{t('console.loaderco.remove')}</Button>
            </div>
          </Card>
        ))}
        {routes.length === 0 && <Card className="py-8 text-center text-ink-soft sm:col-span-2 lg:col-span-3">{t('console.transporter.noRoutes')}</Card>}
      </div>
      {open && <RouteModal route={editing} onClose={() => setOpen(false)} onSaved={refresh} />}
    </div>
  );
}

function RouteModal({ route, onClose, onSaved }: { route: ApiRoute | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState<RouteForm>(route ? {
    name: route.name, fromCity: route.fromCity, fromCountry: route.fromCountry ?? '', toCity: route.toCity, toCountry: route.toCountry ?? '',
    distanceKm: route.distanceKm ? String(route.distanceKm) : '', baseRate: route.baseRateCents ? String(route.baseRateCents / 100) : '',
  } : emptyRoute);
  const [error, setError] = useState('');
  const s = (k: keyof RouteForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name, fromCity: form.fromCity, toCity: form.toCity,
        fromCountry: form.fromCountry || undefined, toCountry: form.toCountry || undefined,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
        baseRateCents: form.baseRate ? Math.round(Number(form.baseRate) * 100) : undefined,
      };
      return route ? api.transport.updateRoute(route.id, body) : api.transport.addRoute(body);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e) => setError(errMessage(e, t('console.transporter.saveRouteError'))),
  });

  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={route ? t('console.transporter.editRoute') : t('console.transporter.addRouteTitle')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button><Button disabled={!form.name.trim() || !form.fromCity.trim() || !form.toCity.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? t('console.transporter.saving') : t('console.transporter.save')}</Button></>}>
      <div className="space-y-3">
        <Input label={t('console.transporter.routeName')} placeholder={t('console.ph.routeName')} value={form.name} onChange={s('name')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('console.transporter.fromCountry')} placeholder={t('console.ph.country')} value={form.fromCountry} onChange={s('fromCountry')} />
          <Input label={t('console.transporter.fromCity')} placeholder={t('console.ph.fromCity')} value={form.fromCity} onChange={s('fromCity')} />
          <Input label={t('console.transporter.toCountry')} placeholder={t('console.ph.countryUae')} value={form.toCountry} onChange={s('toCountry')} />
          <Input label={t('console.transporter.toCity')} placeholder={t('console.ph.toCity')} value={form.toCity} onChange={s('toCity')} />
          <Input label={t('console.transporter.distanceKmLabel')} type="number" placeholder="1900" value={form.distanceKm} onChange={s('distanceKm')} />
          <Input label={t('console.transporter.baseRateLabel')} type="number" placeholder="1200" value={form.baseRate} onChange={s('baseRate')} />
        </div>
        {/* Google Places autocomplete slots in here later — the city/country fields are already structured for it. */}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
