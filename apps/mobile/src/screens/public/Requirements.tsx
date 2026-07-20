import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, Input, Loading, Row, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

/**
 * "Bids" board (buyer requirements / RFQ): buyers post what they need, sellers
 * respond with their price.
 */
export function RequirementsBoard() {
  const { user, roles } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const { data: reqs = [], isLoading } = useQuery<AnyRec[]>({
    queryKey: ['requirement-board', search],
    queryFn: () => api.community.requirements({ search: search || undefined }) as Promise<AnyRec[]>,
  });

  const isSeller = roles.includes('seller');

  if (posting) {
    return (
      <PostRequirement
        onDone={() => {
          setPosting(false);
          qc.invalidateQueries({ queryKey: ['requirement-board'] });
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: space.lg, gap: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Input placeholder={t('pubX.req.searchPlaceholder')} value={search} onChangeText={setSearch} />
        {user ? <Button title={t('pubX.req.postRequirement')} icon="add" size="sm" onPress={() => setPosting(true)} /> : null}
      </View>
      <FlatList
        data={reqs}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: space.lg, gap: 12 }}
        ListEmptyComponent={isLoading ? <Loading /> : <EmptyState icon="clipboard-outline" title={t('pubX.req.empty')} />}
        renderItem={({ item: r }) => (
          <Card style={{ gap: 8 }}>
            <Txt variant="title">{r.title}</Txt>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              <Badge label={`${r.quantity} ${r.unit} · ${r.productName}`} tone="green" />
              {r.budget ? <Badge label={t('pubX.req.budget', { value: r.budget })} tone="mango" /> : null}
              {r.destinationCountry ? <Badge label={r.destinationCountry} tone="info" /> : null}
              <Badge label={t('pubX.req.offersCount', { count: r._count?.responses ?? 0 })} tone="slate" />
            </Row>
            <Txt variant="muted">{t('pubX.req.byLine', { name: r.author?.name, date: new Date(r.createdAt).toLocaleDateString() })}</Txt>
            <Button
              title={openId === r.id ? t('pubX.req.hideOffers') : isSeller ? t('pubX.req.respondPrice') : t('pubX.req.viewOffers')}
              variant="outline"
              size="sm"
              onPress={() => setOpenId(openId === r.id ? null : r.id)}
            />
            {openId === r.id ? <RequirementDetail id={r.id} isSeller={isSeller} /> : null}
          </Card>
        )}
      />
    </View>
  );
}

function PostRequirement({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ title: '', productCategory: 'Corn', productName: '', quantity: '', unit: 'MT', budget: '', destinationCountry: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    if (!f.title || !f.productName || !f.quantity) return;
    setBusy(true);
    try {
      await api.community.createRequirement({ ...f, budget: f.budget || undefined });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: space.lg, gap: 12 }}>
      <Txt variant="h3">{t('pubX.req.newTitle')}</Txt>
      <Input label={t('pubX.req.fTitle')} placeholder={t('pubX.ph.reqTitle')} value={f.title} onChangeText={set('title')} />
      <Input label={t('pubX.req.fProduct')} placeholder={t('pubX.ph.reqProduct')} value={f.productName} onChangeText={set('productName')} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Input label={t('pubX.req.fQuantity')} placeholder="500" keyboardType="numeric" value={f.quantity} onChangeText={set('quantity')} /></View>
        <View style={{ flex: 1 }}><Input label={t('pubX.req.fUnit')} value={f.unit} onChangeText={set('unit')} /></View>
      </Row>
      <Input label={t('pubX.req.fBudget')} placeholder={t('pubX.ph.reqBudget')} value={f.budget} onChangeText={set('budget')} />
      <Input label={t('pubX.req.fDeliverTo')} placeholder={t('pubX.ph.reqDeliverTo')} value={f.destinationCountry} onChangeText={set('destinationCountry')} />
      <Row gap={8}>
        <View style={{ flex: 1 }}><Button title={busy ? t('pubX.req.posting') : t('pubX.req.post')} icon="checkmark" loading={busy} full onPress={submit} /></View>
        <View style={{ flex: 1 }}><Button title={t('pubX.req.cancel')} variant="outline" full onPress={onDone} /></View>
      </Row>
    </View>
  );
}

function RequirementDetail({ id, isSeller }: { id: string; isSeller: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [offer, setOffer] = useState({ body: '', priceText: '' });
  const [sent, setSent] = useState(false);
  const { data: req } = useQuery<AnyRec>({ queryKey: ['requirement-detail', id], queryFn: () => api.community.requirement(id) as Promise<AnyRec> });

  const respond = async () => {
    if (!offer.body || !offer.priceText) return;
    await api.community.respond(id, { kind: 'offer', ...offer });
    setSent(true);
    qc.invalidateQueries({ queryKey: ['requirement-detail', id] });
    qc.invalidateQueries({ queryKey: ['requirement-board'] });
  };

  return (
    <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }}>
      {(req?.responses ?? []).map((resp: AnyRec) => (
        <Row key={resp.id} style={{ justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: 10, padding: 10 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="title">{resp.responder?.name}</Txt>
            <Txt variant="muted">{resp.body}</Txt>
          </View>
          {resp.priceText ? <Txt variant="title" color={C.dark}>{resp.priceText}</Txt> : null}
        </Row>
      ))}
      {(req?.responses ?? []).length === 0 ? <Txt variant="muted">{t('pubX.req.noOffersYet')}</Txt> : null}
      {isSeller && !sent ? (
        <View style={{ gap: 8 }}>
          <Input placeholder={t('pubX.req.offerPlaceholder')} value={offer.body} onChangeText={(v) => setOffer((p) => ({ ...p, body: v }))} />
          <Row gap={8}>
            <View style={{ flex: 1 }}>
              <Input placeholder={t('pubX.ph.offerPrice')} value={offer.priceText} onChangeText={(v) => setOffer((p) => ({ ...p, priceText: v }))} />
            </View>
            <Button title={t('pubX.req.send')} size="sm" onPress={respond} />
          </Row>
        </View>
      ) : null}
      {sent ? <Txt color={C.success} variant="small">{t('pubX.req.offerSent')}</Txt> : null}
    </View>
  );
}
