import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

/** Requires a logged-in user; otherwise redirects to /login (remembering the target). */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, roles, logout } = useAuth();
  const location = useLocation();
  // Admins have no console on the public site — a stale/persisted admin session
  // (e.g. from before the split) is signed out and bounced to /login.
  const isAdmin = roles.includes('admin');

  useEffect(() => {
    if (isAdmin) logout();
  }, [isAdmin, logout]);

  if (!user || isAdmin) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
