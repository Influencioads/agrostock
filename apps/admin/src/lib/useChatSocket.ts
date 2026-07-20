import { useEffect, useState } from 'react';
import { createChatSocket, type Socket } from '@agrotraders/api-client';
import { useAuth } from '../auth/AuthContext';

/** Admin-side Socket.IO connection for one chat system namespace. */
export function useChatSocket(
  namespace: '/community' | '/support',
  enabled: boolean,
): { socket: Socket | null } {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !token) return;
    const baseURL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3100';
    const s = createChatSocket({ baseURL, namespace, token });
    setSocket(s);
    return () => {
      s.close();
      setSocket(null);
    };
  }, [namespace, enabled, token]);

  return { socket };
}
