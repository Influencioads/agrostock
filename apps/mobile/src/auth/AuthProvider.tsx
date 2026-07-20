import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApiUser } from '@agrotraders/api-client';
import { api, setApiActiveRole, setApiToken, setApiRefreshToken, TOKEN_KEY, REFRESH_KEY } from '../lib/api';
import { storage } from '../lib/storage';

const USER_KEY = 'agrotraders_user';
const ACTIVE_KEY = 'agrotraders_active_role';

/** Effective roles = primary ∪ admin-approved extras. */
function effectiveRoles(u: ApiUser | null): string[] {
  if (!u) return [];
  return Array.from(new Set<string>([u.role, ...(u.roles ?? [])]));
}

interface AuthValue {
  user: ApiUser | null;
  /** The currently-viewed role (drives the tab navigator). */
  role: string | null;
  /** All roles this account holds. */
  roles: string[];
  activeRole: string | null;
  /** Switch the viewed dashboard among approved roles (no re-auth). */
  setActiveRole: (role: string) => void;
  ready: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (body: {
    email: string;
    password: string;
    name: string;
    role?: string;
    country?: string;
    phone?: string;
    location?: string;
    marketId?: string;
  }) => Promise<ApiUser>;
  loginDemo: (role: string) => Promise<ApiUser>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Restore session on boot.
  useEffect(() => {
    (async () => {
      const [token, refresh, raw, savedRole] = await Promise.all([
        storage.get(TOKEN_KEY),
        storage.get(REFRESH_KEY),
        storage.get(USER_KEY),
        storage.get(ACTIVE_KEY),
      ]);
      if (token) setApiToken(token);
      if (refresh) setApiRefreshToken(refresh);
      if (raw) {
        try {
          const u = JSON.parse(raw) as ApiUser;
          setUser(u);
          const roles = effectiveRoles(u);
          const role = savedRole && roles.includes(savedRole) ? savedRole : u.role;
          setActiveRoleState(role);
          setApiActiveRole(role);
        } catch {
          /* ignore corrupt cache */
        }
      }
      setReady(true);
    })();
  }, []);

  const roles = useMemo(() => effectiveRoles(user), [user]);

  const setActiveRole = useCallback(
    (role: string) => {
      if (!effectiveRoles(user).includes(role)) return;
      setActiveRoleState(role);
      setApiActiveRole(role);
      void storage.set(ACTIVE_KEY, role);
    },
    [user],
  );

  const persist = useCallback(async (u: ApiUser, token: string, refresh: string) => {
    setApiToken(token);
    setApiRefreshToken(refresh);
    setApiActiveRole(u.role);
    setUser(u);
    setActiveRoleState(u.role);
    await Promise.all([
      storage.set(TOKEN_KEY, token),
      storage.set(REFRESH_KEY, refresh),
      storage.set(USER_KEY, JSON.stringify(u)),
      storage.set(ACTIVE_KEY, u.role),
    ]);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login(email, password);
      // Administrators use the dedicated back-office at admin.agrotraders.org —
      // never the mobile app. Discard the token instead of persisting it.
      if (effectiveRoles(res.user).includes('admin')) {
        throw new Error('Administrators sign in at admin.agrotraders.org');
      }
      await persist(res.user, res.accessToken, res.refreshToken);
      return res.user;
    },
    [persist],
  );

  const register = useCallback<AuthValue['register']>(
    async (body) => {
      const res = await api.auth.register(body);
      await persist(res.user, res.accessToken, res.refreshToken);
      return res.user;
    },
    [persist],
  );

  const loginDemo = useCallback((role: string) => login(`${role}@agrotraders.org`, 'password123'), [login]);

  const logout = useCallback(async () => {
    setApiToken(null);
    setApiRefreshToken(null);
    setApiActiveRole(null);
    setUser(null);
    setActiveRoleState(null);
    await Promise.all([
      storage.del(TOKEN_KEY),
      storage.del(REFRESH_KEY),
      storage.del(USER_KEY),
      storage.del(ACTIVE_KEY),
    ]);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      role: user ? (activeRole ?? user.role) : null,
      roles,
      activeRole: user ? (activeRole ?? user.role) : null,
      setActiveRole,
      ready,
      login,
      register,
      loginDemo,
      logout,
    }),
    [user, activeRole, roles, setActiveRole, ready, login, register, loginDemo, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
