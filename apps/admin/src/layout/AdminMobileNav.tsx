import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Icon } from '@agrotraders/ui';
import { isRtl } from '@agrotraders/i18n';
import { useI18n } from '../i18n';

/**
 * Hamburger + slide-in drawer for the admin console below `lg`.
 *
 * The sidebar had no responsive rule at all: a fixed `w-64` ate 256px of a
 * 390px phone, leaving ~134px for every table and form in the back office.
 * It is now `lg:flex` only, and this drawer carries the same nav, the account
 * card and Log out on smaller screens.
 *
 * Navigation uses `NavLink`, so a route change closes the drawer on its own —
 * hence a plain `children` prop rather than a render-prop.
 */
export function AdminMobileNav({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
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
          id="admin-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label={t('header.menu', { defaultValue: 'Menu' })}
          style={{ transform: open ? 'translateX(0)' : hidden }}
          className="pointer-events-auto absolute inset-y-0 start-0 flex w-[88%] max-w-[min(288px,88vw)] flex-col bg-brand-dock text-mint shadow-2xl transition-transform duration-300"
        >
          <div className="flex items-center justify-end px-3 pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('common.close', { defaultValue: 'Close' })}
              className="rounded-md p-1.5 text-mint/70 hover:bg-white/10 hover:text-white"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('header.menu', { defaultValue: 'Menu' })}
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        className="shrink-0 rounded-md p-2 text-ink hover:bg-brand-surface lg:hidden"
      >
        <Icon name="menu" size={22} />
      </button>

      {typeof document === 'undefined' ? drawer : createPortal(drawer, document.body)}
    </>
  );
}
