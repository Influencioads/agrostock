import { EarningsScreen } from '../components/MoneyScreens';
import { useI18n } from '../../i18n';

/** Seller payouts — earnings from sales, ready to withdraw. */
export function SellerPayouts() {
  const { t } = useI18n();
  return <EarningsScreen title={t('mobile2.payouts.title')} />;
}
