import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal } from '@agrotraders/ui';
import {
  buildSubcategoryTree,
  flattenSubcategoryTree,
  type ApiCategory,
  type ApiSubcategory,
  type SubcategoryNode,
} from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';

type CatModal =
  | { kind: 'category-new' }
  | { kind: 'category-edit'; cat: ApiCategory }
  | { kind: 'sub-new'; cat: ApiCategory; parent?: ApiSubcategory }
  | { kind: 'sub-edit'; cat: ApiCategory; sub: ApiSubcategory; siblings: ApiSubcategory[] }
  | null;

export function CategoriesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [modal, setModal] = useState<CatModal>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Depth 1 — just the categories and their level-2 children. Each card pulls its
  // own full subtree when opened, so a five-level taxonomy never loads at once.
  const { data: categories = [], isLoading } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['category-subtree'] });
  };
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const remove = useMutation({
    mutationFn: (cat: ApiCategory) => api.admin.removeCategory(cat.id),
    onSuccess: invalidate,
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });

  return (
    <div>
      <PageHeader
        title={t('page.categories.title')}
        subtitle={t('page.categories.subtitle', {
          categories: categories.length,
          subcategories: categories.reduce((n, c) => n + (c.subcategories?.length ?? 0), 0),
        })}
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
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              open={expanded[cat.id] ?? false}
              onToggle={() => toggle(cat.id)}
              onModal={setModal}
              onDelete={() => {
                if (window.confirm(t('catAdmin.confirmDeleteCat', { name: cat.name }))) remove.mutate(cat);
              }}
            />
          ))}
        </div>
      )}

      {modal && <TaxonomyModal modal={modal} onClose={() => setModal(null)} onSaved={invalidate} />}
    </div>
  );
}

/* ── One category card: lazily loads its subtree, searches and renders it ── */

function CategoryCard({
  cat,
  open,
  onToggle,
  onModal,
  onDelete,
}: {
  cat: ApiCategory;
  open: boolean;
  onToggle: () => void;
  onModal: (m: CatModal) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');

  const { data: subs = [], isLoading } = useQuery<ApiSubcategory[]>({
    queryKey: ['category-subtree', cat.id],
    queryFn: () => api.categories.subtree(cat.id, { depth: 'all' }),
    enabled: open,
    staleTime: 60 * 1000,
  });

  const removeSub = useMutation({
    mutationFn: (sub: ApiSubcategory) => api.admin.removeSubcategory(sub.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['category-subtree', cat.id] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });

  const tree = useMemo(() => buildSubcategoryTree(subs), [subs]);
  const flat = useMemo(() => flattenSubcategoryTree(tree), [tree]);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    return flat.filter(({ node }) => node.name.toLowerCase().includes(needle)).slice(0, 100);
  }, [query, flat]);

  const row = (node: SubcategoryNode, depth: number) => (
    <div
      key={node.id}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink"
      style={{ marginInlineStart: depth ? Math.min(depth, 7) * 18 : undefined }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-surface">
        {node.emoji || <Icon name="grid" size={14} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="break-words font-semibold">{node.name}</div>
        <div className="text-[11px] text-ink-soft">
          {t('catAdmin.nodeStats', { products: node._count?.products ?? 0, children: node.children.length })}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onModal({ kind: 'sub-new', cat, parent: node })}
          leftIcon={<Icon name="plus" size={13} />}
        >
          {t('catAdmin.addChild')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onModal({ kind: 'sub-edit', cat, sub: node, siblings: subs })}>
          {t('catAdmin.edit')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm(t('catAdmin.confirmDeleteSub', { name: node.name }))) removeSub.mutate(node);
          }}
        >
          {t('catAdmin.delete')}
        </Button>
      </div>
    </div>
  );

  const renderSubtree = (node: SubcategoryNode, depth = 0): JSX.Element => (
    <div key={node.id} className="space-y-2">
      {row(node, depth)}
      {node.children.map((child) => renderSubtree(child, depth + 1))}
    </div>
  );

  return (
    <Card padded={false}>
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-brand-surface"
          aria-label={open ? t('catAdmin.collapse') : t('catAdmin.expand')}
        >
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={18} />
        </button>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface text-xl">
          {cat.emoji ?? '📦'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display font-bold text-ink">{cat.name}</div>
          <div className="text-xs text-ink-soft">
            {t('catAdmin.subStats', {
              subs: open ? subs.length : (cat.subcategories?.length ?? 0),
              products: cat._count?.products ?? 0,
            })}
          </div>
        </div>
        <Badge tone="slate">{t('catAdmin.productsCount', { count: cat._count?.products ?? 0 })}</Badge>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onModal({ kind: 'sub-new', cat })}
            leftIcon={<Icon name="plus" size={14} />}
          >
            {t('catAdmin.addSub')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onModal({ kind: 'category-edit', cat })}>
            {t('catAdmin.edit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            {t('catAdmin.delete')}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-surface-border bg-brand-surface/30 px-5 py-3">
          {isLoading ? (
            <p className="text-sm text-ink-soft">{t('common:loading')}</p>
          ) : subs.length === 0 ? (
            <p className="text-sm text-ink-soft">{t('catAdmin.noSubs', { defaultValue: 'No subcategories yet.' })}</p>
          ) : (
            <>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('catAdmin.searchTree', { defaultValue: 'Search this category…' })}
              />
              <div className="mt-3 space-y-2">
                {matches
                  ? matches.length === 0
                    ? <p className="text-sm text-ink-soft">{t('catAdmin.noMatch', { defaultValue: 'Nothing matches.' })}</p>
                    : matches.map(({ node, depth }) => row(node, Math.min(depth, 2)))
                  : tree.map((node) => renderSubtree(node))}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
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
  const [sort, setSort] = useState(
    modal.kind === 'category-edit' ? String(modal.cat.sort ?? 0) : modal.kind === 'sub-edit' ? String(modal.sub.sort ?? 0) : '0',
  );
  const [parentId, setParentId] = useState(modal.kind === 'sub-edit' ? modal.sub.parentId ?? '' : '');
  const [err, setErr] = useState('');

  /**
   * Move targets: every node in the category except the one being moved and its
   * own descendants — the server rejects those as cycles, so don't offer them.
   */
  const moveOptions = useMemo(() => {
    if (modal.kind !== 'sub-edit') return [];
    const tree = buildSubcategoryTree(modal.siblings);
    const banned = new Set<string>([modal.sub.id]);
    const markDescendants = (nodes: SubcategoryNode[], inside: boolean) => {
      for (const node of nodes) {
        const within = inside || node.id === modal.sub.id;
        if (within) banned.add(node.id);
        markDescendants(node.children, within);
      }
    };
    markDescendants(tree, false);
    return flattenSubcategoryTree(tree).filter(({ node }) => !banned.has(node.id));
  }, [modal]);

  const save = useMutation({
    mutationFn: (): Promise<unknown> => {
      const trimmedEmoji = emoji.trim() || undefined;
      const sortValue = Number.isFinite(Number(sort)) ? Number(sort) : 0;
      switch (modal.kind) {
        case 'category-new':
          return api.admin.createCategory({ name: name.trim(), emoji: trimmedEmoji, sort: sortValue });
        case 'category-edit':
          return api.admin.updateCategory(modal.cat.id, { name: name.trim(), emoji: emoji.trim(), sort: sortValue });
        case 'sub-new':
          return api.admin.createSubcategory(modal.cat.id, {
            name: name.trim(),
            emoji: trimmedEmoji,
            sort: sortValue,
            parentId: modal.parent?.id,
          });
        case 'sub-edit':
          return api.admin.updateSubcategory(modal.sub.id, {
            name: name.trim(),
            emoji: emoji.trim(),
            sort: sortValue,
            parentId: parentId || null,
          });
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
          ? t(modal.parent ? 'catAdmin.modalAddChild' : 'catAdmin.modalAddSub', { name: modal.parent?.name ?? modal.cat.name })
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
        <Input
          label={t('catAdmin.sortLabel', { defaultValue: 'Sort order' })}
          type="number"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          hint={t('catAdmin.sortHint', { defaultValue: 'Lower numbers appear first.' })}
        />
        {modal.kind === 'sub-edit' && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              {t('catAdmin.moveLabel', { defaultValue: 'Move under' })}
            </span>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-10 w-full rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink"
            >
              <option value="">
                {t('catAdmin.moveTopLevel', { defaultValue: 'Top level of' })} {modal.cat.name}
              </option>
              {moveOptions.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {`${'  '.repeat(depth)}${node.name}`}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-ink-soft">
              {t('catAdmin.moveHint', { defaultValue: 'Moves this node and everything under it.' })}
            </span>
          </label>
        )}
        {err && <p className="text-xs text-status-error">{err}</p>}
      </div>
    </Modal>
  );
}
