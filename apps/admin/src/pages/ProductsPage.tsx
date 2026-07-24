import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, type BadgeTone } from '@agrotraders/ui';
import type { AdminProduct } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';
import { unitSuffix } from '@agrotraders/types';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warn',
  live: 'green',
  rejected: 'error',
  hidden: 'slate',
};
const STATUS_FILTERS = ['pending', 'live', 'rejected', 'hidden', 'all'] as const;
const TYPE_FILTERS = ['all', 'offer', 'auction', 'safedeal'] as const;

export function ProductsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('pending');
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>('all');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; price: string; qty: string } | null>(null);

  const { data: products = [], isLoading } = useQuery<AdminProduct[]>({
    queryKey: ['admin-products', status, type, search],
    queryFn: () => api.admin.allProducts({ status: status === 'all' ? undefined : status, type: type === 'all' ? undefined : type, search: search || undefined }),
    retry: 1,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-products'] });
    void qc.invalidateQueries({ queryKey: ['admin-stats'] });
  };
  const approve = useMutation({ mutationFn: (id: string) => api.admin.approveProduct(id), onSuccess: invalidate });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.admin.rejectProduct(id, reason),
    onSuccess: () => {
      setRejecting(null);
      invalidate();
    },
  });
  const takedown = useMutation({ mutationFn: (id: string) => api.admin.deleteProduct(id), onSuccess: invalidate });
  const save = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; price: string; qty: string }) => api.admin.updateProduct(id, body),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  return (
    <div>
      <PageHeader title={t('nav.products')} subtitle={t('prodMod.sub')} action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' + (status === f ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')}
            >
              {t(`prodMod.status.${f}`)}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="h-8 rounded-md border border-surface-border bg-white px-2 text-sm outline-none">
          {TYPE_FILTERS.map((tf) => (
            <option key={tf} value={tf}>
              {tf === 'all' ? t('prodMod.allTypes') : t(`prodMod.type.${tf}`)}
            </option>
          ))}
        </select>
        <label className="flex w-full items-center gap-2 rounded-md border border-surface-border px-3 sm:ms-auto sm:w-auto">
          <Icon name="search" size={16} className="text-ink-soft" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('prodMod.searchPlaceholder')} className="h-8 w-56 bg-transparent text-sm outline-none placeholder:text-ink-soft" />
        </label>
      </div>

      <Card padded={false}>
        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('common:loading')}</p>
        ) : products.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">{t('prodMod.none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-start text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3">{t('prodMod.colProduct')}</th>
                  <th className="px-5 py-3">{t('prodMod.colSeller')}</th>
                  <th className="px-5 py-3">{t('prodMod.colCategory')}</th>
                  <th className="px-5 py-3">{t('prodMod.colStatus')}</th>
                  <th className="px-5 py-3 text-end">{t('prodMod.colPrice')}</th>
                  <th className="px-5 py-3 text-end">{t('prodMod.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border/70 align-top last:border-0 hover:bg-brand-surface/30">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">
                        {p.emoji} {p.name}
                      </div>
                      <div className="flex gap-1 pt-0.5">
                        {p.isAuction && <span className="text-[10px] text-ink-soft">{t('prodMod.tagAuction')}</span>}
                        {p.isOffer && <span className="text-[10px] text-ink-soft">{t('prodMod.tagOffer')}</span>}
                      </div>
                      {editing?.id === p.id && (
                        <div className="mt-2 grid gap-2">
                          <Input label={t('prodMod.fName')} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                          <Input label={t('prodMod.fPrice')} value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                          <Input label={t('prodMod.fQty')} value={editing.qty} onChange={(e) => setEditing({ ...editing, qty: e.target.value })} />
                          <div className="flex gap-2">
                            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate({ id: p.id, name: editing.name, price: editing.price, qty: editing.qty })}>
                              {t('prodMod.save')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                              {t('common:cancel')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {p.seller?.name} {p.seller?.country}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="slate">{p.category?.name}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[p.status] ?? 'slate'}>{t(`prodMod.status.${p.status}`, { defaultValue: p.status })}</Badge>
                      {p.status === 'rejected' && p.rejectionReason && <div className="pt-1 text-[10px] text-ink-soft">{p.rejectionReason}</div>}
                    </td>
                    <td className="px-5 py-3 text-end font-numeric font-bold text-ink">
                      {p.price}
                      {unitSuffix(p.unit)}
                    </td>
                    <td className="px-5 py-3">
                      {rejecting?.id === p.id ? (
                        <div className="flex flex-col gap-2">
                          <Input placeholder={t('prodMod.reasonPlaceholder')} value={rejecting.reason} onChange={(e) => setRejecting({ id: p.id, reason: e.target.value })} />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="danger" disabled={reject.isPending} onClick={() => reject.mutate({ id: p.id, reason: rejecting.reason })}>
                              {t('prodMod.confirm')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                              {t('common:cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          {p.status !== 'live' && (
                            <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(p.id)} leftIcon={<Icon name="check" size={14} />}>
                              {t('prodMod.approve')}
                            </Button>
                          )}
                          {p.status !== 'rejected' && (
                            <Button size="sm" variant="outline" onClick={() => setRejecting({ id: p.id, reason: '' })}>
                              {t('prodMod.reject')}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditing({ id: p.id, name: p.name, price: p.price, qty: p.qty ?? '' })}>
                            {t('prodMod.edit')}
                          </Button>
                          {p.status !== 'hidden' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={takedown.isPending}
                              // ADM-02: confirm before hiding a live listing (matches
                              // the pattern Categories/Reviews already use).
                              onClick={() => { if (window.confirm(t('prodMod.confirmTakedown'))) takedown.mutate(p.id); }}
                            >
                              {t('prodMod.takedown')}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
