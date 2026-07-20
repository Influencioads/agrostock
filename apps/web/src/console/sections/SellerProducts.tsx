import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Modal } from '@agrotraders/ui';
import type { ApiProduct } from '@agrotraders/api-client';
import { api, assetUrl } from '../../lib/api';
import { useI18n } from '../../i18n';
import { errMessage } from './order-parts';
import { ProductForm, blankProduct, formToPayload, productToForm, productFormReady, type ProductFormValues } from './ProductForm';

type SellerProduct = ApiProduct & { _count?: { orders: number; auctionBids: number } };

/** Add and Edit share one form; `editing` decides which mutation runs on save. */
function ProductModal({ editing, onClose }: { editing: SellerProduct | null; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductFormValues>(editing ? productToForm(editing) : blankProduct);
  const [err, setErr] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const payload = formToPayload(form);
      return editing ? api.products.update(editing.id, payload) : api.products.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (e) => setErr(errMessage(e, editing ? t('console.productForm.saveProductError') : t('console.seller.createProductError'))),
  });

  return (
    <Modal closeLabel={t('common:close')}
      open
      onClose={onClose}
      title={editing ? t('console.productForm.editTitle', { name: editing.name }) : t('console.productForm.addTitle')}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !productFormReady(form)}>
            {save.isPending ? t('console.productForm.saving') : editing ? t('console.productForm.saveChanges') : t('console.seller.addProduct')}
          </Button>
        </>
      }
    >
      <ProductForm value={form} onChange={setForm} error={err} onError={setErr} />
    </Modal>
  );
}

/** Deleting a listing is irreversible, so it gets an explicit confirmation. */
function DeleteModal({ product, onClose }: { product: SellerProduct; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [err, setErr] = useState('');
  const remove = useMutation({
    mutationFn: () => api.products.remove(product.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (e) => setErr(errMessage(e, t('console.productForm.deleteError'))),
  });
  return (
    <Modal closeLabel={t('common:close')}
      open
      onClose={onClose}
      title={t('console.productForm.deleteTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button>
          <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? t('console.productForm.deleting') : t('console.productForm.deletePermanently')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink">{t('console.productForm.deleteConfirm', { name: product.name })}</p>
      {(product._count?.orders ?? 0) > 0 && (
        <p className="mt-2 text-sm text-ink-soft">{t('console.productForm.hasOrders', { count: product._count?.orders ?? 0 })}</p>
      )}
      {err && <p className="mt-2 text-sm font-semibold text-status-error">{err}</p>}
    </Modal>
  );
}

export function SellerProducts() {
  const { t } = useI18n();
  const [editing, setEditing] = useState<SellerProduct | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<SellerProduct | null>(null);

  const { data: products = [], isLoading } = useQuery<SellerProduct[]>({
    queryKey: ['my-products'],
    queryFn: () => api.products.mine() as Promise<SellerProduct[]>,
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.productForm.myProducts')}</h2>
          <p className="text-sm text-ink-soft">{t('console.productForm.listingsCount', { count: products.length })}</p>
        </div>
        <Button onClick={() => setAdding(true)} leftIcon={<Icon name="plus" size={16} />}>
          {t('console.nav.add')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : products.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('console.productForm.noProducts')}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            // Older rows may predate the gallery; fall back to the single cover.
            const gallery = p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-brand-surface text-2xl">
                    {gallery[0] ? <img src={assetUrl(gallery[0])} alt="" className="h-full w-full object-cover" /> : p.emoji}
                  </span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {!p.approved && <Badge tone="warn">{t('console.seller.pendingReview')}</Badge>}
                    {p.isOffer && <Badge tone="mango">{t('console.dash.offer')}</Badge>}
                    {p.isAuction && <Badge tone="info">{t('console.seller.auctionBadge')}</Badge>}
                  </div>
                </div>
                <div className="mt-2 font-display font-bold text-ink">{p.name}</div>
                <div className="text-xs text-ink-soft">
                  {p.flag} {(p.category as { name?: string } | undefined)?.name}
                  {(p.subcategory as { name?: string } | null | undefined)?.name ? ` › ${(p.subcategory as { name?: string }).name}` : ''} · {p.qty}
                </div>
                {gallery.length > 1 && <div className="mt-1 text-xs text-ink-soft">{t('console.productForm.photosCount', { count: gallery.length })}</div>}
                <div className="mt-2 flex items-end justify-between">
                  <span className="font-display text-lg font-extrabold text-ink">
                    {p.price}
                    <span className="text-xs font-normal text-ink-soft">{p.unit}</span>
                  </span>
                  <span className="text-xs text-ink-soft">{t('console.dash.ordersCount', { count: p._count?.orders ?? 0 })}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" fullWidth onClick={() => setEditing(p)}>{t('console.loaderco.edit')}</Button>
                  <Button variant="outline" size="sm" fullWidth onClick={() => setDeleting(p)}>{t('console.productForm.delete')}</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(adding || editing) && <ProductModal editing={editing} onClose={() => { setAdding(false); setEditing(null); }} />}
      {deleting && <DeleteModal product={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
