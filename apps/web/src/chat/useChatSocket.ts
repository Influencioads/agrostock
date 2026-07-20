import { useEffect, useState } from 'react';
import { createChatSocket, type Socket } from '@agrotraders/api-client';
import { useAuth } from '../auth/AuthContext';

/**
 * Opens (and tears down) a Socket.IO connection for ONE chat system while the
 * given widget is open and the user is authenticated. The two systems use
 * distinct namespaces so their sockets never share a connection.
 */
export function useChatSocket(
  namespace: '/community' | '/support',
  enabled: boolean,
): { socket: Socket | null; connected: boolean } {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !token) {
      setSocket(null);
      return;
    }
    // Must match lib/api.ts — a mismatched default silently fails to connect.
    const baseURL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3100';
    const s = createChatSocket({ baseURL, namespace, token });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);
    return () => {
      s.close();
      setSocket(null);
      setConnected(false);
    };
  }, [namespace, enabled, token]);

  return { socket, connected };
}
