import { useI18n } from '../i18n';

/**
 * Chat widget copy, sourced from the shared `web:chat` catalog.
 * Returns a flat record so call sites read `s.feed` rather than `t('chat.feed')`.
 */
export function useChatStrings(): Record<string, string> {
  const { t } = useI18n();
  return t('web:chat', { returnObjects: true }) as unknown as Record<string, string>;
}

/** Localized label for a `SupportCategory` enum token. */
export function useSupportCategoryLabel(): (category: string) => string {
  const { t } = useI18n();
  return (category) => t(`enums:support_category.${category}`);
}

/** Badge colour per support status — presentation, not text, so it is not translated. */
export const statusTone: Record<string, 'green' | 'gold' | 'info' | 'warn' | 'error' | 'slate'> = {
  new: 'info',
  waiting_support: 'warn',
  assigned: 'info',
  in_progress: 'info',
  waiting_user: 'gold',
  escalated: 'error',
  resolved: 'green',
  closed: 'slate',
};
