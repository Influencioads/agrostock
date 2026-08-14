import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input } from '@agrotraders/ui';
import type { ApiServiceNode, ApiServiceNodeKind } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useI18n } from '../i18n';

/**
 * Service taxonomy manager — the ~600-node tree behind the Services module.
 *
 * Two rules the UI has to make obvious, because breaking either is silent:
 *  - Only a leaf (`SERVICE`) can be priced by a provider. Everything else is
 *    navigation, so the kind is shown on every row.
 *  - Nothing is ever deleted. Retiring hides a node and its subtree; a provider
 *    who already priced a retired leaf keeps their row, and restoring brings it
 *    straight back. The API has no delete endpoint at all.
 */

/** Which kinds may sit under a given parent — mirrors the server's rule. */
function childKinds(parent: ApiServiceNode | null): ApiServiceNodeKind[] {
  if (!parent) return ['SECTION'];
  if (parent.kind === 'SECTION') return ['GROUP'];
  if (parent.kind === 'GROUP') return ['COUNTRY', 'SUBGROUP', 'SERVICE'];
  if (parent.kind === 'SERVICE') return [];
  return ['SERVICE'];
}

function Row({
  node, depth, filter, onChanged,
}: {
  node: ApiServiceNode;
  depth: number;
  filter: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(depth < 1);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const [nameEn, setNameEn] = useState(node.nameEn);
  const [nameRu, setNameRu] = useState('');
  const [childName, setChildName] = useState('');
  const [childKind, setChildKind] = useState<ApiServiceNodeKind>(childKinds(node)[0] ?? 'SERVICE');

  const fail = (e: unknown) => setErr(errMessage(e, t('genericError')));
  const save = useMutation({
    mutationFn: () => api.admin.updateServiceNode(node.id, { nameEn, ...(nameRu ? { nameRu } : {}) }),
    onSuccess: () => { setEditing(false); setNameRu(''); onChanged(); },
    onError: fail,
  });
  const toggleActive = useMutation({
    mutationFn: () => api.admin.setServiceNodeActive(node.id, !node.isActive),
    onSuccess: onChanged,
    onError: fail,
  });
  const addChild = useMutation({
    mutationFn: () => api.admin.createServiceNode({ nameEn: childName, kind: childKind, parentId: node.id }),
    onSuccess: () => { setAdding(false); setChildName(''); onChanged(); },
    onError: fail,
  });

  // A filter has to reveal matches buried several levels down, so a node stays
  // visible when anything in its subtree matches — and auto-expands to show it.
  const matches = useMemo(() => {
    if (!filter) return true;
    const needle = filter.toLowerCase();
    const hit = (n: ApiServiceNode): boolean =>
      n.nameEn.toLowerCase().includes(needle) || n.slug.includes(needle) || (n.children ?? []).some(hit);
    return hit(node);
  }, [filter, node]);
  if (!matches) return null;

  const expanded = filter ? true : open;
  const allowed = childKinds(node);
  const retired = !node.isActive;

  return (
    <div>
      <div
        className={'flex items-center gap-2 border-b border-surface-border py-1.5 pe-2 ' + (retired ? 'opacity-50' : '')}
        style={{ paddingInlineStart: `${depth * 18 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={'shrink-0 text-ink-soft ' + ((node.children ?? []).length ? '' : 'invisible')}
          aria-label={t('svcTax.toggle')}
        >
          <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} />
        </button>

        {editing ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={t('svcTax.nameEn')} />
            <Input value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder={t('svcTax.nameRu')} />
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>{t('svcTax.save')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('svcTax.cancel')}</Button>
          </div>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{node.nameEn}</span>
            {/* The locale label, when it differs — so a gap in the RU pass is visible. */}
            {node.name !== node.nameEn && <span className="shrink-0 truncate text-xs text-ink-soft">{node.name}</span>}
            <Badge tone={node.kind === 'SERVICE' ? 'green' : 'slate'}>{node.kind}</Badge>
            {node.countryScope && <Badge tone="info">{node.countryScope}</Badge>}
            {retired && <Badge tone="warn">{t('svcTax.retired')}</Badge>}
            <span className="shrink-0 text-[11px] text-ink-soft">{(node.children ?? []).length || ''}</span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>{t('svcTax.edit')}</Button>
            {allowed.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>{t('svcTax.addChild')}</Button>
            )}
            <Button size="sm" variant="ghost" disabled={toggleActive.isPending} onClick={() => toggleActive.mutate()}>
              {retired ? t('svcTax.restore') : t('svcTax.retire')}
            </Button>
          </>
        )}
      </div>

      {err && <p className="px-3 py-1 text-xs text-status-error">{err}</p>}

      {adding && (
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-muted px-3 py-2"
             style={{ paddingInlineStart: `${depth * 18 + 28}px` }}>
          <Input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder={t('svcTax.nameEn')} />
          <select
            value={childKind}
            onChange={(e) => setChildKind(e.target.value as ApiServiceNodeKind)}
            aria-label={t('svcTax.kind')}
            className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
          >
            {allowed.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <Button size="sm" disabled={!childName.trim() || addChild.isPending} onClick={() => addChild.mutate()}>
            {t('svcTax.add')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>{t('svcTax.cancel')}</Button>
        </div>
      )}

      {expanded && (node.children ?? []).map((child) => (
        <Row key={child.id} node={child} depth={depth + 1} filter={filter} onChanged={onChanged} />
      ))}
    </div>
  );
}

export function ServiceTaxonomyPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const { data: tree = [], isLoading } = useQuery<ApiServiceNode[]>({
    queryKey: ['admin-service-taxonomy'],
    queryFn: () => api.admin.serviceTaxonomy(),
    retry: 1,
  });
  const onChanged = () => void qc.invalidateQueries({ queryKey: ['admin-service-taxonomy'] });

  const census = useMemo(() => {
    let nodes = 0;
    let leaves = 0;
    const walk = (n: ApiServiceNode) => {
      nodes += 1;
      if (n.kind === 'SERVICE') leaves += 1;
      (n.children ?? []).forEach(walk);
    };
    tree.forEach(walk);
    return { nodes, leaves };
  }, [tree]);

  return (
    <div>
      <PageHeader
        title={t('svcTax.title')}
        subtitle={t('svcTax.sub')}
        action={<Badge tone="green">{t('svcTax.census', { nodes: census.nodes, leaves: census.leaves })}</Badge>}
      />
      <Card className="mb-3">
        <label className="flex items-center gap-2 rounded-md border border-surface-border px-2.5">
          <Icon name="search" size={15} className="shrink-0 text-ink-soft" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('svcTax.search')}
            aria-label={t('svcTax.search')}
            className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft"
          />
        </label>
        <p className="mt-2 text-xs text-ink-soft">{t('svcTax.note')}</p>
      </Card>

      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : tree.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">{t('svcTax.empty')}</Card>
      ) : (
        <Card padded={false}>
          {tree.map((node) => <Row key={node.id} node={node} depth={0} filter={filter} onChanged={onChanged} />)}
        </Card>
      )}
    </div>
  );
}
