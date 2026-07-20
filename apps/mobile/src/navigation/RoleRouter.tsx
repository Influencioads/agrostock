import { useAuth } from '../auth/AuthProvider';
import { LoaderTabs, SellerTabs, ShopTabs, TransporterTabs, WorkerTabs } from './tabs';

/** Picks the bottom-tab navigator from the signed-in role. Guests get the shop. */
export function RoleRouter() {
  const { role } = useAuth();
  switch (role) {
    case 'seller':
      return <SellerTabs />;
    case 'transporter':
      return <TransporterTabs />;
    case 'loaderco':
      return <LoaderTabs />;
    case 'worker':
      return <WorkerTabs />;
    default:
      return <ShopTabs />;
  }
}
