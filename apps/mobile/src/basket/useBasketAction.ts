import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppBarAction } from '../ui/AppBar';
import { useI18n } from '../i18n';
import { useBasket } from './BasketContext';
import type { RootStackParamList } from '../navigation/types';

/**
 * The basket as a header action — the same icon, badge and target on every
 * catalog surface (Home, Browse, Offers), so the basket is always top-right
 * rather than floating over the tab bar on one screen only.
 */
export function useBasketAction(): AppBarAction {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useI18n();
  const { count } = useBasket();
  return {
    icon: 'bag-handle-outline',
    badge: count,
    a11y: t('pubX.rfq.title'),
    onPress: () => nav.navigate('Cart'),
  };
}
