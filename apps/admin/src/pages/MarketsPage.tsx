import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiMarket } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';

const blank = { name: '', country: '', city: '', region: '', flag: '' };

/** Markets / mandis sellers attach to — admin CRUD (mirrors CategoriesPage). */
export function MarketsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const { data: markets = [] } = useQuery<ApiMarket[]>({
    queryKey: ['admin-markets'],
    queryFn: () => api.admin.markets(),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-markets'] });
    void qc.invalidateQueries({ queryKey: ['admin-stats'] });
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setErr('');
    try {
      if (editing) await api.admin.updateMarket(editing, form);
      else await api.admin.createMarket(form);
      setForm(blank);
      setEditing(null);
      refresh();
    } catch {
      setErr(t('marketsAdmin.saveError'));
    }
  };

  const startEdit = (m: ApiMarket) => {
    setEditing(m.id);
    setForm({ name: m.name, country: m.country, city: m.city ?? '', region: m.region ?? '', flag: m.flag ?? '' });
  };

  const toggleActive = async (m: ApiMarket) => {
    setErr('');
    try {
      await api.admin.updateMarket(m.id, { active: !(m.active ?? true) });
      refresh();
    } catch (e) {
      setErr(errMessage(e, t('genericError')));
    }
  };

  const decide = async (m: ApiMarket, approved: boolean) => {
    setErr('');
    try {
      await (approved ? api.admin.approveMarket(m.id) : api.admin.rejectMarket(m.id));
      refresh();
    } catch (e) {
      setErr(errMessage(e, t('genericError')));
    }
  };

  // Seller-proposed markets awaiting review. They are invisible to everyone but
  // their creator until approved, so this queue is what makes them public.
  const pending = markets.filter((m) => m.status === 'pending');

  return (
    <div>
      <PageHeader title={t('page.markets.title')} subtitle={t('page.markets.subtitle', { count: markets.length })} />

      {pending.length > 0 && (
        <Card className="mb-5 border-mango/50">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-display font-bold text-ink">{t('marketsAdmin.proposals')}</h3>
            <Badge tone="warn">{t('marketsAdmin.awaiting', { count: pending.length })}</Badge>
          </div>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border px-3 py-2">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{m.flag} {m.name}</div>
                  <div className="text-xs text-ink-soft">
                    {[m.city, m.region, m.country].filter(Boolean).join(' · ')}
                    {m.createdBy ? ` · ${t('marketsAdmin.proposedBy', { name: m.createdBy.name })}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => decide(m, true)}>{t('marketsAdmin.approve')}</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(m, false)}>{t('marketsAdmin.reject')}</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card>
          <h3 className="font-display font-bold text-ink">{editing ? t('marketsAdmin.editMarket') : t('marketsAdmin.addMarket')}</h3>
          <div className="mt-3 space-y-3">
            {(
              [
                ['name', 'marketsAdmin.fName', 'marketsAdmin.phName'],
                ['country', 'marketsAdmin.fCountry', 'marketsAdmin.phCountry'],
                ['city', 'marketsAdmin.fCity', 'marketsAdmin.phCity'],
                ['region', 'marketsAdmin.fRegion', 'marketsAdmin.phRegion'],
                ['flag', 'marketsAdmin.fFlag', 'marketsAdmin.phFlag'],
              ] as const
            ).map(([k, labelKey, phKey]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">{t(labelKey)}</span>
                <input
                  value={form[k]}
                  onChange={set(k)}
                  placeholder={t(phKey)}
                  className="h-10 w-full rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
                />
              </label>
            ))}
            {err && <p className="text-xs text-status-error">{err}</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={!form.name || !form.country} leftIcon={<Icon name="check" size={15} />}>
                {editing ? t('marketsAdmin.save') : t('marketsAdmin.addMarket')}
              </Button>
              {editing && (
                <Button variant="ghost" onClick={() => { setEditing(null); setForm(blank); }}>
                  {t('common:cancel')}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">{t('common:table.market')}</th>
                  <th className="px-5 py-3">{t('common:table.country')}</th>
                  <th className="px-5 py-3">{t('common:table.products')}</th>
                  <th className="px-5 py-3">{t('common:table.sellers')}</th>
                  <th className="px-5 py-3">{t('common:table.status')}</th>
                  <th className="px-5 py-3 text-end">{t('common:table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m) => (
                  <tr key={m.id} className="border-b border-surface-border/70 last:border-0 hover:bg-brand-surface/30">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">{m.flag} {m.name}</div>
                      <div className="text-xs text-ink-soft">{m.city} · {m.region}</div>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{m.country}</td>
                    <td className="px-5 py-3 text-ink-soft">{m._count?.products ?? 0}</td>
                    <td className="px-5 py-3 text-ink-soft">{m._count?.profiles ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.status === 'pending' && <Badge tone="warn">{t('marketsAdmin.pending')}</Badge>}
                        {m.status === 'rejected' && <Badge tone="error">{t('marketsAdmin.rejected')}</Badge>}
                        <Badge tone={(m.active ?? true) ? 'green' : 'slate'}>{(m.active ?? true) ? t('marketsAdmin.active') : t('marketsAdmin.hidden')}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(m)}>{t('marketsAdmin.edit')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(m)}>
                          {(m.active ?? true) ? t('marketsAdmin.hide') : t('marketsAdmin.show')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
