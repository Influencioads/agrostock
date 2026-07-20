import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { C } from '../theme/tokens';
import { useI18n } from '../i18n';
import { navigateBack, type BackNavigation } from './backAction';
import { backChevron } from '../lib/rtl';

export function BackButton({ navigation, fallback = 'Home' }: { navigation: BackNavigation; fallback?: string }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common:back')}
      hitSlop={12}
      onPress={() => navigateBack(navigation, fallback)}
      style={({ pressed }) => ({
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        marginStart: -8,
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <Ionicons name={backChevron()} size={26} color={C.ink} />
    </Pressable>
  );
}
