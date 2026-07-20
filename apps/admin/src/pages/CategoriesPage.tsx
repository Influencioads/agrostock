import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal } from '@agrotraders/ui';
import type { ApiCategory, ApiSubcategory } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';

type CatModal =
  | { kind: 'category-new' }
  | { kind: 'category-edit'; cat: ApiCategory }
  | { kind: 'sub-new'; cat: ApiCategory }
  | { kind: 'sub-edit'; cat: ApiCategory; sub: ApiSubcategory }
  | null;

export function CategoriesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [modal, setModal] = useState<CatModal>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: categories = [], isLoading } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const remove = useMutation({
    mutationFn: (cat: ApiCategory) => api.admin.removeCategory(cat.id),
    onSuccess: invalidate,
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });
  const removeSub = useMutation({
    mutationFn: (sub: ApiSubcategory) => api.admin.removeSubcategory(sub.id),
    onSuccess: invalidate,
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });

  const totalSubs = categories.reduce((n, c) => n + (c.subcategories?.length ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={t('page.categories.title')}
        subtitle={t('page.categories.subtitle', { categories: categories.length, subcategories: totalSubs })}
        action={
          <Button onClick={() => setModal({ kind: 'category-new' })} leftIcon={<Icon name="plus" size={16} />}>
            {t('catAdmin.addCategory')}
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : categories.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('catAdmin.empty')}</Card>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const subs = cat.subcategories ?? [];
            const isOpen = expanded[cat.id] ?? false;
            return (
              <Card key={cat.id} padded={false}>
                <div className="flex items-center gap-3 px-5 py-4">
                  <button
                    onClick={() => toggle(cat.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-brand-surface"
                    aria-label={isOpen ? t('catAdmin.collapse') : t('catAdmin.expand')}
                    disabled={subs.length === 0}
                  >
                    <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={18} />
                  </button>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface text-xl">
                    {cat.emoji ?? '📦'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display font-bold text-ink">{cat.name}</div>
                    <div className="text-xs text-ink-soft">
                      {t('catAdmin.subStats', { subs: subs.length, products: cat._count?.products ?? 0 })}
                    </div>
                  </div>
                  <Badge tone="slate">{t('catAdmin.productsCount', { count: cat._count?.products ?? 0 })}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setModal({ kind: 'sub-new', cat })} leftIcon={<Icon name="plus" size={14} />}>
                      {t('catAdmin.addSub')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setModal({ kind: 'category-edit', cat })}>
                      {t('catAdmin.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(t('catAdmin.confirmDeleteCat', { name: cat.name }))) remove.mutate(cat);
                      }}
                    >
                      {t('catAdmin.delete')}
                    </Button>
                  </div>
                </div>

                {isOpen && subs.length > 0 && (
                  <div className="border-t border-surface-border bg-brand-surface/30 px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {subs.map((sub) => (
                        <span
                          key={sub.id}
                          className="group flex items-center gap-1.5 rounded-full border border-surface-border bg-white py-1 ps-3 pe-1.5 text-sm text-ink"
                        >
                          {sub.emoji && <span>{sub.emoji}</span>}
                          {sub.name}
                          <span className="text-[11px] text-ink-soft">({sub._count?.products ?? 0})</span>
                          <button
                            onClick={() => setModal({ kind: 'sub-edit', cat, sub })}
                            className="ms-0.5 flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-brand-surface hover:text-ink"
                            aria-label={t('catAdmin.editSub')}
                          >
                            <Icon name="palette" size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(t('catAdmin.confirmDeleteSub', { name: sub.name }))) removeSub.mutate(sub);
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-status-error/10 hover:text-status-error"
                            aria-label={t('catAdmin.deleteSub')}
                          >
                            <Icon name="x" size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {modal && <TaxonomyModal modal={modal} onClose={() => setModal(null)} onSaved={invalidate} />}
    </div>
  );
}

/* ── Create/edit modal for both categories and subcategories ──────── */

function TaxonomyModal({ modal, onClose, onSaved }: { modal: NonNullable<CatModal>; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const isSub = modal.kind === 'sub-new' || modal.kind === 'sub-edit';
  const initialName = modal.kind === 'category-edit' ? modal.cat.name : modal.kind === 'sub-edit' ? modal.sub.name : '';
  const initialEmoji =
    modal.kind === 'category-edit' ? modal.cat.emoji ?? '' : modal.kind === 'sub-edit' ? modal.sub.emoji ?? '' : '';

  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [err, setErr] = useState('');

  const save = useMutation({
    mutationFn: (): Promise<unknown> => {
      const trimmedEmoji = emoji.trim() || undefined;
      switch (modal.kind) {
        case 'category-new':
          return api.admin.createCategory({ name: name.trim(), emoji: trimmedEmoji });
        case 'category-edit':
          return api.admin.updateCategory(modal.cat.id, { name: name.trim(), emoji: emoji.trim() });
        case 'sub-new':
          return api.admin.createSubcategory(modal.cat.id, { name: name.trim(), emoji: trimmedEmoji });
        case 'sub-edit':
          return api.admin.updateSubcategory(modal.sub.id, { name: name.trim(), emoji: emoji.trim() });
      }
    },
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (e) => setErr(errMessage(e, t('genericError'))),
  });

  const title =
    modal.kind === 'category-new'
      ? t('catAdmin.modalAddCategory')
      : modal.kind === 'category-edit'
        ? t('catAdmin.modalEditCategory')
        : modal.kind === 'sub-new'
          ? t('catAdmin.modalAddSub', { name: modal.cat.name })
          : t('catAdmin.modalEditSub');

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || name.trim().length < 2}>
            {save.isPending ? t('catAdmin.saving') : t('catAdmin.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label={isSub ? t('catAdmin.subName') : t('catAdmin.catName')}
          placeholder={isSub ? t('catAdmin.phSub') : t('catAdmin.phCat')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Input
          label={t('catAdmin.emojiLabel')}
          placeholder="🍎"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          hint={t('catAdmin.emojiHint')}
        />
        {err && <p className="text-xs text-status-error">{err}</p>}
      </div>
    </Modal>
  );
}
