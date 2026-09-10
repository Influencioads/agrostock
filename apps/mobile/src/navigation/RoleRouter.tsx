import { isServiceRole } from '@agrotraders/types';
import { useAuth } from '../auth/AuthProvider';
import { LoaderTabs, SellerTabs, ServiceTabs, ShopTabs, TransporterTabs, WorkerTabs } from './tabs';

/**
 * Roles with a console of their own. A general labour company runs the same
 * console as a loading company; they differ only in which worker types they
 * may publish.
 */
const CONSOLE_TABS: Record<string, () => JSX.Element> = {
  seller: SellerTabs,
  transporter: TransporterTabs,
  loaderco: LoaderTabs,
  workerco: LoaderTabs,
  worker: WorkerTabs,
};

/** True when `role` lands on the shop tabs (Home / Offers / Browse / Orders / Account). */
export function isShopRole(role: string | null): boolean {
  return !(role && role in CONSOLE_TABS) && !isServiceRole(role);
}

/** Picks the bottom-tab navigator from the signed-in role. Guests get the shop. */
export function RoleRouter() {
  const { role } = useAuth();
  // All five service roles share one console. Without this they fell through
  // to the buyer shop, so a packing partner had no way to reach their own
  // enquiries, profile or invoices on mobile at all.
  const Tabs = (role && CONSOLE_TABS[role]) || (isServiceRole(role) ? ServiceTabs : ShopTabs);
  return <Tabs />;
}
