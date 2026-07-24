import type { ReactNode } from 'react';
import type { AdminPermission } from '@agrotraders/api-client';
import { useAuth } from './AuthContext';
import { useI18n } from '../i18n';

/**
 * ADM-01: gate a route on the same permission that controls its sidebar link.
 *
 * Previously RBAC lived ONLY in `AdminLayout`'s nav filter, while every `<Route>`
 * rendered its page unconditionally — so a staff admin without, say,
 * `finance_manage` could type `/payments` and get a fully rendered page with live
 * action buttons. The API's 403s were the only real guard, and most pages showed
 * that failure as empty data under a green "Live" badge. This wrapper renders a
 * clear "no access" panel instead, matching the nav they can actually see.
 */
export function RequirePermission({ perm, children }: { perm?: AdminPermission; children: ReactNode }) {
  const { hasPermission } = useAuth();
  const { t } = useI18n();
  if (perm && !hasPermission(perm)) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-4 font-display text-xl font-extrabold text-ink">{t('rbac.deniedTitle')}</h1>
        <p className="mt-2 text-ink-soft">{t('rbac.deniedBody')}</p>
      </div>
    );
  }
  return <>{children}</>;
}
