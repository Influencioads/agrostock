import { EarningsScreen } from '../components/MoneyScreens';

/** Seller payouts — earnings from sales, ready to withdraw. The Section route's
 * navigator header already carries the "Payouts" title. */
export function SellerPayouts() {
  return <EarningsScreen showTitle={false} />;
}
