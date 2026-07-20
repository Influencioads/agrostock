import type { ReactNode } from 'react';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
}

export interface NavDockProps {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  langLabel?: string;
  onToggleLang?: () => void;
  /** Tooltip for the language toggle. Pass a translated string (e.g. t('common:language')); defaults to English. */
  languageTitle?: string;
}

/** Left navigator dock — ported from the AgroTraders design. */
export function NavDock({ items, active, onSelect, langLabel, onToggleLang, languageTitle = 'Language' }: NavDockProps) {
  return (
    <nav className="z-50 flex w-[84px] shrink-0 flex-col items-center gap-1.5 bg-brand-dock py-[18px] shadow-dock">
      <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-[13px] bg-brand-gradient text-white shadow-[0_6px_16px_rgba(83,184,106,.4)]">
        <Icon name="leaf" size={26} />
      </div>
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onSelect(item.id)}
            className={cn(
              // `min-h` + 2-line clamp: the dock rail is a fixed 84px, so a longer
              // translated label must wrap and grow the button rather than spill.
              // `title` above keeps the full label reachable when it clamps.
              'flex min-h-[58px] w-[68px] flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-1.5 transition',
              isActive
                ? 'bg-gradient-to-br from-brand-leaf to-brand text-white shadow-[0_6px_16px_rgba(83,184,106,.35)]'
                : 'text-[#7ba98b] hover:text-white',
            )}
          >
            <Icon name={item.icon} size={21} strokeWidth={isActive ? 2.3 : 1.9} />
            <span className="line-clamp-2 text-center text-[8.5px] font-semibold leading-tight tracking-[.2px]">
              {item.label}
            </span>
          </button>
        );
      })}
      <div className="flex-1" />
      {onToggleLang && (
        <button
          type="button"
          title={languageTitle}
          onClick={onToggleLang}
          className="flex h-10 w-[60px] items-center justify-center gap-1 rounded-[11px] border border-white/15 bg-white/5 font-numeric text-[13px] font-bold text-[#DFF3E4]"
        >
          <span className="opacity-55">🌐</span>
          {langLabel}
        </button>
      )}
    </nav>
  );
}

export interface AppShellProps {
  nav: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Full-height shell: left dock + scrollable content area. */
export function AppShell({ nav, children, className }: AppShellProps) {
  return (
    <div className={cn('flex h-screen w-full overflow-hidden font-body', className)}>
      {nav}
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-surface-bg">{children}</main>
    </div>
  );
}
