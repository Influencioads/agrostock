import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, type BadgeTone } from '@agrotraders/ui';
import { resolveApiError, type ApiRoleRequest } from '@agrotraders/api-client';
import { Role, ROLES } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warn',
  approved: 'green',
  rejected: 'error',
};

/* ── User: request additional dashboards ─────────────────────────── */
export function RolesAccessSection() {
  const { t } = useI18n();
  const { roles } = useAuth();
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery<ApiRoleRequest[]>({
    queryKey: ['my-role-requests'],
    queryFn: () => api.me.roleRequests(),
  });
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = useMutation({
    mutationFn: (role: string) => api.me.requestRole(role, note.trim() || undefined),
    onSuccess: () => {
      setNote('');
      setError('');
      void qc.invalidateQueries({ queryKey: ['my-role-requests'] });
    },
    onError: (e) =>
      setError(resolveApiError(e, (c) => t(`errors:${c}`, { defaultValue: '' }) || undefined, t('console.access.submitError'))),
  });

  // Mirrors the API's REQUESTABLE_ROLES (me.module.ts): every platform role except
  // admin, which is provisioned rather than requested.
  const available = ROLES.filter((r) => r !== Role.Admin && !roles.includes(r));
  const pendingFor = (role: string) => requests.some((r) => r.role === role && r.status === 'pending');
  const roleLabel = (role: string) => t(`console.role.${role}`, { defaultValue: role });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="min-w-0 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{t('console.nav.access')}</h2>
        <p className="text-sm text-ink-soft">{t('console.access.sub')}</p>
      </div>

      <Card>
        <h3 className="font-display font-bold text-ink">{t('console.access.activeRoles')}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {roles.map((r) => (
            <Badge key={r} tone="green" icon={<Icon name="check" size={12} />}>
              {t(`console.role.${r}`, { defaultValue: r })}
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-display font-bold text-ink">{t('console.access.requestAnother')}</h3>
        <p className="mt-1 text-sm text-ink-soft">{t('console.access.approvalNote')}</p>
        {!!error && <p className="mt-2 text-sm font-semibold text-status-error">{error}</p>}
        {available.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">{t('console.access.allHeld')}</p>
        ) : (
          <>
            <div className="mt-4">
              <Input
                label={t('console.access.noteLabel')}
                placeholder={t('console.access.phNote')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {available.map((r) => (
                <Button
                  key={r}
                  variant="outline"
                  size="sm"
                  disabled={submit.isPending || pendingFor(r)}
                  onClick={() => submit.mutate(r)}
                >
                  {pendingFor(r)
                    ? t('console.access.rolePending', { role: roleLabel(r) })
                    : t('console.access.requestRole', { role: roleLabel(r) })}
                </Button>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card padded={false}>
        <div className="border-b border-surface-border px-5 py-4">
          <h3 className="font-display font-bold text-ink">{t('console.access.history')}</h3>
        </div>
        {requests.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('console.access.noRequests')}</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-semibold text-ink">{roleLabel(r.role)}</div>
                  <div className="text-xs text-ink-soft">{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
                <Badge tone={STATUS_TONE[r.status] ?? 'slate'}>{t(`console.access.status.${r.status}`, { defaultValue: r.status })}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
