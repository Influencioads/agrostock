import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Icon, type BadgeTone } from '@agrotraders/ui';
import { PageHeader } from '../components/widgets';
import { type UserRow } from '../mock/data';
import { api } from '../lib/api';
import { UserDetailDrawer } from './UserDetailDrawer';
import { useI18n } from '../i18n';
import { useFormat } from '../lib/useFormat';

/** Enum tokens, not labels — filtering compares tokens so it survives translation. */
const ROLE_FILTERS = ['all', 'buyer', 'seller', 'transporter', 'loaderco'];
const kycTone: Record<string, BadgeTone> = { verified: 'green', pending: 'warn', rejected: 'error' };

export function UsersPage() {
  const { t, lang } = useI18n();
  const fmt = useFormat();
  const [role, setRole] = useState('all');
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);

  const { data: users = [] } = useQuery<UserRow[]>({
    queryKey: ['admin-users', lang],
    queryFn: async (): Promise<UserRow[]> =>
      (await api.admin.users()).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        country: u.country ?? '—',
        kyc: u.kycStatus as UserRow['kyc'],
        joined: fmt.monthYear(u.createdAt),
      })),
    retry: 1,
  });

  const filtered = users.filter(
    (u) =>
      (role === 'all' || u.role === role) &&
      (q === '' || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q.toLowerCase())),
  );

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle', { shown: filtered.length, total: users.length })}
        action={<Badge tone="green">{t('apiBadge.live')}</Badge>}
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-border p-4">
          <div className="flex gap-1 rounded-lg bg-brand-surface p-1">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={
                  'rounded-md px-3 py-1.5 text-sm font-bold transition ' +
                  (role === r ? 'bg-brand-gradient text-white' : 'text-ink-soft')
                }
              >
                {r === 'all' ? t('users.filterAll') : t(`enums:role.${r}`)}
              </button>
            ))}
          </div>
          <label className="ms-auto flex items-center gap-2 rounded-md border border-surface-border px-3">
            <Icon name="search" size={16} className="text-ink-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="h-9 w-56 bg-transparent text-sm outline-none placeholder:text-ink-soft"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3">{t('common:table.user')}</th>
                <th className="px-5 py-3">{t('common:table.role')}</th>
                <th className="px-5 py-3">{t('common:table.country')}</th>
                <th className="px-5 py-3">{t('common:table.kyc')}</th>
                <th className="px-5 py-3">{t('common:table.joined')}</th>
                <th className="px-5 py-3 text-end">{t('common:table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-surface-border/70 last:border-0 hover:bg-brand-surface/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={34} />
                      <div>
                        <div className="font-semibold text-ink">{u.name}</div>
                        <div className="text-xs text-ink-soft">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="slate">{t(`enums:role.${u.role}`)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{u.country}</td>
                  <td className="px-5 py-3">
                    <Badge tone={kycTone[u.kyc]}>{t(`enums:kyc.${u.kyc}`)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{u.joined}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewing(u.id)}>
                        {t('users.view')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {viewing && <UserDetailDrawer userId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
