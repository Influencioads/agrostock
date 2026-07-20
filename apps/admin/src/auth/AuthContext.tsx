import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AdminPermission, ApiUser } from '@agrotraders/api-client';
import { api } from '../lib/api';

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<ApiUser>;
  logout: () => void;
  /** True if the signed-in staff account may access a module. Super-admins (staff_manage) pass everything. */
  hasPermission: (perm: AdminPermission) => boolean;
  /** True for super-admins (hold `staff_manage`). */
  isSuperAdmin: boolean;
}

const Ctx = createContext<AuthContextValue | null>(null);

function readStored(): { user: ApiUser | null; token: string | null } {
  try {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    return { token, user: raw ? (JSON.parse(raw) as ApiUser) : null };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, token }, setState] = useState(readStored);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    if (res.user.role !== 'admin') {
      // Marker code — LoginPage maps it to the localized `login.adminOnly` copy.
      throw new Error('ADMIN_ONLY');
    }
    localStorage.setItem('token', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setState({ user: res.user, token: res.accessToken });
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setState({ user: null, token: null });
  }, []);

  const isSuperAdmin = !!user?.adminPermissions?.includes('staff_manage');
  const hasPermission = useCallback(
    (perm: AdminPermission) => {
      const perms = user?.adminPermissions ?? [];
      // Mirror the server's PermissionsGuard: super-admins (staff_manage) bypass
      // every check; otherwise the account must explicitly hold the permission.
      // An empty set grants nothing — matching the API, which 403s a zero-perm
      // staff account — so the sidebar never shows modules the account can't use.
      return perms.includes('staff_manage') || perms.includes(perm);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, login, logout, hasPermission, isSuperAdmin }),
    [user, token, login, logout, hasPermission, isSuperAdmin],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
