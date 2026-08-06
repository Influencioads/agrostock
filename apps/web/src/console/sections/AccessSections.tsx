import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Icon, type BadgeTone } from '@agrotraders/ui';
import type { ApiRoleRequest } from '@agrotraders/api-client';
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
  const { data: requests = [] } = useQuery<ApiRoleRequest[]>({
    queryKey: ['my-role-requests'],
    queryFn: () => api.me.roleRequests(),
  });

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
                  <div className="text-sm font-semibold text-ink">{t(`console.role.${r.role}`, { defaultValue: r.role })}</div>
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
