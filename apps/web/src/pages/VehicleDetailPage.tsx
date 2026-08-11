import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, assetUrl } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

export function VehicleDetailPage() {
  const { id = '' } = useParams(); const { user } = useAuth();
  const { data: v, isLoading } = useQuery({ queryKey: ['vehicle', id], queryFn: () => api.vehicles.detail(id), enabled: !!id });
  useEffect(() => { if (v) document.title = `${v.vehicleType || v.type} · ${v.owner?.name || 'Transport'} | AgroTraders`; }, [v]);
  if (isLoading) return <main className="p-12 text-center">Loading…</main>; if (!v) return null;
  const facts = [['Capacity', `${v.capacityTons ?? v.capacityMt ?? '—'} tons`], ['Body length', v.bodyLengthFt], ['Registration', v.plateMasked], ['Insurance valid', v.insuranceExpiry?.slice(0,10)], ['Permit valid', v.permitExpiry?.slice(0,10)], ['Drivers', String(v.driverCount)], ['Per km', v.ratePerKmCents != null ? `$${(v.ratePerKmCents/100).toFixed(2)}` : null], ['Per trip', v.ratePerTripCents != null ? `$${(v.ratePerTripCents/100).toFixed(2)}` : null]];
  return <main className="mx-auto max-w-5xl px-4 py-8"><div className="grid gap-8 md:grid-cols-2">{v.photoUrl ? <img src={assetUrl(v.photoUrl)} alt="" className="h-80 w-full rounded-xl object-cover" /> : <div className="flex h-80 items-center justify-center rounded-xl bg-brand-surface text-7xl">🚚</div>}<section><p className="text-sm font-semibold text-brand">{v.owner?.name}</p><h1 className="font-display text-3xl font-extrabold capitalize">{v.vehicleType || v.type}</h1><p className="mt-3 text-ink-soft">{v.notes}</p><dl className="mt-5 grid grid-cols-2 gap-3">{facts.filter(x=>x[1]).map(([a,b])=><div key={a} className="rounded-lg bg-surface-bg p-3"><dt className="text-xs text-ink-soft">{a}</dt><dd className="font-semibold">{b}</dd></div>)}</dl><div className="mt-4 flex flex-wrap gap-2 text-sm"><span>GPS: {v.gpsTracking ? 'Available' : 'No'}</span><span>Loading: {v.loadingIncluded ? 'Included' : 'Extra'}</span></div>{user ? <Link to={`/u/${v.owner?.id}`} className="mt-6 inline-block rounded-md bg-brand px-5 py-3 font-bold text-white">Contact / book</Link> : <Link to={`/login?from=${encodeURIComponent(`/vehicles/${id}`)}`} className="mt-6 inline-block rounded-md bg-brand px-5 py-3 font-bold text-white">Sign in to contact or book</Link>}</section></div></main>;
}
