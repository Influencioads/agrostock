import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import type { ApiOffice } from '@agrotraders/api-client';
import { GMT_OFFSETS, normalizeGmt } from '@agrotraders/geo';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

type OfficeForm = Omit<ApiOffice, 'id'>;
const EMPTY: OfficeForm = { flag: '', name: '', type: 'Regional HQ', city: '', mgr: '', tz: '', langs: '', staff: 0 };

function OfficeEditor({ initial, onCancel, onSave, saving }: { initial: OfficeForm; onCancel: () => void; onSave: (f: OfficeForm) => void; saving: boolean }) {
  const { t } = useI18n();
  const [form, setForm] = useState<OfficeForm>(initial);
  const set = (k: keyof OfficeForm, v: string | number) => setForm({ ...form, [k]: v });
  return (
    <Card className="mb-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label={t('officesAdmin.fFlag')} value={form.flag} onChange={(e) => set('flag', e.target.value)} />
        <Input label={t('officesAdmin.fName')} value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input label={t('officesAdmin.fType')} value={form.type} onChange={(e) => set('type', e.target.value)} />
        <Input label={t('officesAdmin.fCity')} value={form.city} onChange={(e) => set('city', e.target.value)} />
        <Input label={t('officesAdmin.fManager')} value={form.mgr} onChange={(e) => set('mgr', e.target.value)} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('officesAdmin.fTimezone')}</span>
          <select
            value={normalizeGmt(form.tz)}
            onChange={(e) => set('tz', e.target.value)}
            className="h-11 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
          >
            <option value="">{t('officesAdmin.pickTimezone')}</option>
            {GMT_OFFSETS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <Input label={t('officesAdmin.fLanguages')} value={form.langs ?? ''} onChange={(e) => set('langs', e.target.value)} />
        <Input label={t('officesAdmin.fStaff')} value={String(form.staff)} onChange={(e) => set('staff', Number(e.target.value) || 0)} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button disabled={!form.name || !form.city || saving} onClick={() => onSave(form)}>
          {saving ? t('officesAdmin.saving') : t('officesAdmin.save')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('common:cancel')}
        </Button>
      </div>
    </Card>
  );
}

export function OfficesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ApiOffice | null>(null);

  const { data: offices = [], isLoading } = useQuery<ApiOffice[]>({ queryKey: ['offices'], queryFn: () => api.offices.list(), retry: 1 });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['offices'] });

  const create = useMutation({
    mutationFn: (f: OfficeForm) => api.admin.createOffice(f),
    onSuccess: () => {
      setAdding(false);
      invalidate();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, f }: { id: string; f: OfficeForm }) => api.admin.updateOffice(id, f),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => api.admin.deleteOffice(id), onSuccess: invalidate });

  return (
    <div>
      <PageHeader
        title={t('page.offices.title')}
        subtitle={t('page.offices.subtitle', { count: offices.length })}
        action={
          <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => { setAdding(true); setEditing(null); }}>
            {t('officesAdmin.addOffice')}
          </Button>
        }
      />

      {adding && <OfficeEditor initial={EMPTY} saving={create.isPending} onCancel={() => setAdding(false)} onSave={(f) => create.mutate(f)} />}
      {editing && (
        <OfficeEditor
          initial={{ flag: editing.flag, name: editing.name, type: editing.type, city: editing.city, mgr: editing.mgr, tz: editing.tz, langs: editing.langs, staff: editing.staff }}
          saving={update.isPending}
          onCancel={() => setEditing(null)}
          onSave={(f) => update.mutate({ id: editing.id, f })}
        />
      )}

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offices.map((o) => (
            <Card key={o.id}>
              <div className="flex items-start justify-between">
                <span className="text-3xl">{o.flag}</span>
                <Badge tone="green">{o.type}</Badge>
              </div>
              <div className="mt-2 font-display text-lg font-bold text-ink">{o.name}</div>
              <div className="text-sm text-ink-soft">{o.city}</div>
              <div className="mt-3 flex items-center justify-between text-sm text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <Icon name="user" size={14} /> {o.mgr}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="worker" size={14} /> {o.staff}
                </span>
              </div>
              <div className="mt-3 flex gap-2 border-t border-surface-border pt-3">
                <Button size="sm" variant="outline" onClick={() => { setEditing(o); setAdding(false); }}>
                  {t('officesAdmin.edit')}
                </Button>
                <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(o.id)}>
                  {t('officesAdmin.delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
