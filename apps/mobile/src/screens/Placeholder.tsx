import { Screen, EmptyState } from '../ui';
import { useI18n } from '../i18n';

/** Fallback for sections not yet wired — keeps the app fully navigable. */
export function Placeholder({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <Screen>
      <EmptyState icon="construct-outline" title={title} body={t('mobile2.placeholder.body')} />
    </Screen>
  );
}
