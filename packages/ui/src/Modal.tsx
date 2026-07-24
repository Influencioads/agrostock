import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from './cn';
import { Icon } from './Icon';
import { EASE_OUT } from './motion';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Accessible label for the ✕ button. Pass a translated string (e.g. t('common:close')); defaults to English. */
  closeLabel?: string;
  /**
   * Accessible name for the dialog when there is no visible `title` (e.g. a
   * media/lightbox modal). Ignored when `title` is set — the heading labels it.
   */
  ariaLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, footer, className, closeLabel = 'Close', ariaLabel }: ModalProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  // The element focused before the dialog opened, so focus can be restored to it
  // on close (keyboard/screen-reader users are returned to where they were).
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // F34: dialog semantics need real focus management — capture + move focus in
  // on open, trap Tab within the panel, close on Escape, and restore focus out.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = (document.activeElement as HTMLElement) ?? null;

    // Move focus into the dialog (first focusable, else the panel itself).
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === firstEl || active === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Restore focus to the opener on close.
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          // `items-end` on phones: a tall dialog centred in a short viewport gets
          // clipped at BOTH ends with no way to scroll to its footer. Anchored to
          // the bottom it reads as a sheet and the panel's own scroller takes over.
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-brand-evergreen/40 p-0 sm:items-center sm:p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : ariaLabel ?? closeLabel}
            tabIndex={-1}
            className={cn(
              'flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-[0_24px_60px_rgba(11,61,46,0.25)] outline-none sm:rounded-xl',
              className,
            )}
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
          >
            {title && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-4 py-3.5 sm:px-6 sm:py-4">
                <h3 id={titleId} className="min-w-0 font-display text-base font-extrabold text-ink sm:text-lg">{title}</h3>
                <button
                  onClick={onClose}
                  className="-me-1.5 shrink-0 rounded-md p-1.5 text-ink-soft hover:bg-brand-surface hover:text-ink"
                  aria-label={closeLabel}
                >
                  <Icon name="x" size={20} />
                </button>
              </div>
            )}
            {/* `min-h-0` is what actually lets this scroll: a flex child defaults
                to min-height:auto and would otherwise grow past `max-h-[92vh]`. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
            {footer && (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-surface-border px-4 py-3.5 sm:px-6 sm:py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
