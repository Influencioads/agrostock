import { useI18n } from '../i18n';
import type { Tone } from '../lib/format';

/**
 * Chat copy for Community (System 1) and Live Support (System 2), sourced from
 * the shared `mobile:chat` catalog. Returns a flat record so call sites read
 * `s.feed` rather than `t('chat.feed')`.
 */
export function useChatStrings(): Record<string, string> {
  const { t } = useI18n();
  return t('mobile:chat', { returnObjects: true }) as unknown as Record<string, string>;
}

/** Localized label for a `SupportCategory` enum token. */
export function useSupportCategoryLabel(): (category: string) => string {
  const { t } = useI18n();
  return (category) => t(`enums:support_category.${category}`);
}

/** Localized label for a support ticket status token. */
export function useSupportStatusLabel(): (status: string) => string {
  const { t } = useI18n();
  return (status) => t(`enums:support_status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
}

/** Badge colour per support status — presentation, not text, so it is not translated. */
export const statusTone: Record<string, Tone> = {
  new: 'info',
  waiting_support: 'warn',
  assigned: 'info',
  in_progress: 'info',
  waiting_user: 'gold',
  escalated: 'error',
  resolved: 'green',
  closed: 'slate',
};
