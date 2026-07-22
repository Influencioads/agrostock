import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Icon } from '@agrotraders/ui';
import { isRtl } from '@agrotraders/i18n';
import { useI18n } from '../i18n';

/**
 * Hamburger + slide-in drawer for the console below `lg`.
 *
 * The console sidebar is `lg:flex` only, and it was the sole home of the avatar,
 * the support card and — critically — **Log out**. On a phone there was simply
 * no way to sign out of any dashboard. This drawer carries the same sidebar
 * content, so nothing is desktop-only any more.
 *
 * `renderBody` is a render-prop rather than a plain node so the caller can wire
 * its nav buttons to close the drawer, while the sidebar markup itself stays in
 * one place (ConsoleLayout) instead of being duplicated here.
 */
export function ConsoleMobileNav({ renderBody }: { renderBody: (close: () => void) => ReactNode }) {
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
          id="console-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label={t('common:menu')}
          style={{ transform: open ? 'translateX(0)' : hidden }}
          className="pointer-events-auto absolute inset-y-0 start-0 flex w-[88%] max-w-[min(320px,88vw)] flex-col bg-brand-dock text-mint shadow-2xl transition-transform duration-300"
        >
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="font-display text-sm font-extrabold text-white">{t('common:menu')}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('common:close')}
              className="rounded-md p-1.5 text-mint/70 hover:bg-white/10 hover:text-white"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          {renderBody(() => setOpen(false))}
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
        aria-controls="console-mobile-nav"
        className="shrink-0 rounded-md p-2 text-ink hover:bg-brand-surface lg:hidden"
      >
        <Icon name="menu" size={22} />
      </button>

      {typeof document === 'undefined' ? drawer : createPortal(drawer, document.body)}
    </>
  );
}
