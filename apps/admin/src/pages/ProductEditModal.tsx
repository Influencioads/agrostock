import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Modal } from '@agrotraders/ui';
import {
  ProductForm,
  formToPayload,
  productFormReady,
  productToForm,
  type ProductFormValues,
} from '@agrotraders/ui/ProductForm';
import type { AdminProduct } from '@agrotraders/api-client';
import { api, assetUrl } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useI18n } from '../i18n';

/**
 * Admin edit for EVERY field of a listing — the SAME form the seller console
 * renders, from `@agrotraders/ui`, so the two can never drift apart on what a
 * listing is allowed to contain.
 *
 * It posts to `PATCH /admin/products/:id`, which delegates to the seller's own
 * `ProductsService.update`; currency conversion, subcategory/market validation
 * and cover-image election therefore behave identically whichever side edited.
 * Before this, an admin could only touch name / price / qty.
 */
export function ProductEditModal({ product, onClose }: { product: AdminProduct; onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductFormValues>(() => productToForm(product));
  const [err, setErr] = useState('');
  /** Set on a click that could not save — the form then marks the offending fields. */
  const [tried, setTried] = useState(false);

  const save = useMutation({
    // `verified` is admin-only and not part of the shared form; everything the
    // form does produce goes over unchanged.
    mutationFn: () => api.admin.updateProduct(product.id, formToPayload(form)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-products'] });
      void qc.invalidateQueries({ queryKey: ['admin-stats'] });
      onClose();
    },
    onError: (e) => setErr(errMessage(e, t('prodEdit.saveError'))),
  });

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t('common:close')}
      title={t('prodEdit.title', { name: product.name })}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button>
          <Button onClick={() => (productFormReady(form) ? save.mutate() : setTried(true))} disabled={save.isPending}>
            {save.isPending ? t('prodEdit.saving') : t('prodEdit.save')}
          </Button>
        </>
      }
    >
      {/* No inline "create a market": `POST /markets` is seller-only, and admins
          have the Markets page for it. */}
      <ProductForm value={form} onChange={setForm} error={err} onError={setErr} api={api} assetUrl={assetUrl} showErrors={tried} />
    </Modal>
  );
}
