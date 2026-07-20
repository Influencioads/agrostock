import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal } from '@agrotraders/ui';
import type { ApiLoaderWorker, ApiLoaderTeam } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { usd } from '../lib';
import { TagInput } from '../../components/TagInput';

const STATUS_TONE = { on_site: 'info', available: 'green', off: 'slate' } as const;

// ── Workers ───────────────────────────────────────────────────────────────
interface WorkerForm {
  name: string;
  phone: string;
  skill: string;
  wage: string; // dollars
  teamId: string;
  originCity: string;
  originCountry: string;
  operatingCities: string[];
  operatingCountries: string[];
  minWorkHours: string;
  withLogin: boolean;
  loginHandle: string;
  loginPassword: string;
}
const emptyForm: WorkerForm = {
  name: '', phone: '', skill: '', wage: '', teamId: '',
  originCity: '', originCountry: '', operatingCities: [], operatingCountries: [], minWorkHours: '',
  withLogin: false, loginHandle: '', loginPassword: '',
};

export function LoaderWorkers() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ApiLoaderWorker | null>(null);
  const [form, setForm] = useState<WorkerForm>(emptyForm);

  const { data: workers = [] } = useQuery<ApiLoaderWorker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers() });
  const { data: teams = [] } = useQuery<ApiLoaderTeam[]>({ queryKey: ['teams'], queryFn: () => api.loaders.teams() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['workers'] });
  const set = (patch: Partial<WorkerForm>) => setForm((f) => ({ ...f, ...patch }));

  const add = useMutation({
    mutationFn: () => api.loaders.addWorker({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      skill: form.skill.trim() || undefined,
      dailyWageCents: form.wage ? Math.round(Number(form.wage) * 100) : undefined,
      teamId: form.teamId || undefined,
      originCity: form.originCity.trim() || undefined,
      originCountry: form.originCountry.trim() || undefined,
      operatingCities: form.operatingCities,
      operatingCountries: form.operatingCountries,
      minWorkHours: form.minWorkHours.trim() && Number.isFinite(Number(form.minWorkHours)) ? Number(form.minWorkHours) : undefined,
      loginHandle: form.withLogin ? (form.loginHandle.trim() || form.phone.trim()) : undefined,
      loginPassword: form.withLogin ? form.loginPassword : undefined,
    }),
    onSuccess: () => { refresh(); setAddOpen(false); setForm(emptyForm); },
  });
  const update = useMutation({
    mutationFn: (b: { id: string; data: Parameters<typeof api.loaders.updateWorker>[1] }) => api.loaders.updateWorker(b.id, b.data),
    onSuccess: () => { refresh(); setEditing(null); },
  });
  const del = useMutation({ mutationFn: (id: string) => api.loaders.delWorker(id), onSuccess: refresh });

  const loginInvalid = form.withLogin && (!(form.loginHandle.trim() || form.phone.trim()) || form.loginPassword.length < 6);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.nav.workers')}</h2>
        <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }} leftIcon={<Icon name="plus" size={16} />}>{t('console.loaderco.addWorker')}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((w) => (
          <Card key={w.id}>
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-ink">{w.name}</span>
              <Badge tone={STATUS_TONE[w.status as keyof typeof STATUS_TONE] ?? 'slate'}>{t(`console.dash.workerStatus.${w.status}`, { defaultValue: w.status.replace('_', ' ') })}</Badge>
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-ink-soft">
              <div>{w.skill ?? t('console.loaderco.generalCrew')} · ★ {w.rating ?? '—'}{w.team?.name ? ` · ${w.team.name}` : ''}</div>
              {w.phone && <div className="flex items-center gap-1"><Icon name="phone" size={11} /> {w.phone}</div>}
              {w.dailyWageCents != null && <div>{t('console.seller.perDay', { amount: usd(w.dailyWageCents) })}</div>}
              <div>{w.user ? <span className="font-semibold text-brand-dark">{t('console.loaderco.loginEnabled')}</span> : t('console.loaderco.noLogin')}</div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" fullWidth onClick={() => setEditing(w)}>{t('console.loaderco.edit')}</Button>
              <Button variant="ghost" size="sm" onClick={() => del.mutate(w.id)} disabled={del.isPending}>{t('console.loaderco.remove')}</Button>
            </div>
          </Card>
        ))}
        {workers.length === 0 && <Card className="py-8 text-center text-ink-soft sm:col-span-2 lg:col-span-3">{t('console.dash.noWorkers')}</Card>}
      </div>

      {/* Add worker */}
      <Modal closeLabel={t('common:close')} open={addOpen} onClose={() => setAddOpen(false)} title={t('console.loaderco.addWorkerTitle')}
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>{t('common:cancel')}</Button>
          <Button onClick={() => add.mutate()} disabled={add.isPending || !form.name.trim() || loginInvalid}>{t('console.loaderco.add')}</Button></>}>
        <div className="space-y-3">
          <Input label={t('console.loaderco.fullName')} placeholder="Imran Sheikh" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('console.order.phone')} placeholder="+92 300 …" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            <Input label={t('console.loaderco.skill')} placeholder={t('console.ph.skill')} value={form.skill} onChange={(e) => set({ skill: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('console.loaderco.dailyWage')} placeholder="20" value={form.wage} onChange={(e) => set({ wage: e.target.value })} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.loaderco.team')}</span>
              <select value={form.teamId} onChange={(e) => set({ teamId: e.target.value })} className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf">
                <option value="">{t('console.loaderco.noTeam')}</option>
                {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('page.register.country')} placeholder={t('console.ph.country')} value={form.originCountry} onChange={(e) => set({ originCountry: e.target.value })} />
            <Input label={t('page.register.cityRegion')} placeholder={t('console.ph.city')} value={form.originCity} onChange={(e) => set({ originCity: e.target.value })} />
          </div>
          <TagInput label={t('page.register.operatingCountries')} value={form.operatingCountries} onChange={(v) => set({ operatingCountries: v })} placeholder={t('page.register.phCountries')} hint={t('page.register.tagHint')} />
          <TagInput label={t('page.register.operatingCities')} value={form.operatingCities} onChange={(v) => set({ operatingCities: v })} placeholder={t('page.register.phCities')} hint={t('page.register.tagHint')} />
          <Input label={t('page.register.minWorkHours')} type="number" min={0} placeholder="4" value={form.minWorkHours} onChange={(e) => set({ minWorkHours: e.target.value })} />
          <label className="flex cursor-pointer items-center gap-2 pt-1">
            <input type="checkbox" checked={form.withLogin} onChange={(e) => set({ withLogin: e.target.checked })} className="h-4 w-4 accent-brand-leaf" />
            <span className="text-sm font-semibold text-ink">{t('console.loaderco.createLogin')}</span>
          </label>
          {form.withLogin && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-bg p-3">
              <Input label={t('console.loaderco.loginHandle')} placeholder={t('console.loaderco.defaultsToPhone')} value={form.loginHandle} onChange={(e) => set({ loginHandle: e.target.value })} />
              <Input label={t('console.loaderco.tempPassword')} type="text" placeholder={t('console.loaderco.min6')} value={form.loginPassword} onChange={(e) => set({ loginPassword: e.target.value })} />
            </div>
          )}
        </div>
      </Modal>

      {/* Edit worker */}
      {editing && <EditWorkerModal worker={editing} teams={teams} saving={update.isPending} onClose={() => setEditing(null)}
        onSave={(data) => update.mutate({ id: editing.id, data })} />}
    </div>
  );
}

function EditWorkerModal({ worker, teams, saving, onClose, onSave }: {
  worker: ApiLoaderWorker;
  teams: ApiLoaderTeam[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: Parameters<typeof api.loaders.updateWorker>[1]) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(worker.name);
  const [phone, setPhone] = useState(worker.phone ?? '');
  const [skill, setSkill] = useState(worker.skill ?? '');
  const [wage, setWage] = useState(worker.dailyWageCents != null ? String(worker.dailyWageCents / 100) : '');
  const [teamId, setTeamId] = useState(worker.team?.id ?? '');
  const [status, setStatus] = useState(worker.status);
  const [originCity, setOriginCity] = useState(worker.originCity ?? '');
  const [originCountry, setOriginCountry] = useState(worker.originCountry ?? '');
  const [operatingCities, setOperatingCities] = useState<string[]>(worker.operatingCities ?? []);
  const [operatingCountries, setOperatingCountries] = useState<string[]>(worker.operatingCountries ?? []);
  const [minWorkHours, setMinWorkHours] = useState(worker.minWorkHours != null ? String(worker.minWorkHours) : '');
  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={t('console.loaderco.editWorker')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button>
        <Button disabled={saving || !name.trim()} onClick={() => onSave({
          name: name.trim(), phone: phone.trim(), skill: skill.trim(),
          dailyWageCents: wage ? Math.round(Number(wage) * 100) : undefined,
          teamId: teamId || null, status,
          originCity: originCity.trim(), originCountry: originCountry.trim(),
          operatingCities, operatingCountries,
          minWorkHours: minWorkHours.trim() && Number.isFinite(Number(minWorkHours)) ? Number(minWorkHours) : undefined,
        })}>{t('console.loaderco.save')}</Button></>}>
      <div className="space-y-3">
        <Input label={t('console.loaderco.fullName')} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('console.order.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label={t('console.loaderco.skill')} value={skill} onChange={(e) => setSkill(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('console.loaderco.dailyWage')} value={wage} onChange={(e) => setWage(e.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.loaderco.team')}</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf">
              <option value="">{t('console.loaderco.noTeam')}</option>
              {teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.loaderco.availability')}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf">
            <option value="available">{t('console.loaderco.available')}</option>
            <option value="on_site">{t('console.loaderco.onSite')}</option>
            <option value="off">{t('console.loaderco.offDuty')}</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('page.register.country')} value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} />
          <Input label={t('page.register.cityRegion')} value={originCity} onChange={(e) => setOriginCity(e.target.value)} />
        </div>
        <TagInput label={t('page.register.operatingCountries')} value={operatingCountries} onChange={setOperatingCountries} placeholder={t('page.register.phCountries')} hint={t('page.register.tagHint')} />
        <TagInput label={t('page.register.operatingCities')} value={operatingCities} onChange={setOperatingCities} placeholder={t('page.register.phCities')} hint={t('page.register.tagHint')} />
        <Input label={t('page.register.minWorkHours')} type="number" min={0} value={minWorkHours} onChange={(e) => setMinWorkHours(e.target.value)} />
      </div>
    </Modal>
  );
}

// ── Teams ─────────────────────────────────────────────────────────────────
export function LoaderTeams() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: teams = [] } = useQuery<ApiLoaderTeam[]>({ queryKey: ['teams'], queryFn: () => api.loaders.teams() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['teams'] });
  const add = useMutation({ mutationFn: () => api.loaders.addTeam(name.trim()), onSuccess: () => { refresh(); setAddOpen(false); setName(''); } });
  const detail = teams.find((t) => t.id === detailId) ?? null;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.nav.teams')}</h2>
        <Button onClick={() => setAddOpen(true)} leftIcon={<Icon name="plus" size={16} />}>{t('console.loaderco.addTeam')}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((tm) => (
          <Card key={tm.id} className="cursor-pointer transition hover:border-brand-leaf" onClick={() => setDetailId(tm.id)}>
            <Icon name="grid" size={22} className="text-brand-dark" />
            <div className="mt-2 font-display font-bold text-ink">{tm.name}</div>
            <div className="text-xs text-ink-soft">{t('console.dash.workersCount', { count: tm._count?.workers ?? tm.workers?.length ?? 0 })}</div>
            {(tm.workers ?? []).length > 0 && (
              <div className="mt-1 truncate text-xs text-ink-soft">{(tm.workers ?? []).map((w) => w.name).join(', ')}</div>
            )}
          </Card>
        ))}
        {teams.length === 0 && <Card className="py-8 text-center text-ink-soft sm:col-span-2 lg:col-span-3">{t('console.loaderco.noTeams')}</Card>}
      </div>

      <Modal closeLabel={t('common:close')} open={addOpen} onClose={() => setAddOpen(false)} title={t('console.loaderco.addTeamTitle')}
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>{t('common:cancel')}</Button>
          <Button onClick={() => add.mutate()} disabled={add.isPending || !name.trim()}>{t('console.loaderco.add')}</Button></>}>
        <Input label={t('console.loaderco.teamName')} placeholder={t('console.ph.teamName')} value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>

      {detail && <TeamDetailModal team={detail} onClose={() => setDetailId(null)} onChanged={refresh} />}
    </div>
  );
}

function TeamDetailModal({ team, onClose, onChanged }: { team: ApiLoaderTeam; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState(team.name);
  const { data: workers = [] } = useQuery<ApiLoaderWorker[]>({ queryKey: ['workers'], queryFn: () => api.loaders.workers() });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['workers'] }); onChanged(); };

  const members = useMemo(() => workers.filter((w) => w.team?.id === team.id), [workers, team.id]);
  const available = useMemo(() => workers.filter((w) => w.team?.id !== team.id), [workers, team.id]);

  const rename = useMutation({ mutationFn: () => api.loaders.updateTeam(team.id, name.trim()), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: () => api.loaders.delTeam(team.id), onSuccess: () => { refresh(); onClose(); } });
  const setTeam = useMutation({ mutationFn: (v: { id: string; teamId: string | null }) => api.loaders.updateWorker(v.id, { teamId: v.teamId }), onSuccess: refresh });

  return (
    <Modal closeLabel={t('common:close')} open onClose={onClose} title={t('console.loaderco.teamTitle')} className="max-w-lg"
      footer={<><Button variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending}>{t('console.loaderco.deleteTeam')}</Button>
        <Button onClick={onClose}>{t('console.order.done')}</Button></>}>
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1"><Input label={t('console.loaderco.teamName')} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button variant="secondary" onClick={() => rename.mutate()} disabled={rename.isPending || name.trim() === team.name}>{t('console.loaderco.rename')}</Button>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('console.loaderco.members', { count: members.length })}</h4>
          <div className="space-y-1.5">
            {members.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2">
                <span className="text-sm font-semibold text-ink">{w.name}</span>
                <button className="text-xs font-bold text-status-error hover:underline" disabled={setTeam.isPending} onClick={() => setTeam.mutate({ id: w.id, teamId: null })}>{t('console.loaderco.remove')}</button>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-ink-soft">{t('console.loaderco.noMembers')}</p>}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('console.loaderco.addMembers')}</h4>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {available.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-md px-3 py-1.5 hover:bg-surface-bg">
                <span className="text-sm text-ink">{w.name}{w.team?.name ? <span className="text-xs text-ink-soft"> {t('console.loaderco.inTeam', { team: w.team.name })}</span> : null}</span>
                <button className="text-xs font-bold text-brand hover:underline" disabled={setTeam.isPending} onClick={() => setTeam.mutate({ id: w.id, teamId: team.id })}>{t('console.loaderco.add')}</button>
              </div>
            ))}
            {available.length === 0 && <p className="text-sm text-ink-soft">{t('console.loaderco.allOnTeam')}</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
