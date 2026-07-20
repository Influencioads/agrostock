import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, EmptyState, Screen } from '../../ui';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function Cart() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  return (
    <Screen>
      <EmptyState icon="cart-outline" title={t('mobile2.cart.empty')} body={t('mobile2.cart.emptyBody')} />
      <Button title={t('mobile2.cart.browse')} onPress={() => nav.navigate('App')} />
    </Screen>
  );
}
