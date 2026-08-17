import { isServiceRole } from '@agrotraders/types';
import { useAuth } from '../auth/AuthProvider';
import { LoaderTabs, SellerTabs, ServiceTabs, ShopTabs, TransporterTabs, WorkerTabs } from './tabs';

/** Picks the bottom-tab navigator from the signed-in role. Guests get the shop. */
export function RoleRouter() {
  const { role } = useAuth();
  switch (role) {
    case 'seller':
      return <SellerTabs />;
    case 'transporter':
      return <TransporterTabs />;
    // A general labour company runs the same console as a loading company;
    // they differ only in which worker types they may publish.
    case 'loaderco':
    case 'workerco':
      return <LoaderTabs />;
    case 'worker':
      return <WorkerTabs />;
    default:
      // All five service roles share one console. Without this they fell through
      // to the buyer shop, so a packing partner had no way to reach their own
      // enquiries, profile or invoices on mobile at all.
      return isServiceRole(role) ? <ServiceTabs /> : <ShopTabs />;
  }
}
