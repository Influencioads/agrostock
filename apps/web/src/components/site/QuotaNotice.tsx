import { Link } from 'react-router-dom';
import { Button, Card, Icon } from '@agrotraders/ui';
import { useI18n } from '../../i18n';
import { quotaError } from '../../console/sections/order-parts';

/**
 * The upsell shown when a write is blocked by a plan quota.
 *
 * Renders nothing for any other error, so a caller can drop it in beside its
 * normal error message without having to classify failures itself. The point is
 * that a user who hits a wall is told exactly which wall and offered the way
 * past it, rather than reading "Forbidden".
 */
export function QuotaNotice({ error }: { error: unknown }) {
  const { t } = useI18n();
  const quota = quotaError(error);
  if (!quota) return null;

  return (
    <Card className="border-mango bg-mango/5">
      <div className="flex gap-3">
        <Icon name="chart" className="mt-0.5 shrink-0 text-orange" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{t(`billing.limit.${quota.key}`)}</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {t('billing.quotaExceeded', { used: quota.used, limit: quota.limit })}
          </p>
          <Link to="/pricing" className="mt-2 inline-block">
            <Button>{t('billing.upgradeCta')}</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
