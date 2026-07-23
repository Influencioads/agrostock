import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiInvoice } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, Input, Row, Screen, Segmented, SkeletonRows, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { OpenInvoiceButton } from '../components/order-parts';
import { FormModal } from './parts';

interface Trip { id: string; reference: string; fromCity: string; toCity: string; cargo: string; status: string }

/** Freight invoices — raise from delivered trips, list issued/received, mark paid. */
export function TransporterInvoices() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState('issued');
  const [raiseTrip, setRaiseTrip] = useState<Trip | null>(null);
  const { data: invoices = [], isLoading } = useQuery<ApiInvoice[]>({ queryKey: ['invoices', tab], queryFn: () => api.invoices.mine(tab as 'issued' | 'received'), enabled: !!user });
  const { data: trips = [] } = useQuery<Trip[]>({ queryKey: ['trips', 'mine'], queryFn: () => api.transport.myTrips() as Promise<Trip[]>, enabled: !!user });
  const issued = useQuery<ApiInvoice[]>({ queryKey: ['invoices', 'issued'], queryFn: () => api.invoices.mine('issued'), enabled: !!user });

  const invoicedTripIds = new Set((issued.data ?? []).filter((i) => i.kind === 'trip').map((i) => i.tripId));
  const billable = trips.filter((trip) => trip.status === 'delivered' && !invoicedTripIds.has(trip.id));

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'paid' | 'void' }) => api.invoices.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  return (
    <Screen>
      <Txt variant="h2">{t('transX.invoices.title')}</Txt>
      <Txt variant="muted">{t('transX.invoices.subtitle')}</Txt>

      {billable.length > 0 && (
        <Card style={{ gap: 10 }}>
          <Txt variant="h3">{t('transX.invoices.ready')}</Txt>
          {billable.map((trip) => (
            <Row key={trip.id} style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{trip.reference}</Txt>
                <Txt variant="muted">{trip.fromCity} → {trip.toCity} · {trip.cargo}</Txt>
              </View>
              <Button title={t('transX.invoices.raise')} size="sm" onPress={() => setRaiseTrip(trip)} />
            </Row>
          ))}
        </Card>
      )}

      <Segmented options={[{ id: 'issued', label: t('transX.invoices.tabIssued') }, { id: 'received', label: t('transX.invoices.tabReceived') }]} value={tab} onChange={setTab} />

      {isLoading ? (
        <SkeletonRows />
      ) : invoices.length === 0 ? (
        <EmptyState icon="receipt-outline" title={tab === 'issued' ? t('transX.invoices.emptyIssued') : t('transX.invoices.emptyReceived')} body={t('transX.invoices.emptyBody')} />
      ) : (
        invoices.map((inv) => (
          <Card key={inv.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt variant="title">{inv.number}</Txt>
                <Txt variant="muted">{t('transX.invoices.kind.' + inv.kind, { defaultValue: inv.kind })} · {tab === 'issued' ? t('transX.invoices.toLabel', { name: inv.recipient?.name ?? '—' }) : t('transX.invoices.fromLabel', { name: inv.issuer?.name ?? '—' })}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt variant="title">{fmtCents(inv.totalCents)}</Txt>
                <Badge label={inv.status} tone={inv.status === 'paid' ? 'green' : inv.status === 'void' ? 'slate' : 'gold'} />
              </View>
            </Row>
            <Row gap={8}>
              <View style={{ flex: 1 }}><OpenInvoiceButton id={inv.id} /></View>
              {tab === 'issued' && inv.status === 'issued' && (
                <View style={{ flex: 1 }}><Button title={t('transX.invoices.markPaid')} size="sm" full loading={setStatus.isPending} onPress={() => setStatus.mutate({ id: inv.id, status: 'paid' })} /></View>
              )}
            </Row>
          </Card>
        ))
      )}

      {raiseTrip && <RaiseModal trip={raiseTrip} onClose={() => setRaiseTrip(null)} onDone={() => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['trips', 'mine'] }); }} />}
    </Screen>
  );
}

function RaiseModal({ trip, onClose, onDone }: { trip: Trip; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const raise = useMutation({
    mutationFn: () =>
      api.invoices.create({
        kind: 'trip',
        subjectId: trip.id,
        // A typed amount overrides the server's default freight line; blank uses it.
        lines: amount ? [{ description: `Freight ${trip.fromCity} → ${trip.toCity} (${trip.reference})`, qty: 1, unitPriceCents: Math.round(Number(amount) * 100) }] : undefined,
        taxCents: Math.round((Number(tax) || 0) * 100),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => { onDone(); onClose(); },
    onError: (e) => setError(errMessage(e, t('transX.invoices.raiseError'))),
  });
  return (
    <FormModal visible title={t('transX.invoices.modalTitle', { ref: trip.reference })} submitLabel={t('transX.invoices.submitLabel')} onClose={onClose} onSubmit={() => raise.mutate()} submitting={raise.isPending}>
      <Txt variant="muted">{trip.fromCity} → {trip.toCity} · {trip.cargo}</Txt>
      <Input label={t('transX.invoices.freightAmount')} placeholder={t('transX.invoices.freightPlaceholder')} keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <Input label={t('transX.invoices.tax')} keyboardType="numeric" value={tax} onChangeText={setTax} />
      <Input label={t('transX.invoices.notes')} placeholder={t('transX.invoices.notesPlaceholder')} value={notes} onChangeText={setNotes} />
      {error ? <Txt color={C.error}>{error}</Txt> : null}
    </FormModal>
  );
}
