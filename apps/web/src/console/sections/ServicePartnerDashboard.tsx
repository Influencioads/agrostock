import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card } from '@agrotraders/ui';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Enquiry = {
  id: string; reference: string; serviceType: string; message: string; quantity: number | null;
  location: string | null; neededDate: string | null; status: string; createdAt: string;
  customer: { name: string; email: string };
};
type Dashboard = {
  provider: { companyName: string; status: 'pending' | 'approved' | 'rejected' | 'suspended' } | null;
  enquiries: Enquiry[]; total: number; new: number; pending: number; completed: number;
};
const statuses = ['requested', 'contacted', 'accepted', 'rejected', 'completed'];
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function ServicePartnerDashboard() {
  const { activeRole } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery<Dashboard>({ queryKey: ['service-dashboard', activeRole], queryFn: () => api.services.dashboard() as Promise<Dashboard> });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.services.updateEnquiry(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-dashboard'] }),
  });
  if (isLoading || !data) return <p>Loading dashboard…</p>;
  if (!data.provider) return <Card className="py-12 text-center"><h2 className="text-xl font-bold">Service provider application required</h2><p className="mt-2 text-ink-soft">No provider profile is linked to this account. Contact support or complete service-provider signup.</p></Card>;

  const approval = data.provider.status;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-2xl font-extrabold">{data.provider.companyName}</h2><p className="text-ink-soft">{label(activeRole)} dashboard · Manage customer enquiries.</p></div><Badge tone={approval === 'approved' ? 'green' : approval === 'rejected' || approval === 'suspended' ? 'error' : 'warn'}>{label(approval)}</Badge></div>
    {approval !== 'approved' && <Card className="border-status-warn bg-status-warn/5"><b>{approval === 'pending' ? 'Your application is pending Admin approval.' : `Your provider account is ${approval}.`}</b><p className="mt-1 text-sm text-ink-soft">Your company will not appear publicly until it is approved and published.</p></Card>}
    <div className="grid gap-3 sm:grid-cols-4">{[['Total', data.total], ['New', data.new], ['Pending', data.pending], ['Completed', data.completed]].map(([name, value]) => <Card key={name} className="py-4"><p className="text-xs font-bold uppercase text-ink-soft">{name}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></Card>)}</div>
    <section className="overflow-hidden rounded-xl border border-surface-border bg-white"><div className="border-b p-4"><h3 className="font-bold">Customer enquiries</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-surface-bg"><tr><th className="p-3">Customer</th><th className="p-3">Service</th><th className="p-3">Quantity</th><th className="p-3">Location</th><th className="p-3">Needed date</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{data.enquiries.map((enquiry) => <tr key={enquiry.id} className="border-t align-top"><td className="p-3"><b>{enquiry.customer.name}</b><br/><span className="text-xs text-ink-soft">{enquiry.customer.email}</span></td><td className="p-3">{label(enquiry.serviceType)}<br/><span className="text-xs text-ink-soft">{enquiry.reference}</span></td><td className="p-3">{enquiry.quantity ?? '—'}</td><td className="p-3">{enquiry.location || '—'}</td><td className="p-3">{enquiry.neededDate ? new Date(enquiry.neededDate).toLocaleDateString() : '—'}</td><td className="p-3"><select value={enquiry.status} disabled={update.isPending} onChange={(event) => update.mutate({ id: enquiry.id, status: event.target.value })} className="rounded border px-2 py-1">{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></td><td className="p-3"><Button size="sm" variant="outline" onClick={() => setOpen(open === enquiry.id ? null : enquiry.id)}>{open === enquiry.id ? 'Hide' : 'View enquiry'}</Button>{open === enquiry.id && <div className="mt-2 min-w-64 rounded bg-surface-bg p-3 text-sm"><p>{enquiry.message}</p><p className="mt-2 text-xs text-ink-soft">Received {new Date(enquiry.createdAt).toLocaleString()}</p></div>}</td></tr>)}{data.enquiries.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-ink-soft">No enquiries yet.</td></tr>}</tbody></table></div></section>
  </div>;
}
