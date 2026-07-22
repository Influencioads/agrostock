import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

/**
 * The "Bids" board (buyer requirements / RFQ): buyers post "need 500 tons of
 * wheat", sellers respond with their price. Backed by the community
 * trade-requirement API.
 */
export function RequirementsBoardPage() {
  const { t } = useI18n();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [posting, setPosting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: reqs = [] } = useQuery<AnyRec[]>({
    queryKey: ['requirement-board', search],
    queryFn: () => api.community.requirements({ search: search || undefined }) as Promise<AnyRec[]>,
  });

  const isSeller = roles.includes('seller');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.requirements.title')}</h1>
          <p className="mt-1 text-ink-soft">{t('page.requirements.sub')}</p>
        </div>
        <Button
          variant="accent"
          leftIcon={<Icon name="plus" size={16} />}
          onClick={() => (user ? setPosting(true) : navigate('/login'))}
        >
          {t('page.requirements.postRequirement')}
        </Button>
      </div>

      <label className="mb-5 flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 shadow-card">
        <Icon name="search" size={16} className="text-ink-soft" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('page.requirements.searchPlaceholder')}
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
        />
      </label>

      {posting && (
        <PostRequirementCard
          onDone={() => {
            setPosting(false);
            qc.invalidateQueries({ queryKey: ['requirement-board'] });
          }}
          onCancel={() => setPosting(false)}
        />
      )}

      <div className="space-y-3">
        {reqs.length === 0 && (
          <Card className="py-14 text-center text-ink-soft">{t('page.requirements.noneMatch')}</Card>
        )}
        {reqs.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display text-lg font-bold text-ink">{r.title}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="green">{r.quantity} {r.unit} · {r.productName}</Badge>
                  {r.grade && <Badge tone="slate">{r.grade}</Badge>}
                  {r.budget && <Badge tone="mango">{t('page.requirements.budget', { amount: r.budget })}</Badge>}
                  {r.destinationCountry && <Badge tone="info">{r.destinationCountry}</Badge>}
                </div>
                <div className="mt-2 text-xs text-ink-soft">
                  {t('page.requirements.byAuthor', { name: r.author?.name })} {r.author?.kycStatus === 'verified' && <Icon name="shield" size={11} className="inline text-brand" />} ·{' '}
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone="slate">{t('page.requirements.offersCount', { count: r._count?.responses ?? 0 })}</Badge>
                <Button size="sm" variant="outline" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                  {openId === r.id ? t('page.requirements.hide') : isSeller ? t('page.requirements.respond') : t('page.requirements.view')}
                </Button>
              </div>
            </div>
            {openId === r.id && <RequirementDetail id={r.id} isSeller={isSeller} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

function PostRequirementCard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ title: '', productCategory: 'Corn', productName: '', quantity: '', unit: 'MT', grade: '', budget: '', buyerLocation: '', destinationCountry: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    if (!f.title || !f.productName || !f.quantity) return;
    setBusy(true);
    try {
      await api.community.createRequirement({ ...f, grade: f.grade || undefined, budget: f.budget || undefined });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="mb-5 border-brand-leaf">
      <h3 className="font-display font-bold text-ink">{t('page.requirements.newRequirement')}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input label={t('page.requirements.fTitle')} placeholder={t('page.requirements.phTitle')} value={f.title} onChange={set('title')} />
        <Input label={t('page.requirements.fProduct')} placeholder={t('page.requirements.phProduct')} value={f.productName} onChange={set('productName')} />
        <div className="grid grid-cols-2 gap-2">
          <Input label={t('page.requirements.fQuantity')} placeholder="500" value={f.quantity} onChange={set('quantity')} />
          <Input label={t('page.requirements.fUnit')} value={f.unit} onChange={set('unit')} />
        </div>
        <Input label={t('page.requirements.fGrade')} placeholder={t('page.requirements.phGrade')} value={f.grade} onChange={set('grade')} />
        <Input label={t('page.requirements.fBudget')} placeholder="$270/MT" value={f.budget} onChange={set('budget')} />
        <Input label={t('page.requirements.fDeliver')} placeholder={t('page.requirements.phDeliver')} value={f.destinationCountry} onChange={set('destinationCountry')} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={submit} disabled={busy} leftIcon={<Icon name="check" size={15} />}>{busy ? t('page.requirements.posting') : t('page.requirements.post')}</Button>
        <Button variant="ghost" onClick={onCancel}>{t('common:cancel')}</Button>
      </div>
    </Card>
  );
}

function RequirementDetail({ id, isSeller }: { id: string; isSeller: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [offer, setOffer] = useState({ body: '', priceText: '', quantityText: '' });
  const [sent, setSent] = useState(false);
  const { data: req } = useQuery<AnyRec>({
    queryKey: ['requirement-detail', id],
    queryFn: () => api.community.requirement(id) as Promise<AnyRec>,
  });

  const respond = async () => {
    if (!offer.body || !offer.priceText) return;
    await api.community.respond(id, { kind: 'offer', ...offer });
    setSent(true);
    qc.invalidateQueries({ queryKey: ['requirement-detail', id] });
    qc.invalidateQueries({ queryKey: ['requirement-board'] });
  };

  return (
    <div className="mt-4 border-t border-surface-border pt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('page.requirements.sellerOffers')}</p>
      <div className="space-y-2">
        {(req?.responses ?? []).map((resp: AnyRec) => (
          <div key={resp.id} className="flex items-start justify-between rounded-md bg-brand-surface/60 px-3 py-2 text-sm">
            <div>
              <span className="font-semibold text-ink">{resp.responder?.name}</span>
              <p className="text-xs text-ink-soft">{resp.body}</p>
            </div>
            <div className="text-end">
              {resp.priceText && <div className="font-numeric font-bold text-brand-dark">{resp.priceText}</div>}
              {resp.quantityText && <div className="text-xs text-ink-soft">{resp.quantityText}</div>}
            </div>
          </div>
        ))}
        {(req?.responses ?? []).length === 0 && <p className="text-sm text-ink-soft">{t('page.requirements.noOffers')}</p>}
      </div>

      {isSeller && !sent && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px_140px_auto]">
          <input
            value={offer.body}
            onChange={(e) => setOffer((p) => ({ ...p, body: e.target.value }))}
            placeholder={t('page.requirements.offerPlaceholder')}
            className="h-10 rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
          />
          <input
            value={offer.priceText}
            onChange={(e) => setOffer((p) => ({ ...p, priceText: e.target.value }))}
            placeholder="$268/MT"
            className="h-10 rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
          />
          <input
            value={offer.quantityText}
            onChange={(e) => setOffer((p) => ({ ...p, quantityText: e.target.value }))}
            placeholder={t('page.requirements.phQty')}
            className="h-10 rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
          />
          <Button size="sm" className="h-10" onClick={respond}>{t('page.requirements.sendOffer')}</Button>
        </div>
      )}
      {sent && <p className="mt-3 text-sm font-semibold text-status-success">✓ {t('page.requirements.offerSent')}</p>}
    </div>
  );
}
