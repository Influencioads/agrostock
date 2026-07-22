import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, Avatar, BrandMark, Icon, motion, useReducedMotion, usePageMotion, type IconName } from '@agrotraders/ui';
import { BRAND } from '@agrotraders/types';
import type { AdminPermission } from '@agrotraders/api-client';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../branding/BrandingProvider';
import { useI18n, LanguageSelect } from '../i18n';
import { api } from '../lib/api';
import { NotificationBell } from './NotificationBell';
import { AdminMobileNav } from './AdminMobileNav';

interface Mod {
  to: string;
  /** Indexes `admin:nav`; the rendered label is translated per locale. */
  key: string;
  icon: IconName;
  badge?: number;
  group: string;
  /** Permission required to see this module. Omit for always-visible (e.g. overview). */
  perm?: AdminPermission;
}

const MODULES: Mod[] = [
  { to: '/', key: 'overview', icon: 'chart', group: 'Platform' },
  { to: '/users', key: 'users', icon: 'worker', group: 'Platform', perm: 'users_manage' },
  { to: '/role-requests', key: 'roleRequests', icon: 'check', group: 'Platform', perm: 'role_requests' },
  { to: '/team', key: 'team', icon: 'grid', group: 'Platform', perm: 'staff_manage' },
  { to: '/kyc', key: 'kyc', icon: 'shield', group: 'Platform', perm: 'kyc_review' },
  { to: '/categories', key: 'categories', icon: 'grid', group: 'Marketplace', perm: 'products_moderate' },
  { to: '/markets', key: 'markets', icon: 'mapPin', group: 'Marketplace', perm: 'markets_manage' },
  { to: '/products', key: 'products', icon: 'box', group: 'Marketplace', perm: 'products_moderate' },
  { to: '/ads', key: 'ads', icon: 'chart', group: 'Marketplace', perm: 'ads_moderate' },
  { to: '/auctions', key: 'auctions', icon: 'gavel', group: 'Marketplace', perm: 'auctions_manage' },
  { to: '/bids', key: 'bids', icon: 'gavel', group: 'Marketplace', perm: 'bids_manage' },
  { to: '/orders', key: 'orders', icon: 'bag', group: 'Marketplace', perm: 'orders_manage' },
  { to: '/invoices', key: 'invoices', icon: 'file', group: 'Marketplace', perm: 'finance_manage' },
  { to: '/safedeal', key: 'safedeal', icon: 'shield', group: 'Marketplace', perm: 'finance_manage' },
  { to: '/disputes', key: 'disputes', icon: 'gavel', group: 'Marketplace', perm: 'disputes_manage' },
  { to: '/reviews', key: 'reviews', icon: 'star', group: 'Marketplace', perm: 'reviews_moderate' },
  { to: '/support', key: 'support', icon: 'message', group: 'Messaging', perm: 'support_agent' },
  { to: '/community', key: 'community', icon: 'leaf', group: 'Messaging', perm: 'community_moderate' },
  { to: '/transport', key: 'transport', icon: 'truck', group: 'Logistics', perm: 'transport_manage' },
  { to: '/loaders', key: 'loaders', icon: 'worker', group: 'Logistics', perm: 'loaders_manage' },
  { to: '/cms', key: 'cms', icon: 'file', group: 'Company', perm: 'cms_manage' },
  { to: '/offices', key: 'offices', icon: 'globe', group: 'Company', perm: 'offices_manage' },
  { to: '/branding', key: 'branding', icon: 'leaf', group: 'Company', perm: 'branding_manage' },
  { to: '/payments', key: 'payments', icon: 'wallet', group: 'Company', perm: 'finance_manage' },
  { to: '/reports', key: 'reports', icon: 'chart', group: 'Company', perm: 'reports_view' },
  { to: '/audit', key: 'audit', icon: 'admin', group: 'Company', perm: 'audit_view' },
  { to: '/profile', key: 'profile', icon: 'admin', group: 'Company' },
];

const GROUPS = ['Platform', 'Marketplace', 'Messaging', 'Logistics', 'Company'];

function AnimatedOutlet() {
  const location = useLocation();
  const page = usePageMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} {...page}>
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export function AdminLayout() {
  const location = useLocation();
  const { user, logout, hasPermission, isSuperAdmin } = useAuth();
  const { logoSrc } = useBranding();
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const current = MODULES.find((m) => m.to === location.pathname);
  // Only show modules the signed-in staff account is authorized for.
  const visibleModules = MODULES.filter((m) => !m.perm || hasPermission(m.perm));

  // Live pending counts drive the nav badges (best-effort: silent on 403).
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.admin.stats(), retry: 0, staleTime: 60_000 });
  const badgeFor = (key: string): number | undefined => {
    if (!stats) return undefined;
    const map: Record<string, number | undefined> = {
      kyc: stats.pendingKyc,
      products: stats.pendingProducts,
      roleRequests: stats.pendingRoleRequests,
      disputes: stats.disputes,
      ads: stats.pendingAds,
      markets: stats.pendingMarkets,
      payments: stats.pendingPayouts,
    };
    const n = map[key];
    return n && n > 0 ? n : undefined;
  };

  /**
   * Sidebar contents, rendered twice: in the desktop `aside` and in the mobile
   * drawer. A function (not a component) so the two can't drift apart.
   *
   * `layoutKey` must differ per copy — a shared Framer `layoutId` would animate
   * the active-item highlight between the offscreen drawer and the real sidebar.
   */
  const sidebarBody = (layoutKey: string) => (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
          <BrandMark logoSrc={logoSrc} size="sm" glyphOnly />
          <div>
            <div className="font-display text-base font-extrabold leading-none text-white">
              {BRAND.prefix}
              <span className="text-brand-leaf">{BRAND.suffix}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wide text-mango">{t('brand.tagline')}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {GROUPS.filter((g) => visibleModules.some((m) => m.group === g)).map((g) => (
            <div key={g} className="mt-4 first:mt-0">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-mint/40">{t(`navGroup.${g}`)}</p>
              {visibleModules.filter((m) => m.group === g).map((m) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  end={m.to === '/'}
                  className={({ isActive }) =>
                    'relative mt-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ' +
                    (isActive ? 'text-white' : 'text-mint/70 hover:bg-white/5 hover:text-white')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId={reduce ? undefined : layoutKey}
                          className="absolute inset-0 rounded-lg bg-white/10"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon name={m.icon} size={18} className="relative z-10" />
                      <span className="relative z-10 flex-1">{t(`nav.${m.key}`)}</span>
                      {badgeFor(m.key) && (
                        <span className="relative z-10 rounded-full bg-mango px-1.5 text-[10px] font-bold text-brand-evergreen animate-pulse-soft motion-reduce:animate-none">
                          {badgeFor(m.key)}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar name={user?.name ?? t('header.fallbackTitle')} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{user?.name ?? t('account.fallbackName')}</div>
              <div className="truncate text-[11px] text-mint/50">
                {isSuperAdmin ? t('account.superAdmin') : t('account.staff')}
              </div>
            </div>
            <button onClick={logout} title={t('account.logOut')} className="text-mint/60 hover:text-white">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bg font-body text-ink">
      {/* sidebar — desktop only; below `lg` the same content lives in the drawer */}
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-dock text-mint lg:flex">
        {sidebarBody('admin-nav-active')}
      </aside>

      {/* main */}
      {/* `min-w-0`: without it this flex child refuses to shrink and every
          `overflow-x-auto` table below is inert. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-surface-border bg-white px-3 py-2 sm:px-6 sm:py-0">
          <AdminMobileNav>{sidebarBody('admin-nav-active-mobile')}</AdminMobileNav>
          <h1 className="min-w-0 flex-1 truncate font-display text-base font-extrabold text-ink sm:text-lg">
            {current ? t(`nav.${current.key}`) : t('header.fallbackTitle')}
          </h1>
          <label className="ms-auto hidden items-center gap-2 rounded-md border border-surface-border px-3 md:flex">
            <Icon name="search" size={16} className="text-ink-soft" />
            <input
              placeholder={t('header.searchPlaceholder')}
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft md:w-48 lg:w-64"
            />
          </label>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSelect />
            <NotificationBell />
            <Avatar name={t('account.fallbackName')} size={34} />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}
