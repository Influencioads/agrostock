import { Button, Card, Icon } from '@agrotraders/ui';
import { useI18n } from '../i18n';

/**
 * F28: a request failure rendered distinctly from an empty result, always with a
 * retry. Surfaces (catalog, product, orders, order detail) must show this on
 * `isError` instead of falling through to a spinner or an empty-state message,
 * so a network/API failure is never mistaken for "no data".
 */
export function ErrorState({ onRetry, title, body }: { onRetry?: () => void; title?: string; body?: string }) {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col items-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-error/10 text-status-error">
        <Icon name="refresh" size={28} />
      </span>
      <p className="mt-3 font-display text-lg font-bold text-ink">{title ?? t('common:errorTitle')}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{body ?? t('common:errorBody')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {t('common:retry')}
        </Button>
      )}
    </Card>
  );
}
