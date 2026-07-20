import type { ReactNode } from 'react';
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
}

export function Modal({ open, onClose, title, children, footer, className, closeLabel = 'Close' }: ModalProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-evergreen/40 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={cn('w-full max-w-lg rounded-xl bg-white shadow-[0_24px_60px_rgba(11,61,46,0.25)]', className)}
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
                <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
                <button onClick={onClose} className="text-ink-soft hover:text-ink" aria-label={closeLabel}>
                  <Icon name="x" size={20} />
                </button>
              </div>
            )}
            <div className="px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-surface-border px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
