import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, EmptyState, Input, Loading, Row, Screen, Txt } from '../../ui';
import { useI18n } from '../../i18n';

interface Req { id: string; reference: string; fromCity: string; toCity: string; cargo: string; createdBy?: { name: string }; _count?: { quotes: number } }

export function TransporterRequests() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Record<string, { price: string; eta: string }>>({});
  const { data: requests = [], isLoading } = useQuery<Req[]>({ queryKey: ['requests', 'open'], queryFn: () => api.transport.requestsOpen() as Promise<Req[]>, enabled: !!user });
  const quote = useMutation({
    mutationFn: ({ id, priceCents, etaDays }: { id: string; priceCents: number; etaDays?: number }) => api.transport.quote(id, { priceCents, etaDays }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests', 'open'] }); qc.invalidateQueries({ queryKey: ['quotes', 'mine'] }); },
  });
  const set = (id: string, k: 'price' | 'eta', v: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? { price: '', eta: '' }), [k]: v } }));

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('transX.requests.title')}</Txt>
      {isLoading ? (
        <Loading />
      ) : requests.length === 0 ? (
        <EmptyState icon="cube-outline" title={t('transX.requests.emptyTitle')} body={t('transX.requests.emptyBody')} />
      ) : (
        requests.map((r) => {
          const d = drafts[r.id] ?? { price: '', eta: '' };
          return (
            <Card key={r.id} style={{ gap: 10 }}>
              <View>
                <Txt variant="title">{r.fromCity} → {r.toCity}</Txt>
                <Txt variant="muted">#{r.reference} · {r.cargo} · {t('transX.quotesCount', { count: r._count?.quotes ?? 0 })}</Txt>
              </View>
              <Row gap={8}>
                <View style={{ flex: 1 }}>
                  <Input placeholder={t('transX.requests.quotePlaceholder')} keyboardType="numeric" value={d.price} onChangeText={(v) => set(r.id, 'price', v)} />
                </View>
                <View style={{ width: 90 }}>
                  <Input placeholder={t('transX.requests.etaPlaceholder')} keyboardType="numeric" value={d.eta} onChangeText={(v) => set(r.id, 'eta', v)} />
                </View>
                <Button title={t('transX.requests.quote')} loading={quote.isPending} disabled={!Number(d.price)} onPress={() => quote.mutate({ id: r.id, priceCents: Math.round(Number(d.price) * 100), etaDays: Number(d.eta) || undefined })} />
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
