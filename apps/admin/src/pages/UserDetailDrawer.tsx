import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

const ROLES = ['buyer', 'seller', 'transporter', 'loaderco', 'worker', 'admin'] as const;
const KYC_STATUSES = ['pending', 'verified', 'rejected'] as const;

/**
 * Admin drill-down + editor for a user. The ONLY surface that shows the private
 * Profile contact fields in full, and where an admin edits identity fields,
 * grants/revokes roles, overrides KYC, and deactivates the account.
 */
export function UserDetailDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: u, isLoading } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => api.admin.user(userId),
  });

  const [form, setForm] = useState({ name: '', email: '', country: '', active: true });
  const [addRole, setAddRole] = useState('');

  useEffect(() => {
    if (u) setForm({ name: u.name, email: u.email, country: u.country ?? '', active: u.active !== false });
  }, [u]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-user', userId] });
    void qc.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const save = useMutation({
    mutationFn: () => api.admin.updateUser(userId, form),
    onSuccess: invalidate,
  });
  const grant = useMutation({
    mutationFn: (role: string) => api.admin.grantUserRole(userId, role),
    onSuccess: () => {
      setAddRole('');
      invalidate();
    },
  });
  const revoke = useMutation({
    mutationFn: (role: string) => api.admin.revokeUserRole(userId, role),
    onSuccess: invalidate,
  });
  const setKyc = useMutation({
    mutationFn: (status: 'pending' | 'verified' | 'rejected') => api.admin.setUserKyc(userId, status),
    onSuccess: invalidate,
  });
  const [deleteError, setDeleteError] = useState('');
  const deactivate = useMutation({
    mutationFn: (active: boolean) => api.admin.updateUser(userId, { active }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => api.admin.deleteUser(userId),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setDeleteError(msg || t('userDrawer.deleteBlocked'));
    },
  });

  const counts = (u?._count ?? {}) as Record<string, number>;
  const profile = u?.profile;
  const effectiveRoles = u ? Array.from(new Set([u.role, ...(u.roles ?? [])])) : [];
  const grantable = ROLES.filter((r) => !effectiveRoles.includes(r));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-s border-surface-border bg-surface-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{t('userDrawer.title')}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x" size={18} />
          </Button>
        </div>

        {isLoading || !u ? (
          <Card className="py-14 text-center text-ink-soft">{t('common:loading')}</Card>
        ) : (
          <div className="space-y-4">
            <Card className="flex items-center gap-3">
              <Avatar name={u.name} size={46} />
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-ink">{u.name}</div>
                <div className="text-xs text-ink-soft">{u.email}</div>
              </div>
              <Badge tone={u.active === false ? 'slate' : 'green'}>{u.active === false ? t('userDrawer.inactive') : t('userDrawer.active')}</Badge>
            </Card>

            {/* Edit identity */}
            <Card>
              <h3 className="mb-3 font-display font-bold text-ink">{t('userDrawer.editDetails')}</h3>
              <div className="space-y-3">
                <Input label={t('userDrawer.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input label={t('userDrawer.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input label={t('userDrawer.country')} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border-surface-border text-brand-leaf"
                  />
                  {t('userDrawer.accountActive')}
                </label>
              </div>
              <Button className="mt-3" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? t('userDrawer.saving') : t('userDrawer.saveChanges')}
              </Button>
            </Card>

            {/* Roles */}
            <Card>
              <h3 className="mb-2 font-display font-bold text-ink">{t('userDrawer.roles')}</h3>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {effectiveRoles.map((r) => (
                  <span key={r} className="flex items-center gap-1 rounded bg-brand-surface px-2 py-0.5 text-xs font-semibold text-ink">
                    {t(`enums:role.${r}`, { defaultValue: r })}
                    {r === u.role ? (
                      <span className="text-[10px] text-ink-soft">{t('userDrawer.primary')}</span>
                    ) : (
                      <button
                        onClick={() => revoke.mutate(r)}
                        disabled={revoke.isPending}
                        className="text-ink-soft hover:text-status-error"
                        title={t('userDrawer.revokeRole')}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {grantable.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="h-9 flex-1 rounded-md border border-surface-border bg-white px-2 text-sm outline-none"
                  >
                    <option value="">{t('userDrawer.addRole')}</option>
                    {grantable.map((r) => (
                      <option key={r} value={r}>
                        {t(`enums:role.${r}`, { defaultValue: r })}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" disabled={!addRole || grant.isPending} onClick={() => grant.mutate(addRole)}>
                    {t('userDrawer.grant')}
                  </Button>
                </div>
              )}
            </Card>

            {/* KYC override */}
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display font-bold text-ink">{t('userDrawer.kycStatus')}</h3>
                <Badge tone={u.kycStatus === 'verified' ? 'green' : u.kycStatus === 'rejected' ? 'error' : 'warn'}>
                  {t(`enums:kyc.${u.kycStatus}`, { defaultValue: u.kycStatus })}
                </Badge>
              </div>
              <div className="flex gap-2">
                {KYC_STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={u.kycStatus === s ? 'primary' : 'outline'}
                    disabled={setKyc.isPending || u.kycStatus === s}
                    onClick={() => setKyc.mutate(s)}
                  >
                    {t(`enums:kyc.${s}`, { defaultValue: s })}
                  </Button>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-2 flex items-center gap-2">
                <Icon name="shield" size={15} className="text-brand-dark" />
                <h3 className="font-display font-bold text-ink">{t('userDrawer.privateContact')}</h3>
                <Badge tone="mango">{t('userDrawer.adminOnly')}</Badge>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">{t('userDrawer.phone')}</dt><dd className="font-semibold text-ink">{profile?.phone ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('userDrawer.whatsapp')}</dt><dd className="font-semibold text-ink">{profile?.whatsapp ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('userDrawer.contactEmail')}</dt><dd className="font-semibold text-ink">{profile?.contactEmail ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('userDrawer.location')}</dt><dd className="font-semibold text-ink">{profile?.location ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('userDrawer.market')}</dt><dd className="font-semibold text-ink">{profile?.market ? `${profile.market.flag} ${profile.market.name}` : '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">{t('userDrawer.wallet')}</dt><dd className="font-numeric font-semibold text-ink">{u.wallet ? `$${(u.wallet.balanceCents / 100).toLocaleString()}` : '—'}</dd></div>
              </dl>
            </Card>

            <Card>
              <h3 className="mb-2 font-display font-bold text-ink">{t('userDrawer.activity')}</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                {(
                  [
                    [t('userDrawer.actProducts'), counts.products],
                    [t('userDrawer.actBuyOrders'), counts.buyerOrders],
                    [t('userDrawer.actSellOrders'), counts.sellerOrders],
                    [t('userDrawer.actVehicles'), counts.vehicles],
                    [t('userDrawer.actTrips'), counts.trips],
                    [t('userDrawer.actWorkers'), counts.workers],
                    [t('userDrawer.actHiresSent'), counts.hireRequestsMade],
                    [t('userDrawer.actHiresReceived'), counts.hireRequestsReceived],
                  ] as const
                )
                  .filter(([, v]) => (v ?? 0) > 0)
                  .map(([label, v]) => (
                    <div key={label} className="rounded-md bg-brand-surface px-2 py-2">
                      <div className="font-display text-lg font-extrabold text-ink">{v}</div>
                      <div className="text-[11px] text-ink-soft">{label}</div>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Danger zone */}
            <Card className="border border-status-error/30">
              <h3 className="mb-1 font-display font-bold text-status-error">{t('userDrawer.dangerZone')}</h3>
              <p className="mb-3 text-xs text-ink-soft">{t('userDrawer.dangerBody')}</p>
              <div className="flex flex-wrap gap-2">
                {/* Reversible: toggle account.active. ADM-02: confirm before deactivating. */}
                <Button
                  variant="outline"
                  disabled={deactivate.isPending}
                  onClick={() => {
                    const next = u.active === false;
                    if (next || window.confirm(t('userDrawer.confirmDeactivate'))) deactivate.mutate(next);
                  }}
                >
                  {u.active === false ? t('userDrawer.reactivate') : t('userDrawer.deactivate')}
                </Button>
                {/* Irreversible hard delete; the API blocks it (409) when trade/financial records exist. */}
                <Button
                  variant="danger"
                  disabled={remove.isPending}
                  onClick={() => {
                    setDeleteError('');
                    if (window.confirm(t('userDrawer.confirmDelete'))) remove.mutate();
                  }}
                >
                  {remove.isPending ? t('userDrawer.deleting') : t('userDrawer.deletePermanently')}
                </Button>
              </div>
              {deleteError && <p className="mt-2 text-sm font-semibold text-status-error">{deleteError}</p>}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
