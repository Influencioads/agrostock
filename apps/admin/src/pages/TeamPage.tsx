import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Input } from '@agrotraders/ui';
import type { AdminPermission, ApiUser } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, permissionLabelKey } from '../lib/permissions';

/** Grouped permission checkboxes shared by the create form and the per-row editor. */
function PermissionMatrix({
  value,
  onChange,
}: {
  value: AdminPermission[];
  onChange: (next: AdminPermission[]) => void;
}) {
  const { t } = useI18n();
  const toggle = (p: AdminPermission) =>
    onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onChange([...ALL_PERMISSIONS])}>
          {t('team.selectAll')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onChange([])}>
          {t('team.clear')}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PERMISSION_GROUPS.map((g) => (
          <div key={g.group} className="rounded-lg border border-surface-border p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft">{t(`navGroup.${g.group}`)}</p>
            <div className="space-y-1.5">
              {g.perms.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={value.includes(p)}
                    onChange={() => toggle(p)}
                    className="h-4 w-4 rounded border-surface-border text-brand-leaf focus:ring-brand-leaf"
                  />
                  {t(permissionLabelKey(p))}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Internal admin / operations staff-account CRUD with per-module access control. */
export function TeamPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const { data: staff = [], isLoading } = useQuery<ApiUser[]>({
    queryKey: ['admin-staff'],
    queryFn: () => api.admin.staff(),
    retry: 1,
  });

  const [form, setForm] = useState<{ name: string; email: string; password: string; permissions: AdminPermission[] }>({
    name: '',
    email: '',
    password: '',
    permissions: [],
  });
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<{ id: string; permissions: AdminPermission[] } | null>(null);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-staff'] });
  const create = useMutation({
    mutationFn: () => api.admin.createStaff(form),
    onSuccess: () => {
      setForm({ name: '', email: '', password: '', permissions: [] });
      setErr('');
      invalidate();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join(', ') : msg || t('team.createError'));
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.admin.updateStaff(id, { active }),
    onSuccess: invalidate,
  });
  const savePerms = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: AdminPermission[] }) =>
      api.admin.updateStaff(id, { permissions }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.admin.removeStaff(id),
    onSuccess: invalidate,
  });

  const canSubmit = form.name && form.email && form.password.length >= 8;

  return (
    <div>
      <PageHeader
        title={t('nav.team')}
        subtitle={t('team.sub')}
        action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>}
      />

      {!isSuperAdmin && (
        <Card className="mb-6">
          <p className="text-sm text-ink-soft">{t('team.needCapability')}</p>
        </Card>
      )}

      <div className="space-y-6">
        <Card>
          <h3 className="font-display font-bold text-ink">{t('team.addStaff')}</h3>
          {err && <p className="mt-2 text-sm font-semibold text-status-error">{err}</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Input label={t('team.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label={t('team.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input
              label={t('team.tempPassword')}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-ink">{t('team.accessGranted', { count: form.permissions.length })}</p>
            <PermissionMatrix value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
          </div>
          <Button className="mt-4" disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? t('team.adding') : t('team.addStaffBtn')}
          </Button>
        </Card>

        <Card padded={false}>
          <div className="border-b border-surface-border px-5 py-4">
            <h3 className="font-display font-bold text-ink">{t('team.staffCount', { count: staff.length })}</h3>
          </div>
          {isLoading ? (
            <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('common:loading')}</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {staff.map((s) => {
                const isSelf = s.id === user?.id;
                const perms = s.adminPermissions ?? [];
                const superAdmin = perms.includes('staff_manage');
                const isEditing = editing?.id === s.id;
                return (
                  <div key={s.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">
                          {s.name} {isSelf && <span className="text-xs text-ink-soft">{t('team.you')}</span>}
                        </div>
                        <div className="text-xs text-ink-soft">{s.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={s.active === false ? 'slate' : 'green'}>
                          {s.active === false ? t('team.inactive') : t('team.active')}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(isEditing ? null : { id: s.id, permissions: perms })}
                        >
                          {isEditing ? t('team.close') : t('team.permissions')}
                        </Button>
                        {!isSelf && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={toggle.isPending}
                              onClick={() => toggle.mutate({ id: s.id, active: !(s.active !== false) })}
                            >
                              {s.active === false ? t('team.reactivate') : t('team.deactivate')}
                            </Button>
                            <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(s.id)}>
                              {t('team.remove')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Permission chips */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {superAdmin ? (
                        <Badge tone="gold">{t('team.superFull')}</Badge>
                      ) : perms.length === 0 ? (
                        <span className="text-xs text-ink-soft">{t('team.noModules')}</span>
                      ) : (
                        perms.map((p) => (
                          <span key={p} className="rounded bg-brand-surface px-1.5 py-0.5 text-[11px] text-ink-soft">
                            {t(permissionLabelKey(p))}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Inline permission editor */}
                    {isEditing && editing && (
                      <div className="mt-3 rounded-lg bg-brand-surface/50 p-3">
                        <PermissionMatrix
                          value={editing.permissions}
                          onChange={(permissions) => setEditing({ id: s.id, permissions })}
                        />
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            disabled={savePerms.isPending}
                            onClick={() => savePerms.mutate({ id: s.id, permissions: editing.permissions })}
                          >
                            {savePerms.isPending ? t('team.saving') : t('team.savePerms')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            {t('common:cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
