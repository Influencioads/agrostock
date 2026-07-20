import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { useChatSocket } from './useChatSocket';

interface ChatBadgeValue {
  /** Unread community messages + support replies (live). */
  unread: number;
  /** Clear the counter (called when the user opens a chat surface). */
  clear: () => void;
}

const Ctx = createContext<ChatBadgeValue>({ unread: 0, clear: () => {} });

/**
 * Keeps a live unread count for the bottom-tab badge and the floating chat
 * button: one initial fetch, then both chat sockets bump it on `notify:new`.
 */
export function ChatBadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const { socket: community } = useChatSocket('/community', !!user);
  const { socket: support } = useChatSocket('/support', !!user);
  const cleared = useRef(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    Promise.all([
      api.community.unreadSummary().catch(() => ({ total: 0 })),
      api.notifications.unreadCount('support').catch(() => ({ count: 0 })),
    ]).then(([c, s]) => setUnread((c as { total: number }).total + (s as { count: number }).count));
  }, [user]);

  useEffect(() => {
    const bump = () => setUnread((u) => u + 1);
    community?.on('notify:new', bump);
    support?.on('notify:new', bump);
    return () => {
      community?.off('notify:new', bump);
      support?.off('notify:new', bump);
    };
  }, [community, support]);

  const value = useMemo(
    () => ({
      unread,
      clear: () => {
        cleared.current = Date.now();
        setUnread(0);
      },
    }),
    [unread],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChatBadge() {
  return useContext(Ctx);
}
