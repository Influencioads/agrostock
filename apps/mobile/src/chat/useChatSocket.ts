import { useEffect, useRef, useState } from 'react';
import { createChatSocket, type Socket } from '@agrotraders/api-client';
import { API_BASE, getApiToken } from '../lib/api';

/**
 * Opens (and tears down) a Socket.IO connection for ONE chat system while the
 * given screen is focused and the user is authenticated. The two systems use
 * distinct namespaces ('/community' vs '/support') so their sockets never share
 * a connection — mirrors apps/web/src/chat/useChatSocket.ts.
 */
export function useChatSocket(
  namespace: '/community' | '/support',
  enabled: boolean,
): { socket: Socket | null; connected: boolean } {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getApiToken();
    if (!enabled || !token) {
      setSocket(null);
      setConnected(false);
      return;
    }
    const s = createChatSocket({ baseURL: API_BASE, namespace, token });
    ref.current = s;
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);
    return () => {
      s.close();
      ref.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [namespace, enabled]);

  return { socket, connected };
}
