import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, usePageMotion } from '@agrotraders/ui';
import { SiteHeader } from '../components/site/SiteHeader';
import { SiteFooter } from '../components/site/SiteFooter';

function AnimatedOutlet() {
  const location = useLocation();
  const page = usePageMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} {...page}>
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export function SiteLayout() {
  return (
    <div className="min-h-screen bg-surface-bg font-body text-ink">
      <SiteHeader />
      <AnimatedOutlet />
      <SiteFooter />
    </div>
  );
}
