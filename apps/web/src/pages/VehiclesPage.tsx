import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import type { ApiPublicVehicle } from '@agrotraders/api-client';
import { api, assetUrl } from '../lib/api';

const TYPES = ['reefer truck', 'open truck', 'container', 'tanker', 'tipper', 'mini truck/tempo', 'trailer'];

export function VehiclesPage() {
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  useEffect(() => { document.title = 'Transport vehicles | AgroTraders'; }, []);
  const query = Object.fromEntries(params.entries());
  const { data, isLoading } = useQuery({ queryKey: ['public-vehicles', params.toString()], queryFn: () => api.vehicles.list(query) });
  return <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
    <h1 className="font-display text-3xl font-extrabold text-ink">Transport vehicles</h1>
    <p className="mt-1 text-ink-soft">Find verified agricultural freight capacity. Browse publicly; sign in only when you contact or book.</p>
    <div className="my-6 grid gap-3 rounded-xl border border-surface-border bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
      <input value={params.get('city') ?? ''} onChange={e => set('city', e.target.value)} placeholder="Cities (comma-separated)" className="h-10 rounded-md border border-surface-border px-3" />
      <input value={params.get('market') ?? ''} onChange={e => set('market', e.target.value)} placeholder="Market / mandi served" className="h-10 rounded-md border border-surface-border px-3" />
      <select value={params.get('vehicleType') ?? ''} onChange={e => set('vehicleType', e.target.value)} className="h-10 rounded-md border border-surface-border px-3"><option value="">All vehicle types</option>{TYPES.map(x => <option key={x}>{x}</option>)}</select>
      <input type="date" value={params.get('availableDate') ?? ''} onChange={e => set('availableDate', e.target.value)} className="h-10 rounded-md border border-surface-border px-3" />
      <label className="text-xs text-ink-soft">Min capacity (tons)<input type="range" min="0" max="100" value={params.get('capacityMin') ?? '0'} onChange={e => set('capacityMin', e.target.value)} className="block w-full" /><span>{params.get('capacityMin') ?? 0} t</span></label>
      <label className="text-xs text-ink-soft">Max capacity (tons)<input type="range" min="1" max="100" value={params.get('capacityMax') ?? '100'} onChange={e => set('capacityMax', e.target.value)} className="block w-full" /><span>{params.get('capacityMax') ?? 100} t</span></label>
      <input value={params.get('from') ?? ''} onChange={e => set('from', e.target.value)} placeholder="Route from" className="h-10 rounded-md border border-surface-border px-3" />
      <input value={params.get('to') ?? ''} onChange={e => set('to', e.target.value)} placeholder="Route to" className="h-10 rounded-md border border-surface-border px-3" />
    </div>
    {isLoading ? <p>Loading vehicles…</p> : !data?.items.length ? <div className="rounded-xl border border-dashed p-12 text-center text-ink-soft">No vehicles match these filters.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((v: ApiPublicVehicle) => <Link to={`/vehicles/${v.id}`} key={v.id} className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card transition hover:-translate-y-0.5">
      {v.photoUrl ? <img src={assetUrl(v.photoUrl)} alt={v.vehicleType || v.type} className="h-44 w-full object-cover" /> : <div className="flex h-44 items-center justify-center bg-brand-surface text-5xl">🚚</div>}
      <div className="p-4"><div className="flex justify-between gap-2"><h2 className="font-display text-lg font-bold capitalize">{v.vehicleType || v.type}</h2><span className="rounded-full bg-brand-surface px-2 py-1 text-xs text-brand">{v.capacityTons ?? v.capacityMt ?? '—'} t</span></div>
      <p className="mt-1 text-sm text-ink-soft">{v.owner?.name} · {v.plateMasked}</p><p className="mt-2 text-sm">{v.servicingCities.join(' · ') || 'Routes on request'}</p>
      <div className="mt-3 flex gap-2 text-xs"><span>{v.gpsTracking ? '✓ GPS' : 'GPS optional'}</span>{v.refrigerated && <span>❄ {v.tempRange || 'Refrigerated'}</span>}</div></div>
    </Link>)}</div>}
  </main>;
}
