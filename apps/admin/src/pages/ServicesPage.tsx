import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input } from '@agrotraders/ui';
import { api } from '../lib/api';

const SERVICE_TYPES = ['accounting', 'customs_clearance', 'financial_services', 'fulfillment', 'packing', 'roasting', 'roasting_salting', 'chopping', 'blanching', 'pitting', 'sorting_grading'];
const SERVICE_ROLES = new Set(['accountant', 'packer', 'processor', 'fulfillment_partner', 'finance_partner']);
const emptyForm = {
  ownerId: '', companyName: '', slug: '', description: '', categories: [] as string[], cities: '',
  capacityPerDay: '', capacityUnit: '', certifications: '', minOrderQty: '', turnaroundDays: '',
  pricingBasis: '', minPrice: '', maxPrice: '', photos: '', published: true,
};
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const optionalNumber = (value: string, cents = false) => value.trim() ? Number(value) * (cents ? 100 : 1) : undefined;

export function ServicesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { data = [] } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.admin.serviceProviders(),
  });
  const { data: enquiries = [] } = useQuery({ queryKey: ['admin-service-enquiries'], queryFn: () => api.admin.serviceEnquiries() });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users', 'service-owners'], queryFn: () => api.admin.users() });
  const owners = users.filter((user) => [user.role, ...(user.roles ?? [])].some((role) => SERVICE_ROLES.has(role)));
  const create = useMutation({
    mutationFn: () => api.admin.createServiceProvider({
      ownerId: form.ownerId,
      companyName: form.companyName.trim(),
      slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: form.description.trim() || undefined,
      categories: form.categories,
      citiesServed: list(form.cities),
      capacityPerDay: optionalNumber(form.capacityPerDay),
      capacityUnit: form.capacityUnit.trim() || undefined,
      certifications: list(form.certifications),
      minOrderQty: optionalNumber(form.minOrderQty),
      turnaroundDays: optionalNumber(form.turnaroundDays),
      pricingBasis: form.pricingBasis || undefined,
      minPriceCents: optionalNumber(form.minPrice, true),
      maxPriceCents: optionalNumber(form.maxPrice, true),
      photos: list(form.photos),
      published: form.published,
    }),
    onSuccess: () => {
      setForm(emptyForm); setShowCreate(false); setError('');
      void qc.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (e: unknown) => {
      const message = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Could not create the service provider.');
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { published?: boolean; status?: 'pending' | 'approved' | 'rejected' | 'suspended' } }) =>
      api.admin.updateServiceProvider(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-services'] }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-display text-2xl font-extrabold">Service providers</h2><p className="mt-1 text-ink-soft">Review listings, categories, coverage and publication status.</p></div>
        <Button onClick={() => setShowCreate((open) => !open)}>{showCreate ? 'Cancel' : 'Add service provider'}</Button>
      </div>
      {showCreate && <Card className="mt-5 space-y-4">
        <h3 className="font-display text-lg font-bold">New service provider</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">Owner account<select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-surface-border bg-white px-3"><option value="">Select an approved service-role user</option>{owners.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></label>
          <Input label="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <Input label="URL slug" placeholder="acme-accounting" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <Input label="Cities served (comma-separated)" placeholder="Moscow, Kazan" value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} />
          <Input label="Capacity per day" type="number" value={form.capacityPerDay} onChange={(e) => setForm({ ...form, capacityPerDay: e.target.value })} />
          <Input label="Capacity unit" placeholder="kg, ton, lots" value={form.capacityUnit} onChange={(e) => setForm({ ...form, capacityUnit: e.target.value })} />
          <Input label="Certifications (comma-separated)" placeholder="FSSAI, ISO, HACCP" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} />
          <Input label="Minimum order quantity" type="number" value={form.minOrderQty} onChange={(e) => setForm({ ...form, minOrderQty: e.target.value })} />
          <Input label="Turnaround days" type="number" value={form.turnaroundDays} onChange={(e) => setForm({ ...form, turnaroundDays: e.target.value })} />
          <label className="text-sm font-semibold">Pricing basis<select value={form.pricingBasis} onChange={(e) => setForm({ ...form, pricingBasis: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-surface-border bg-white px-3"><option value="">On request</option><option value="per_kg">Per kg</option><option value="per_ton">Per ton</option><option value="per_lot">Per lot</option></select></label>
          <Input label="Minimum price" type="number" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} />
          <Input label="Maximum price" type="number" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} />
          <Input label="Photo URLs (comma-separated)" value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} />
        </div>
        <label className="block text-sm font-semibold">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-24 w-full rounded-md border border-surface-border p-3" /></label>
        <fieldset><legend className="text-sm font-semibold">Service categories</legend><div className="mt-2 flex flex-wrap gap-3">{SERVICE_TYPES.map((type) => <label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.categories.includes(type)} onChange={(e) => setForm({ ...form, categories: e.target.checked ? [...form.categories, type] : form.categories.filter((item) => item !== type) })} />{label(type)}</label>)}</div></fieldset>
        <p className="text-sm text-ink-soft">New providers start as Pending Approval. Approve the provider from the table after reviewing its application.</p>
        {owners.length === 0 && <p className="text-sm text-status-warn">Create a user with an Accountant, Packer, Processor, Fulfillment Partner, or Finance Partner role first.</p>}
        {error && <p className="text-sm font-semibold text-status-error">{error}</p>}
        <Button disabled={!form.ownerId || !form.companyName.trim() || !form.slug.trim() || form.categories.length === 0 || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create provider'}</Button>
      </Card>}
      <div className="mt-5 overflow-x-auto rounded-xl border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-bg">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Services</th>
              <th className="p-3">Cities</th>
              <th className="p-3">Enquiries</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((provider) => (
              <tr key={provider.id} className="border-t">
                <td className="p-3 font-semibold">{provider.companyName}</td>
                <td className="p-3">{provider.categories.join(', ')}</td>
                <td className="p-3">{provider.citiesServed.join(', ')}</td>
                <td className="p-3">{provider._count?.enquiries || 0}</td>
                <td className="p-3">
                  <button
                    disabled={provider.status !== 'approved'}
                    onClick={() => toggle.mutate({ id: provider.id, body: { published: !provider.published } })}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${provider.published ? 'bg-brand-surface text-brand' : 'bg-surface-bg text-ink-soft'}`}
                  >
                    {provider.published ? 'Published' : 'Hidden'}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {provider.status !== 'approved' && <button onClick={() => toggle.mutate({ id: provider.id, body: { status: 'approved', published: true } })} className="rounded bg-status-success px-2 py-1 text-xs font-bold text-white">Approve</button>}
                    {provider.status !== 'rejected' && <button onClick={() => toggle.mutate({ id: provider.id, body: { status: 'rejected' } })} className="rounded bg-status-error px-2 py-1 text-xs font-bold text-white">Reject</button>}
                    {provider.status !== 'suspended' && <button onClick={() => toggle.mutate({ id: provider.id, body: { status: 'suspended' } })} className="rounded bg-status-warn px-2 py-1 text-xs font-bold text-white">Suspend</button>}
                  </div>
                  <div className="mt-1 text-xs capitalize text-ink-soft">{provider.status}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="mt-8 font-display text-xl font-bold">Service enquiries</h3>
      <div className="mt-3 overflow-x-auto rounded-xl border border-surface-border bg-white"><table className="w-full text-left text-sm"><thead className="bg-surface-bg"><tr><th className="p-3">Reference</th><th className="p-3">Provider</th><th className="p-3">Customer</th><th className="p-3">Service</th><th className="p-3">Quantity / location</th><th className="p-3">Needed</th><th className="p-3">Status</th></tr></thead><tbody>{enquiries.map((enquiry) => <tr key={enquiry.id} className="border-t"><td className="p-3 font-semibold">{enquiry.reference}</td><td className="p-3">{enquiry.provider.companyName}</td><td className="p-3">{enquiry.customer.name}<br/><span className="text-xs text-ink-soft">{enquiry.customer.email}</span></td><td className="p-3">{label(enquiry.serviceType)}</td><td className="p-3">{enquiry.quantity ?? '—'}<br/><span className="text-xs text-ink-soft">{enquiry.location || '—'}</span></td><td className="p-3">{enquiry.neededDate ? new Date(enquiry.neededDate).toLocaleDateString() : '—'}</td><td className="p-3">{label(enquiry.status)}</td></tr>)}{enquiries.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-ink-soft">No service enquiries yet.</td></tr>}</tbody></table></div>
    </div>
  );
}
