import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, BrandMark, Button, Icon, motion, useReducedMotion, type IconName } from '@agrotraders/ui';
import { LanguageSelect, useI18n } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../branding/BrandingProvider';
import { api, assetUrl } from '../lib/api';
import { NotificationBell } from './NotificationBell';

export interface ConsoleNavItem {
  id: string;
  icon: IconName;
}

// Role subtitle and label are translated at render via `console.roleSub.<id>` /
// `console.role.<id>` — never stored as English here (translating broke otherwise).
const ROLES: { id: string; icon: IconName }[] = [
  { id: 'buyer', icon: 'bag' },
  { id: 'seller', icon: 'store' },
  { id: 'transporter', icon: 'truck' },
  { id: 'loaderco', icon: 'worker' },
  { id: 'worker', icon: 'gauge' },
  { id: 'admin', icon: 'shield' },
];

export function ConsoleLayout({
  title,
  sub,
  nav,
  active,
  onSelect,
  children,
}: {
  title: string;
  sub: string;
  nav: ConsoleNavItem[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  const { user, roles, activeRole, setActiveRole, logout } = useAuth();
  const { t } = useI18n();
  const { logoSrc } = useBranding();
  // Shared key with the Profile section, so a new photo lands here immediately.
  const { data: profile } = useQuery({ queryKey: ['my-profile'], queryFn: () => api.me.profile(), enabled: !!user });
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // Switching now just changes the viewed dashboard among *approved* roles — no
  // re-authentication. Users only see roles an admin has granted them.
  function switchRole(roleId: string) {
    if (roleId === activeRole || !roles.includes(roleId)) return;
    setActiveRole(roleId);
    onSelect('dashboard');
  }

  // Only roles the account actually holds are switchable.
  const myRoles = ROLES.filter((r) => roles.includes(r.id));

  return (
    <div className="flex min-h-screen bg-surface-bg">
      {/* sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-brand-dock text-mint lg:flex">
        <Link to="/" className="px-5 py-5">
          <BrandMark logoSrc={logoSrc} size="sm" suffixClassName="text-brand-leaf" className="text-white" />
        </Link>

        <div className="mx-3 mb-2 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <Avatar name={user?.name ?? t('console.userFallback')} src={assetUrl(profile?.avatarUrl)} size={36} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{user?.name}</div>
            <div className="truncate text-[11px] text-mango">{t(`console.roleSub.${activeRole}`, { defaultValue: activeRole })}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {nav.map((n) => {
            const isActive = n.id === active;
            return (
              <button
                key={n.id}
                onClick={() => onSelect(n.id)}
                className={
                  'relative mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ' +
                  (isActive ? 'text-white' : 'text-mint/70 hover:bg-white/5 hover:text-white')
                }
              >
                {isActive && (
                  <motion.span
                    layoutId={reduce ? undefined : 'console-nav-active'}
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon name={n.icon} size={18} className="relative z-10" />
                <span className="relative z-10">{t(`console.nav.${n.id}`)}</span>
              </button>
            );
          })}
        </nav>

        {/* support card */}
        <div className="mx-3 mb-2 rounded-lg bg-white/5 p-3">
          <div className="text-sm font-bold text-white">{t('console.needHelp')}</div>
          <div className="mt-0.5 text-[11px] text-mint/70">{t('console.supportHours')}</div>
          <Button variant="accent" size="sm" fullWidth className="mt-2.5">
            {t('console.contactSupport')}
          </Button>
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-mint/70 hover:bg-white/5 hover:text-white"
          >
            <Icon name="x" size={18} /> {t('common:logOut')}
          </button>
        </div>
      </aside>

      {/* main */}
      {/* `min-w-0` is load-bearing: a flex child defaults to min-width:auto and so
          refuses to shrink below its content. Without it every `overflow-x-auto`
          below is inert — wide tables grow the page (taking the sidebar with them)
          instead of scrolling inside their own wrapper. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-surface-border bg-white px-5 py-3">
          {/* mobile nav select */}
          <select
            value={active}
            onChange={(e) => onSelect(e.target.value)}
            className="rounded-md border border-surface-border bg-white px-2 py-1.5 text-sm lg:hidden"
          >
            {nav.map((n) => (
              <option key={n.id} value={n.id}>
                {t(`console.nav.${n.id}`)}
              </option>
            ))}
          </select>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-extrabold text-ink">{title}</h1>
            <p className="truncate text-xs text-ink-soft">{sub}</p>
          </div>

          <div className="ms-auto flex min-w-0 shrink items-center gap-2.5">
            {/* search — allowed to shrink so a longer translated role CTA beside it
                never pushes this cluster past the header. */}
            <div className="relative hidden min-w-0 shrink md:block">
              <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-soft">
                <Icon name="search" size={16} />
              </span>
              <input
                placeholder={t('console.search')}
                className="w-full min-w-0 rounded-full border border-surface-border bg-surface-bg py-2 ps-9 pe-3 text-sm outline-none focus:border-brand-leaf md:w-44 lg:w-64"
              />
            </div>

            {/* language */}
            <LanguageSelect className="rounded-full" />

            {/* notifications */}
            <NotificationBell />

            {activeRole === 'seller' ? (
              <Button size="sm" leftIcon={<Icon name="plus" size={14} />} onClick={() => onSelect('add')}>
                {t('console.nav.add')}
              </Button>
            ) : activeRole === 'transporter' ? (
              <Button size="sm" leftIcon={<Icon name="plus" size={14} />} onClick={() => onSelect('requests')}>
                {t('console.findLoads')}
              </Button>
            ) : activeRole === 'loaderco' ? (
              <Button size="sm" leftIcon={<Icon name="plus" size={14} />} onClick={() => onSelect('activejobs')}>
                {t('console.assignWorkers')}
              </Button>
            ) : activeRole === 'admin' ? (
              <Button size="sm" leftIcon={<Icon name="plus" size={14} />} onClick={() => onSelect('kyc')}>
                {t('console.reviewQueue')}
              </Button>
            ) : (
              <Link to="/market">
                <Button size="sm" leftIcon={<Icon name="plus" size={14} />}>
                  {activeRole === 'buyer' ? t('console.browseProducts') : t('console.marketplace')}
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* role switcher — only roles this account has been granted */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-surface-border bg-white px-5 py-2.5">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <Icon name="refresh" size={14} /> {myRoles.length > 1 ? t('console.activeRoleTag') : t('console.roleTag')}
          </span>
          {myRoles.map((r) => {
            const isCurrent = r.id === activeRole;
            return (
              <button
                key={r.id}
                onClick={() => switchRole(r.id)}
                className={
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ' +
                  (isCurrent
                    ? 'border-brand bg-brand text-white'
                    : 'border-surface-border bg-white text-ink hover:border-brand-leaf')
                }
              >
                <Icon name={r.icon} size={13} /> {t(`console.role.${r.id}`)}
              </button>
            );
          })}
          <button
            onClick={() => onSelect('access')}
            className="ms-auto flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-brand-leaf px-3 py-1.5 text-xs font-bold text-brand-dark transition hover:bg-brand-surface"
          >
            <Icon name="plus" size={13} /> {t('console.requestAccess')}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
