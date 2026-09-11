import { Alert, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthProvider';
import { C } from '../theme/tokens';
import { useI18n } from '../i18n';
import { useModeration, type ModerationTarget } from './ModerationProvider';

/**
 * The "⋯" affordance that puts Report and Block on a piece of user-generated
 * content (Guideline 1.2). Renders nothing on your own content — there is
 * nothing to report or block about yourself — so call sites can drop it in
 * unconditionally.
 */
export function ModerationButton({
  target,
  color = C.inkMuted,
  size = 18,
  style,
}: {
  target: ModerationTarget;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { promptReport, promptBlock } = useModeration();

  const author = target.authorId ?? (target.type === 'user' ? target.id : undefined);
  if (!user || (author && author === user.id)) return null;

  const open = () => {
    const options: Parameters<typeof Alert.alert>[2] = [
      { text: t('moderation.reportAction'), style: 'destructive', onPress: () => promptReport(target) },
    ];
    if (author) {
      options.push({
        text: t('moderation.blockAction'),
        style: 'destructive',
        onPress: () => promptBlock(author, target.authorName),
      });
    }
    options.push({ text: t('common:cancel'), style: 'cancel' });
    Alert.alert(t('moderation.menuTitle'), undefined, options);
  };

  return (
    <Pressable
      onPress={open}
      hitSlop={10}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={t('moderation.menuTitle')}
    >
      <Ionicons name="ellipsis-horizontal" size={size} color={color} />
    </Pressable>
  );
}
