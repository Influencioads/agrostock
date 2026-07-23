import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { isPendingVerification, type ApiUser, type RegisterResult } from '@agrotraders/api-client';
import { api } from '../lib/api';

interface AuthContextValue {
  user: ApiUser | null;
  token: string | null;
  /** Effective roles the account holds (primary ∪ admin-approved extras). */
  roles: string[];
  /** Which role's dashboard is currently being viewed (∈ roles). */
  activeRole: string;
  /** Switch the viewed dashboard to another approved role (no re-auth). */
  setActiveRole: (role: string) => void;
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
  }) => Promise<RegisterResult>;
  /** Consume a confirmation link and start the session it returns. */
  verifyEmail: (token: string) => Promise<ApiUser>;
  /** Consume a reset token, set the new password, and start the session. */
  resetPassword: (token: string, password: string) => Promise<ApiUser>;
  /** Verify an emailed login code and start the session it returns. */
  verifyOtp: (email: string, code: string) => Promise<ApiUser>;
  logout: () => void;
}

const Ctx = createContext<AuthContextValue | null>(null);

function effectiveRoles(u: ApiUser | null): string[] {
  if (!u) return [];
  return Array.from(new Set<string>([u.role, ...(u.roles ?? [])]));
}

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
  const [activeRole, setActiveRoleState] = useState<string>(() => {
    const stored = readStored();
    const roles = effectiveRoles(stored.user);
    const saved = localStorage.getItem('activeRole');
    return saved && roles.includes(saved) ? saved : (stored.user?.role ?? 'buyer');
  });

  const roles = useMemo(() => effectiveRoles(user), [user]);

  const setActiveRole = useCallback(
    (role: string) => {
      if (!effectiveRoles(user).includes(role)) return;
      localStorage.setItem('activeRole', role);
      setActiveRoleState(role);
    },
    [user],
  );

  const persist = useCallback((u: ApiUser, accessToken: string, refreshToken: string) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('activeRole', u.role);
    setState({ user: u, token: accessToken });
    setActiveRoleState(u.role);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login(email, password);
      // Administrators use the dedicated back-office at admin.agrotraders.org.
      // The public site never signs an admin in — the token is discarded here.
      if (effectiveRoles(res.user).includes('admin')) {
        throw new Error('Administrators sign in at admin.agrotraders.org');
      }
      persist(res.user, res.accessToken, res.refreshToken);
      return res.user;
    },
    [persist],
  );

  const register = useCallback<AuthContextValue['register']>(
    async (body) => {
      const res = await api.auth.register(body);
      // When email confirmation is on there is no session yet — the caller shows
      // a "check your inbox" panel and the session starts at /verify-email.
      if (!isPendingVerification(res)) persist(res.user, res.accessToken, res.refreshToken);
      return res;
    },
    [persist],
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      const res = await api.auth.verifyEmail(token);
      persist(res.user, res.accessToken, res.refreshToken);
      return res.user;
    },
    [persist],
  );

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      const res = await api.auth.resetPassword(token, password);
      if (effectiveRoles(res.user).includes('admin')) {
        throw new Error('Administrators sign in at admin.agrotraders.org');
      }
      persist(res.user, res.accessToken, res.refreshToken);
      return res.user;
    },
    [persist],
  );

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      const res = await api.auth.verifyOtp(email, code);
      if (effectiveRoles(res.user).includes('admin')) {
        throw new Error('Administrators sign in at admin.agrotraders.org');
      }
      persist(res.user, res.accessToken, res.refreshToken);
      return res.user;
    },
    [persist],
  );

  const logout = useCallback(() => {
    // F39: revoke the session server-side so the refresh token can't be reused.
    // Best-effort — the local session is cleared regardless of the network call.
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) void api.auth.logout(refreshToken).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
    setState({ user: null, token: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, roles, activeRole, setActiveRole, login, register, verifyEmail, resetPassword, verifyOtp, logout }),
    [user, token, roles, activeRole, setActiveRole, login, register, verifyEmail, resetPassword, verifyOtp, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
