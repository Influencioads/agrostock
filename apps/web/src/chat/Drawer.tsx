import type { ReactNode } from 'react';
import { Icon } from '@agrotraders/ui';
import { useI18n } from '../i18n';

/**
 * Slide-in chat drawer. `side` positions it left (Community) or right
 * (Live Support) so the two systems never overlap.
 */
export function Drawer({
  open,
  side,
  title,
  accent,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  side: 'left' | 'right';
  title: ReactNode;
  accent: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div
      className={`pointer-events-none fixed inset-y-0 z-[70] flex w-full max-w-[400px] flex-col transition-transform duration-300 ${
        side === 'left' ? 'left-0' : 'right-0'
      } ${open ? 'translate-x-0' : side === 'left' ? '-translate-x-[110%]' : 'translate-x-[110%]'}`}
    >
      <div className="pointer-events-auto m-3 flex h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
        <header
          className="flex items-center justify-between px-4 py-3 text-white"
          style={{ background: accent }}
        >
          <div className="flex items-center gap-2 font-display font-bold">{title}</div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-white/20" aria-label={t('common:close')}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {footer && <div className="border-t border-surface-border">{footer}</div>}
      </div>
    </div>
  );
}
