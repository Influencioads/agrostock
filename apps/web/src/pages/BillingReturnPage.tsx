import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Icon } from '@agrotraders/ui';
import { api } from '../lib/api';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/**
 * Where the acquirer sends the browser back after payment.
 *
 * This page NEVER decides that a payment succeeded. Landing here proves only
 * that a browser followed a URL — one the user could type. The verified webhook
 * is the sole authority, so all this does is poll our own record until that
 * webhook lands, and say so honestly while it waits.
 */

const POLL_MS = 2000;
/** Give up polling after ~90s and tell the user rather than spinning forever. */
const MAX_POLLS = 45;

export function BillingReturnPage() {
  const { t } = useI18n();
  const { fmtMinor } = useCurrency();
  const [params] = useSearchParams();
  const paymentId = params.get('payment');
  const [polls, setPolls] = useState(0);
  useDocumentTitle(t('billing.returnTitle'));

  const { data, isError } = useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: () => api.billing.payment(paymentId!),
    enabled: Boolean(paymentId),
    // Stop polling once it settles, or once we have waited long enough.
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status && status !== 'pending') return false;
      return polls < MAX_POLLS ? POLL_MS : false;
    },
  });

  useEffect(() => {
    if (data?.status === 'pending') setPolls((n) => n + 1);
  }, [data]);

  const settled = data && data.status !== 'pending';
  const succeeded = data?.status === 'succeeded';
  const timedOut = !settled && polls >= MAX_POLLS;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card className="text-center">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            succeeded ? 'bg-brand-surface text-brand-dark' : settled ? 'bg-[#FBE9E6] text-status-error' : 'bg-mango-soft text-orange'
          }`}
        >
          <Icon name={succeeded ? 'check' : settled ? 'x' : 'wallet'} size={28} />
        </span>

        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">
          {succeeded ? t('billing.returnPaid') : settled ? t('billing.returnFailed') : t('billing.returnPending')}
        </h1>

        <p className="mt-2 text-ink-soft">
          {succeeded
            ? t('billing.returnPaidBody')
            : settled
              ? (data?.failureReason ?? t('billing.returnFailedBody'))
              : timedOut
                ? t('billing.returnSlowBody')
                : t('billing.returnPendingBody')}
        </p>

        {data && <p className="mt-3 font-numeric text-xl font-bold text-ink">{fmtMinor(data.amountMinor, data.currency)}</p>}

        {isError && <p className="mt-3 text-sm text-status-error">{t('billing.returnUnknown')}</p>}

        <div className="mt-6 flex justify-center gap-2">
          <Link to="/console/billing">
            <Button>{t('billing.returnToBilling')}</Button>
          </Link>
          {!succeeded && (
            <Link to="/pricing">
              <Button variant="ghost">{t('billing.returnToPricing')}</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
