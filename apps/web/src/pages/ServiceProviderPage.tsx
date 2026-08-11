import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, assetUrl } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { SERVICE_TYPES } from './ServicesPage';

const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function ServiceProviderPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [neededDate, setNeededDate] = useState('');
  const [sent, setSent] = useState(false);
  const { data: provider } = useQuery({ queryKey: ['service', slug], queryFn: () => api.services.detail(slug) });
  useEffect(() => { if (provider) { document.title = `${provider.companyName} | AgroTraders`; setType(provider.categories[0] || SERVICE_TYPES[0]); } }, [provider]);
  if (!provider) return <main className="p-12 text-center">Loading…</main>;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await api.services.enquire(slug, { serviceType: type, message, quantity: quantity ? Number(quantity) : undefined, location: location || undefined, neededDate: neededDate || undefined });
    setSent(true);
  };
  return <main className="mx-auto max-w-5xl px-4 py-8"><div className="grid gap-8 md:grid-cols-[1fr_360px]"><section><h1 className="font-display text-3xl font-extrabold">{provider.companyName}</h1><p className="mt-3 text-ink-soft">{provider.description}</p>{provider.photos[0] && <img src={assetUrl(provider.photos[0])} alt="" className="mt-5 h-72 w-full rounded-xl object-cover"/>}<h2 className="mt-6 text-xl font-bold">Capabilities</h2><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><p>Services: {provider.categories.map(label).join(', ')}</p><p>Cities: {provider.citiesServed.join(', ')}</p><p>Capacity: {provider.capacityPerDay || 'On request'} {provider.capacityUnit || ''}/day</p><p>Certifications: {provider.certifications.join(', ') || 'On request'}</p><p>Minimum order: {provider.minOrderQty || 'On request'}</p><p>Turnaround: {provider.turnaroundDays ? `${provider.turnaroundDays} days` : 'On request'}</p><p>Pricing: {provider.pricingBasis || 'On request'}</p><p>Rating: ★ {provider.rating || 'New'}</p></div></section><aside className="h-fit rounded-xl border border-surface-border bg-white p-5 shadow-card"><h2 className="text-lg font-bold">Enquire or book</h2>{sent ? <p className="mt-4 rounded-md bg-brand-surface p-3 text-brand">Enquiry sent. The provider will contact you.</p> : user ? <form onSubmit={submit} className="mt-4 space-y-3"><select value={type} onChange={(event) => setType(event.target.value)} className="h-10 w-full rounded-md border px-2">{provider.categories.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select><input type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" className="h-10 w-full rounded-md border px-3"/><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Job location" className="h-10 w-full rounded-md border px-3"/><input type="date" value={neededDate} onChange={(event) => setNeededDate(event.target.value)} className="h-10 w-full rounded-md border px-3"/><textarea required minLength={10} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the job and requirements" className="h-32 w-full rounded-md border p-3"/><button className="w-full rounded-md bg-brand px-4 py-3 font-bold text-white">Send enquiry</button></form> : <Link to={`/login?from=${encodeURIComponent(`/services/provider/${slug}`)}`} className="mt-4 block rounded-md bg-brand px-4 py-3 text-center font-bold text-white">Sign in to enquire</Link>}</aside></div></main>;
}
