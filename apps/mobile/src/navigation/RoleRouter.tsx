import { isServiceRole } from '@agrotraders/types';
import { useAuth } from '../auth/AuthProvider';
import type { ConsoleRole } from './menu';
import { LoaderTabs, SellerTabs, ServiceTabs, ShopTabs, TransporterTabs, WorkerTabs } from './tabs';

/**
 * The tabs behind each console role. Keyed by `ConsoleRole`, so this map and
 * `CONSOLE_ROLES` in `./menu` cannot drift apart silently.
 */
const CONSOLE_TABS: Record<ConsoleRole, () => JSX.Element> = {
  seller: SellerTabs,
  transporter: TransporterTabs,
  loaderco: LoaderTabs,
  workerco: LoaderTabs,
  worker: WorkerTabs,
};

// `isShopRole` now lives in ./menu — a module with no navigator imports — so
// screens can call it without the RoleRouter -> tabs -> Home -> RoleRouter
// require cycle. Import it from there, not from here.

/** Picks the bottom-tab navigator from the signed-in role. Guests get the shop. */
export function RoleRouter() {
  const { role } = useAuth();
  // All five service roles share one console. Without this they fell through
  // to the buyer shop, so a packing partner had no way to reach their own
  // enquiries, profile or invoices on mobile at all.
  const Tabs = (role && CONSOLE_TABS[role as ConsoleRole]) || (isServiceRole(role) ? ServiceTabs : ShopTabs);
  return <Tabs />;
}
