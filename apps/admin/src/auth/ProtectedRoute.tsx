import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoginPage } from '../pages/LoginPage';

/** Admin console requires a logged-in admin; otherwise shows the login screen. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <LoginPage />;
  return <>{children}</>;
}
