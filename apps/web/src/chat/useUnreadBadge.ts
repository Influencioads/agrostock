import { useEffect, useRef, useState } from 'react';
import type { Socket } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

/**
 * Live unread counter for a chat system's floating button (and the document
 * title). Single source of truth: one initial fetch, then socket `notify:new`
 * increments while the drawer is closed; opening the drawer clears it.
 */
export function useUnreadBadge(system: 'community' | 'support', socket: Socket | null, open: boolean) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    if (system === 'community') {
      api.community
        .unreadSummary()
        .then((s) => setUnread(s.total))
        .catch(() => {});
    } else {
      api.notifications
        .unreadCount('support')
        .then((r) => setUnread(r.count))
        .catch(() => {});
    }
  }, [user, system]);

  useEffect(() => {
    if (!socket) return;
    const onNotify = () => {
      if (!openRef.current) setUnread((u) => u + 1);
    };
    socket.on('notify:new', onNotify);
    return () => {
      socket.off('notify:new', onNotify);
    };
  }, [socket]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  return unread;
}

/** Small red counter bubble for the floating chat buttons. */
export function badgeText(n: number): string | null {
  if (n <= 0) return null;
  return n > 99 ? '99+' : String(n);
}
