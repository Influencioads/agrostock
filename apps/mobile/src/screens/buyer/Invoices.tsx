import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiInvoice } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { usd } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';
import { OpenInvoiceButton } from '../components/order-parts';

/** Every invoice raised against this buyer — sellers, transporters, loaders, workers. */
export function BuyerInvoices() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: invoices = [], isLoading } = useQuery<ApiInvoice[]>({
    queryKey: ['invoices', 'received'],
    queryFn: () => api.invoices.mine('received'),
    enabled: !!user,
  });

  return (
    <Screen>
      <Txt variant="h2">{t('buyerX.invoices.screenTitle')}</Txt>
      <Txt variant="muted">{t('buyerX.invoices.subtitle')}</Txt>
      {!user ? (
        <EmptyState icon="lock-closed-outline" title={t('buyerX.invoices.signInTitle')} />
      ) : isLoading ? (
        <Loading />
      ) : invoices.length === 0 ? (
        <EmptyState icon="document-text-outline" title={t('buyerX.invoices.emptyTitle')} body={t('buyerX.invoices.emptyBody')} />
      ) : (
        invoices.map((inv) => (
          <Card key={inv.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{inv.number}</Txt>
                <Txt variant="muted">
                  {t('buyerX.invoices.kind.' + inv.kind, { defaultValue: inv.kind })} · {inv.issuer?.name}
                  {inv.order ? ` · #${inv.order.reference}` : ''}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt variant="title">{usd(inv.totalCents)}</Txt>
                <Badge label={inv.status} tone={inv.status === 'paid' ? 'green' : inv.status === 'void' ? 'slate' : 'gold'} />
              </View>
            </Row>
            <OpenInvoiceButton id={inv.id} />
          </Card>
        ))
      )}
    </Screen>
  );
}
