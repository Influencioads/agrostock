import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icon } from '@agrotraders/ui';
import type { NotificationPreferences } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useChatSocket } from '../lib/useChatSocket';
import { enableWebPush, disableWebPush } from '../lib/webPush';
import { useI18n } from '../i18n';

interface Notif {
  id: string;
  system: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/**
 * Notification centre for the admin top bar. Admin notifications (support,
 * moderation, disputes) are relayed live over the `/support` socket; the full
 * list + unread come from the REST endpoints. Also bootstraps web push.
 */
export function NotificationBell() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { socket } = useChatSocket('/support', !!user);

  const { data: items = [] } = useQuery<Notif[]>({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list() as Promise<Notif[]>,
    enabled: !!user,
  });
  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.notifications.unreadCount(),
    enabled: !!user,
  });
  const unreadCount = unread?.count ?? 0;

  useEffect(() => {
    if (!socket) return;
    const onNotify = (n: Notif) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast(n.title, { description: n.body ?? undefined });
    };
    socket.on('notify:new', onNotify);
    return () => {
      socket.off('notify:new', onNotify);
    };
  }, [socket, qc]);

  useEffect(() => {
    if (!user) return;
    enableWebPush((payload) => {
      const n = payload.notification;
      if (n?.title) toast(n.title, { description: n.body ?? undefined });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });
  }, [user, qc]);

  const prevUser = useRef(user);
  useEffect(() => {
    if (prevUser.current && !user) disableWebPush();
    prevUser.current = user;
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openItem = useCallback(
    async (n: Notif) => {
      setOpen(false);
      if (!n.readAt) {
        await api.notifications.read(n.id).catch(() => {});
        qc.invalidateQueries({ queryKey: ['notifications'] });
      }
      if (n.linkUrl && !/^https?:\/\//.test(n.linkUrl)) navigate(n.linkUrl);
    },
    [navigate, qc],
  );

  const markAllRead = useCallback(async () => {
    await api.notifications.readAll().catch(() => {});
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-surface-border text-ink-soft hover:border-brand-leaf"
        aria-label={t('bell.aria')}
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && (
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-error px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-surface-border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <span className="font-display text-sm font-bold text-ink">
              {showPrefs ? t('bell.settings') : t('bell.notifications')}
            </span>
            <div className="flex items-center gap-1">
              {!showPrefs && unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-brand hover:underline">
                  {t('bell.markAllRead')}
                </button>
              )}
              <button
                onClick={() => setShowPrefs((s) => !s)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-surface-bg"
                aria-label={t('bell.ariaSettings')}
              >
                <Icon name={showPrefs ? 'x' : 'gauge'} size={14} />
              </button>
            </div>
          </div>

          {showPrefs ? (
            <NotificationPreferencesPanel />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-ink-soft">{t('bell.caughtUp')}</div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`flex w-full items-start gap-3 border-b border-surface-border/60 px-4 py-3 text-start hover:bg-surface-bg ${
                      n.readAt ? '' : 'bg-brand-surface/40'
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-brand'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{n.title}</span>
                      {n.body && <span className="mt-0.5 block truncate text-xs text-ink-soft">{n.body}</span>}
                    </span>
                    <span className="shrink-0 text-[10px] text-ink-soft">{timeAgo(n.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationPreferencesPanel() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery<NotificationPreferences>({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => api.notifications.getPreferences(),
  });

  const toggle = useCallback(
    async (category: string, channel: 'email' | 'push' | 'inApp', value: boolean) => {
      const next = await api.notifications
        .updatePreferences({ categories: { [category]: { [channel]: value } } as never })
        .catch(() => null);
      if (next) qc.setQueryData(['notifications', 'preferences'], next);
    },
    [qc],
  );

  if (!data) return <div className="px-4 py-10 text-center text-sm text-ink-soft">{t('common:loading')}</div>;

  return (
    <div className="max-h-96 overflow-y-auto px-4 py-3">
      <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
        <span />
        <span>{t('bell.mail')}</span>
        <span>{t('bell.push')}</span>
        <span>{t('bell.app')}</span>
      </div>
      {Object.entries(data.categories).map(([key, c]) => (
        <div key={key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 py-1.5">
          <span className="text-sm text-ink">{c.label}</span>
          <input
            type="checkbox"
            checked={c.email}
            disabled={!c.transactional}
            onChange={(e) => toggle(key, 'email', e.target.checked)}
            className="h-4 w-4 accent-brand disabled:opacity-30"
          />
          <input type="checkbox" checked={c.push} onChange={(e) => toggle(key, 'push', e.target.checked)} className="h-4 w-4 accent-brand" />
          <input type="checkbox" checked={c.inApp} onChange={(e) => toggle(key, 'inApp', e.target.checked)} className="h-4 w-4 accent-brand" />
        </div>
      ))}
    </div>
  );
}
