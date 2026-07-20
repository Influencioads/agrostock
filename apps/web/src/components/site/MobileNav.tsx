import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Icon } from '@agrotraders/ui';
import { isRtl } from '@agrotraders/i18n';
import { useI18n, LanguageSelect } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { CurrencySelect } from '../../currency/CurrencyContext';
import { NAV, isNavActive } from './nav';

/**
 * Hamburger + slide-in menu for narrow viewports.
 *
 * Below `lg` the header cannot fit the primary nav in every language, so it
 * lives here along with currency, language, and auth actions.
 */
export function MobileNav() {
  const { t, lang } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const hidden = isRtl(lang) ? 'translateX(110%)' : 'translateX(-110%)';

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const drawer = (
    <>
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden lg:hidden">
        <div
          id="site-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label={t('common:menu')}
          style={{ transform: open ? 'translateX(0)' : hidden }}
          className="pointer-events-auto absolute inset-y-0 start-0 flex w-[86%] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300"
        >
          <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <span className="font-display font-extrabold text-ink">{t('common:menu')}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common:close')}
                className="rounded-md p-1.5 text-ink-soft hover:bg-brand-surface hover:text-ink"
              >
                <Icon name="x" size={18} />
              </button>
            </header>

            <nav className="flex-1 overflow-y-auto p-2">
              {NAV.map((n) => {
                const active = isNavActive(location.pathname, n.to);
                return (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => go(n.to)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-start text-sm font-semibold transition-colors ${
                      active ? 'bg-brand-surface text-brand' : 'text-ink hover:bg-brand-surface/60'
                    }`}
                  >
                    <Icon name={n.icon} size={18} className="shrink-0 text-mango-deep" />
                    <span className="min-w-0 break-words">{t(`nav:primary.${n.key}`)}</span>
                  </button>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-surface-border p-4">
              <div className="flex items-center gap-2">
                <CurrencySelect />
                <LanguageSelect />
              </div>

              {user ? (
                <div className="space-y-2">
                  <Link
                    to="/console"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-sm font-semibold text-ink"
                  >
                    <Avatar name={user.name} size={30} />
                    <span className="min-w-0 truncate">{user.name}</span>
                  </Link>
                  <Button size="sm" fullWidth onClick={() => go('/console')}>
                    {t('common:dashboard')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      logout();
                      go('/');
                    }}
                  >
                    {t('common:logOut')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button size="sm" fullWidth onClick={() => go('/register')}>
                    {t('common:signUp')}
                  </Button>
                  <Button variant="outline" size="sm" fullWidth onClick={() => go('/login')}>
                    {t('common:signIn')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('common:menu')}
        aria-expanded={open}
        aria-controls="site-mobile-nav"
        className="shrink-0 rounded-md p-2 text-ink hover:bg-brand-surface lg:hidden"
      >
        <Icon name="menu" size={22} />
      </button>

      {typeof document === 'undefined' ? drawer : createPortal(drawer, document.body)}
    </>
  );
}
