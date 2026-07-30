import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal } from '@agrotraders/ui';
import {
  buildSubcategoryTree,
  findSubcategoryPath,
  flattenSubcategoryTree,
  resolveAttrFields,
  type ApiCategory,
  type ApiSubcategory,
  type SubcategoryNode,
} from '@agrotraders/api-client';
import type { AttrField, AttrFieldType } from '@agrotraders/types';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';

type CatModal =
  | { kind: 'category-new' }
  | { kind: 'category-edit'; cat: ApiCategory }
  | { kind: 'sub-new'; cat: ApiCategory; parent?: ApiSubcategory }
  | { kind: 'sub-edit'; cat: ApiCategory; sub: ApiSubcategory; siblings: ApiSubcategory[] }
  | { kind: 'sub-fields'; cat: ApiCategory; sub: ApiSubcategory; inherited: AttrField[] }
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
          // The full subtree, not the level-2 slice the list endpoint returns —
          // otherwise the header claims 424 nodes for a 14k taxonomy.
          subcategories: categories.reduce((n, c) => n + (c._count?.subcategories ?? 0), 0),
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

      {modal?.kind === 'sub-fields' ? (
        <FieldsModal modal={modal} onClose={() => setModal(null)} onSaved={invalidate} />
      ) : (
        modal && <TaxonomyModal modal={modal} onClose={() => setModal(null)} onSaved={invalidate} />
      )}
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

  /** What this node would show if it defined nothing itself — its ancestors' fields. */
  const inheritedFor = (node: SubcategoryNode) => resolveAttrFields(findSubcategoryPath(tree, node.id).slice(0, -1));

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
        {/* Available on EVERY node, not just level 2 — that is what makes
            "attach fields at any depth" real. `n` counts the node's OWN fields;
            a node with none inherits, which the modal spells out. */}
        <Button variant="ghost" size="sm" onClick={() => onModal({ kind: 'sub-fields', cat, sub: node, inherited: inheritedFor(node) })}>
          {node.attrFields?.length
            ? t('catAdmin.fieldsCount', { count: node.attrFields.length })
            : t('catAdmin.fields')}
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
              subs: cat._count?.subcategories ?? subs.length,
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
            <p className="text-sm text-ink-soft">{t('catAdmin.noSubs')}</p>
          ) : (
            <>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('catAdmin.searchTree')}
              />
              <div className="mt-3 space-y-2">
                {matches
                  ? matches.length === 0
                    ? <p className="text-sm text-ink-soft">{t('catAdmin.noMatch')}</p>
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

/* ── Attribute-field editor ───────────────────────────────────────── */

const FIELD_TYPES: AttrFieldType[] = ['select', 'multiselect', 'text', 'number', 'boolean', 'date'];

/** Suggest a storage key from the label, so an admin never has to invent one. */
const keyFromLabel = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^([0-9])/, 'f$1').slice(0, 60);

const blankField = (): AttrField => ({ key: '', label: '', type: 'select', options: [] });

/**
 * Edit the attribute fields a subcategory shows on the "Add product" form and
 * in the buyer facets. Whole-array save: the order here IS the display order.
 *
 * Deliberately plain — text inputs, a type dropdown, one option per line, and
 * up/down buttons. A drag-and-drop chip editor would be a lot of machinery for
 * a screen an admin opens a few times a year.
 */
function FieldsModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: Extract<NonNullable<CatModal>, { kind: 'sub-fields' }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [fields, setFields] = useState<AttrField[]>(() =>
    (modal.sub.attrFields ?? []).map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
  );
  const [err, setErr] = useState('');

  const patch = (i: number, next: Partial<AttrField>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...next } : f)));
  const move = (i: number, by: number) =>
    setFields((fs) => {
      const to = i + by;
      if (to < 0 || to >= fs.length) return fs;
      const copy = [...fs];
      [copy[i], copy[to]] = [copy[to], copy[i]];
      return copy;
    });

  const save = useMutation({
    mutationFn: () => api.admin.updateSubcategoryFields(modal.sub.id, fields),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (e) => setErr(errMessage(e, t('genericError'))),
  });

  // Mirrors the server's rules so Save is disabled rather than 400-ing.
  const problem = (() => {
    const keys = new Set<string>();
    for (const [i, f] of fields.entries()) {
      const at = t('catAdmin.fieldAt', { n: i + 1 });
      if (!/^[a-z][a-z0-9_]{0,59}$/.test(f.key)) return t('catAdmin.errKey', { at });
      if (keys.has(f.key)) return t('catAdmin.errDupKey', { at, key: f.key });
      keys.add(f.key);
      if (!f.label.trim()) return t('catAdmin.errLabel', { at });
      if ((f.type === 'select' || f.type === 'multiselect') && !f.options?.length) return t('catAdmin.errOptions', { at });
    }
    return '';
  })();

  return (
    <Modal
      open
      onClose={onClose}
      title={t('catAdmin.fieldsTitle', { name: modal.sub.name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !!problem}>
            {save.isPending ? t('catAdmin.saving') : t('catAdmin.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-ink-soft">{t('catAdmin.fieldsIntro')}</p>
        {fields.length === 0 && modal.inherited.length > 0 && (
          <p className="rounded-md bg-brand-surface px-3 py-2 text-xs text-ink-soft">
            {t('catAdmin.inheritNote', { list: modal.inherited.map((f) => f.label).join(', ') })}
          </p>
        )}

        {fields.map((f, i) => {
          const hasOptions = f.type === 'select' || f.type === 'multiselect';
          return (
            <div key={i} className="space-y-2 rounded-lg border border-surface-border bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-ink-soft">#{i + 1}</span>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </Button>
                <Button variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === fields.length - 1}>
                  ↓
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}>
                  {t('catAdmin.delete')}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  label={t('catAdmin.fieldLabel')}
                  value={f.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    // Only auto-fill the key while it still tracks the label —
                    // once an admin edits it by hand it is a storage key that
                    // products already point at, and must stop moving.
                    const tracking = !f.key || f.key === keyFromLabel(f.label);
                    patch(i, tracking ? { label, key: keyFromLabel(label) } : { label });
                  }}
                />
                <Input
                  label={t('catAdmin.fieldKey')}
                  value={f.key}
                  onChange={(e) => patch(i, { key: e.target.value })}
                  hint={t('catAdmin.fieldKeyHint')}
                />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">{t('catAdmin.fieldType')}</span>
                  <select
                    value={f.type}
                    onChange={(e) => {
                      const type = e.target.value as AttrFieldType;
                      const opts = type === 'select' || type === 'multiselect';
                      patch(i, { type, options: opts ? (f.options ?? []) : undefined });
                    }}
                    className="h-10 w-full rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink"
                  >
                    {FIELD_TYPES.map((ty) => (
                      <option key={ty} value={ty}>
                        {t(`catAdmin.fieldTypes.${ty}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label={t('catAdmin.fieldUnit')}
                  value={f.unit ?? ''}
                  onChange={(e) => patch(i, { unit: e.target.value })}
                  hint={t('catAdmin.fieldUnitHint')}
                />
              </div>

              {hasOptions && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">{t('catAdmin.fieldOptions')}</span>
                  <textarea
                    rows={Math.min(10, Math.max(3, (f.options?.length ?? 0) + 1))}
                    value={(f.options ?? []).join('\n')}
                    onChange={(e) => patch(i, { options: e.target.value.split('\n').map((o) => o.trimStart()) })}
                    onBlur={(e) =>
                      patch(i, { options: e.target.value.split('\n').map((o) => o.trim()).filter(Boolean) })
                    }
                    className="w-full rounded-md border border-surface-border bg-white px-2.5 py-2 font-mono text-xs text-ink"
                  />
                  <span className="mt-1 block text-[11px] text-ink-soft">{t('catAdmin.fieldOptionsHint')}</span>
                </label>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  label={t('catAdmin.fieldHelp')}
                  value={f.help ?? ''}
                  onChange={(e) => patch(i, { help: e.target.value })}
                />
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={!!f.required}
                    onChange={(e) => patch(i, { required: e.target.checked })}
                    className="h-4 w-4"
                  />
                  {t('catAdmin.fieldRequired')}
                </label>
              </div>
            </div>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFields((fs) => [...fs, blankField()])}
          leftIcon={<Icon name="plus" size={13} />}
          disabled={fields.length >= 40}
        >
          {t('catAdmin.addField')}
        </Button>

        <p className="text-[11px] text-ink-soft">{t('catAdmin.renameWarning')}</p>
        {(problem || err) && <p className="text-xs text-status-error">{problem || err}</p>}
      </div>
    </Modal>
  );
}

/* ── Create/edit modal for both categories and subcategories ──────── */

function TaxonomyModal({
  modal,
  onClose,
  onSaved,
}: {
  // Everything except `sub-fields`, which has its own modal — stated in the type
  // so the save `switch` below stays provably exhaustive.
  modal: Exclude<NonNullable<CatModal>, { kind: 'sub-fields' }>;
  onClose: () => void;
  onSaved: () => void;
}) {
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
          label={t('catAdmin.sortLabel')}
          type="number"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          hint={t('catAdmin.sortHint')}
        />
        {modal.kind === 'sub-edit' && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              {t('catAdmin.moveLabel')}
            </span>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-10 w-full rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink"
            >
              <option value="">
                {t('catAdmin.moveTopLevel')} {modal.cat.name}
              </option>
              {moveOptions.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {`${'  '.repeat(depth)}${node.name}`}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-ink-soft">
              {t('catAdmin.moveHint')}
            </span>
          </label>
        )}
        {err && <p className="text-xs text-status-error">{err}</p>}
      </div>
    </Modal>
  );
}
