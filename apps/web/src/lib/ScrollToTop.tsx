import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SPA route changes keep the previous scroll position — jump back to the top
 * on every pathname change (browser back/forward keeps its native behavior).
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}
