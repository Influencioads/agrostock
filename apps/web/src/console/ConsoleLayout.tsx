import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, BrandMark, Button, Icon, motion, useReducedMotion, type IconName } from '@agrotraders/ui';
import { LanguageSelect, useI18n } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../branding/BrandingProvider';
import { api, assetUrl } from '../lib/api';
import { NotificationBell } from './NotificationBell';
import { ConsoleMobileNav } from './ConsoleMobileNav';

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

  /**
   * The sidebar's contents, rendered twice: in the desktop `aside` and inside
   * the mobile drawer. Kept as a function (not a component) so the two copies
   * can't drift, and so re-rendering never remounts the nav.
   *
   * `onPick` lets the drawer close itself before switching sections.
   * `layoutKey` must differ per copy — two `motion.span`s sharing one layoutId
   * make Framer animate the highlight between the mounted-but-offscreen drawer
   * and the visible sidebar.
   */
  const sidebarBody = (onPick: (id: string) => void, layoutKey: string) => (
    <>
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

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((n) => {
          const isActive = n.id === active;
          return (
            <button
              key={n.id}
              onClick={() => onPick(n.id)}
              className={
                'relative mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-start text-sm font-semibold transition-colors ' +
                (isActive ? 'text-white' : 'text-mint/70 hover:bg-white/5 hover:text-white')
              }
            >
              {isActive && (
                <motion.span
                  layoutId={reduce ? undefined : layoutKey}
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon name={n.icon} size={18} className="relative z-10 shrink-0" />
              <span className="relative z-10 min-w-0 break-words">{t(`console.nav.${n.id}`)}</span>
            </button>
          );
        })}
      </nav>

      {/* support card */}
      <div className="mx-3 mb-2 shrink-0 rounded-lg bg-white/5 p-3">
        <div className="text-sm font-bold text-white">{t('console.needHelp')}</div>
        <div className="mt-0.5 text-[11px] text-mint/70">{t('console.supportHours')}</div>
        <Button variant="accent" size="sm" fullWidth className="mt-2.5">
          {t('console.contactSupport')}
        </Button>
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-mint/70 hover:bg-white/5 hover:text-white"
        >
          <Icon name="logout" size={18} /> {t('common:logOut')}
        </button>
      </div>
    </>
  );

  // The label collapses below `sm` but stays on `aria-label`/`title`, so the
  // action is still named for screen readers and on hover.
  const ctaBtn = (label: string, onClick?: () => void) => (
    <Button
      size="sm"
      className="shrink-0 px-2.5 sm:px-3"
      title={label}
      aria-label={label}
      onClick={onClick}
      leftIcon={<Icon name="plus" size={14} />}
    >
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );

  const roleCta =
    activeRole === 'seller' ? (
      ctaBtn(t('console.nav.add'), () => onSelect('add'))
    ) : activeRole === 'transporter' ? (
      ctaBtn(t('console.findLoads'), () => onSelect('requests'))
    ) : activeRole === 'loaderco' ? (
      ctaBtn(t('console.assignWorkers'), () => onSelect('activejobs'))
    ) : activeRole === 'admin' ? (
      ctaBtn(t('console.reviewQueue'), () => onSelect('kyc'))
    ) : (
      <Link to="/market" className="shrink-0">
        {ctaBtn(activeRole === 'buyer' ? t('console.browseProducts') : t('console.marketplace'))}
      </Link>
    );

  return (
    <div className="flex min-h-screen bg-surface-bg">
      {/* sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-brand-dock text-mint lg:flex">
        {sidebarBody(onSelect, 'console-nav-active')}
      </aside>

      {/* main */}
      {/* `min-w-0` is load-bearing: a flex child defaults to min-width:auto and so
          refuses to shrink below its content. Without it every `overflow-x-auto`
          below is inert — wide tables grow the page (taking the sidebar with them)
          instead of scrolling inside their own wrapper. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* `flex-wrap`: at 360px the section picker, title, language, bell and
            role CTA cannot share one line — unwrapped they simply ran off the
            edge and took the page width with them. */}
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-surface-border bg-white px-3 py-2.5 sm:px-5 sm:py-3">
          {/* Replaces the old `lg:hidden` <select>: the drawer carries the whole
              sidebar, including Log out, which the select never could. */}
          <ConsoleMobileNav renderBody={(close) => sidebarBody((id) => { close(); onSelect(id); }, 'console-nav-active-mobile')} />

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-extrabold text-ink sm:text-lg">{title}</h1>
            <p className="truncate text-xs text-ink-soft">{sub}</p>
          </div>

          <div className="flex min-w-0 shrink items-center gap-2 sm:ms-auto sm:gap-2.5">
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

            {/* Role CTA: icon-only below `sm`. A translated label here
                ("Assign workers", "Browse products") is 150–190px, which is half
                a phone header on its own. */}
            {roleCta}
          </div>
        </header>

        {/* role switcher — only roles this account has been granted */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-surface-border bg-white px-3 py-2.5 sm:px-5">
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

        <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
