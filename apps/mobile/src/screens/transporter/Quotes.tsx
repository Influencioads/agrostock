import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { usd, type Tone } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';
import { useI18n } from '../../i18n';

interface Quote {
  id: string; priceCents: number; etaDays?: number | null; status: string; createdAt?: string;
  request?: { reference: string; fromCity: string; toCity: string; cargo: string } | null;
}
const quoteTone: Record<string, Tone> = { pending: 'warn', accepted: 'green', rejected: 'error' };

/** Quotes the transporter has placed, with the ability to withdraw pending ones. */
export function TransporterQuotes() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: quotes = [], isLoading } = useQuery<Quote[]>({ queryKey: ['quotes', 'mine'], queryFn: () => api.transport.myQuotes() as Promise<Quote[]>, enabled: !!user });
  const withdraw = useMutation({
    mutationFn: (id: string) => api.transport.withdrawQuote(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes', 'mine'] }); qc.invalidateQueries({ queryKey: ['requests', 'open'] }); },
  });

  return (
    <Screen>
      <Txt variant="h2">{t('transX.quotes.title')}</Txt>
      <Txt variant="muted">{t('transX.quotes.subtitle')}</Txt>

      {isLoading ? (
        <Loading />
      ) : quotes.length === 0 ? (
        <EmptyState icon="document-text-outline" title={t('transX.quotes.emptyTitle')} body={t('transX.quotes.emptyBody')} />
      ) : (
        quotes.map((q) => (
          <Card key={q.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{q.request ? `${q.request.fromCity} → ${q.request.toCity}` : t('transX.quotes.loadFallback')}</Txt>
                <Txt variant="muted">
                  {q.request ? `#${q.request.reference} · ${q.request.cargo}` : ''}
                  {q.etaDays ? ` · ${t('transX.quotes.eta', { days: q.etaDays })}` : ''}
                  {q.createdAt ? ` · ${new Date(q.createdAt).toLocaleDateString()}` : ''}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt variant="title">{usd(q.priceCents)}</Txt>
                <Badge label={q.status} tone={quoteTone[q.status] ?? 'slate'} />
              </View>
            </Row>
            {q.status === 'pending' && (
              <Button title={t('transX.quotes.withdraw')} variant="outline" size="sm" loading={withdraw.isPending} onPress={() => withdraw.mutate(q.id)} />
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
