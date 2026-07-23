import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiInvoice } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Card, EmptyState, Row, Screen, Segmented, SkeletonRows, Txt } from '../../ui';
import { OpenInvoiceButton } from './order-parts';

export function InvoiceCenter({
  title,
  subtitle,
  defaultTab = 'issued',
}: {
  title?: string;
  subtitle?: string;
  defaultTab?: 'issued' | 'received';
}) {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const { user } = useAuth();
  const [tab, setTab] = useState<'issued' | 'received'>(defaultTab);
  const { data: invoices = [], isLoading } = useQuery<ApiInvoice[]>({
    queryKey: ['invoices', tab],
    queryFn: () => api.invoices.mine(tab),
    enabled: !!user,
  });
  return (
    <Screen>
      <Txt variant="h2">{title ?? t('mobile2.invoices.title')}</Txt>
      <Txt variant="muted">{subtitle ?? t('mobile2.invoices.subtitle')}</Txt>
      <Segmented
        options={[{ id: 'issued', label: t('mobile2.invoices.issued') }, { id: 'received', label: t('mobile2.invoices.received') }]}
        value={tab}
        onChange={(v) => setTab(v as 'issued' | 'received')}
      />

      {!user ? (
        <EmptyState icon="lock-closed-outline" title={t('mobile2.invoices.signIn')} />
      ) : isLoading ? (
        <SkeletonRows />
      ) : invoices.length === 0 ? (
        <EmptyState icon="receipt-outline" title={tab === 'issued' ? t('mobile2.invoices.emptyIssued') : t('mobile2.invoices.emptyReceived')} body={t('mobile2.invoices.emptyBody')} />
      ) : (
        invoices.map((inv) => (
          <Card key={inv.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{inv.number}</Txt>
                <Txt variant="muted">
                  {t('mobile2.invoices.kind.' + inv.kind, { defaultValue: inv.kind })} - {tab === 'issued' ? t('mobile2.invoices.to', { name: inv.recipient?.name ?? '-' }) : t('mobile2.invoices.from', { name: inv.issuer?.name ?? '-' })}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt variant="title">{fmtCents(inv.totalCents)}</Txt>
                <Badge label={inv.status} tone={inv.status === 'paid' ? 'green' : inv.status === 'void' ? 'slate' : 'gold'} />
              </View>
            </Row>
            <Row gap={8}>
              <View style={{ flex: 1 }}><OpenInvoiceButton id={inv.id} /></View>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
