import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';

export function ProfilePage() {
  const { t } = useI18n();
  const { user, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { data: profile = user } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => api.admin.profile(),
    retry: 1,
  });

  const changePassword = useMutation({
    mutationFn: () => api.admin.updateOwnPassword(password),
    onSuccess: () => {
      setPassword('');
      setError('');
      void qc.invalidateQueries({ queryKey: ['admin-profile'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || t('profile.passwordError'));
    },
  });

  return (
    <div>
      <PageHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        action={<Badge tone={isSuperAdmin ? 'gold' : 'slate'}>{isSuperAdmin ? t('account.superAdmin') : t('account.staff')}</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={profile?.name ?? t('account.fallbackName')} size={56} />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold text-ink">{profile?.name ?? t('account.fallbackName')}</h2>
              <p className="text-sm text-ink-soft">{profile?.email}</p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-brand-surface p-3">
              <dt className="text-xs font-bold uppercase text-ink-soft">{t('profile.role')}</dt>
              <dd className="mt-1 font-semibold text-ink">{t(`enums:role.${profile?.role ?? 'admin'}`, { defaultValue: profile?.role ?? 'admin' })}</dd>
            </div>
            <div className="rounded-lg bg-brand-surface p-3">
              <dt className="text-xs font-bold uppercase text-ink-soft">{t('profile.status')}</dt>
              <dd className="mt-1 font-semibold text-ink">{profile?.active === false ? t('profile.inactive') : t('profile.active')}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <h3 className="mb-2 font-display font-bold text-ink">{t('profile.permissions')}</h3>
            <div className="flex flex-wrap gap-2">
              {(profile?.adminPermissions ?? []).map((p) => (
                <Badge key={p} tone={p === 'staff_manage' ? 'gold' : 'slate'}>
                  {t(`perm.${p}`, { defaultValue: p })}
                </Badge>
              ))}
              {(profile?.adminPermissions ?? []).length === 0 && <span className="text-sm text-ink-soft">{t('profile.noPermissions')}</span>}
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Icon name="shield" size={18} className="text-brand-dark" />
            <h3 className="font-display text-lg font-bold text-ink">{t('profile.passwordTitle')}</h3>
          </div>
          <Input
            label={t('profile.newPassword')}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
          />
          {error && <p className="mt-2 text-sm font-semibold text-status-error">{error}</p>}
          {changePassword.isSuccess && !password && <p className="mt-2 text-sm font-semibold text-status-success">{t('profile.passwordUpdated')}</p>}
          <Button
            className="mt-4"
            fullWidth
            disabled={password.length < 8 || changePassword.isPending}
            onClick={() => changePassword.mutate()}
          >
            {changePassword.isPending ? t('profile.passwordSaving') : t('profile.passwordSave')}
          </Button>
        </Card>
      </div>
    </div>
  );
}
