import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  resolveAttrFields,
  schemaName,
  buildSubcategoryTree,
  flattenSubcategoryTree,
  type ApiCategory,
  type ApiSubcategory,
  type SubcategoryNode,
} from '@agrotraders/api-client';
import { QueryError, Row, Txt } from '../../ui';
import { api } from '../../lib/api';
import { backChevron, forwardChevron, isRTL } from '../../lib/rtl';
import { C, radius, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { EMPTY_SELECTION, type CategorySelection } from './categorySelection';

// Re-exported so existing importers keep resolving these from the sheet.
export { EMPTY_SELECTION, type CategorySelection } from './categorySelection';

/**
 * Cascading category picker as a bottom sheet. Drills an ARBITRARY number of
 * levels — the taxonomy runs five deep — with a back stack, a breadcrumb, and a
 * search that spans the whole category rather than just the level in view.
 *
 * The selection value itself lives in `categorySelection.ts` so non-UI modules
 * can depend on it without importing this component.
 */

const EMPTY = EMPTY_SELECTION;

/**
 * Ceiling on rendered search hits. The taxonomy runs to 14k nodes and this list
 * is not virtualized, so an unbounded result set is a freeze — but the banner
 * ABOVE the rows reports the real total, because silently showing 60 of the 309
 * matches for "seed" reads as a catalogue that is missing half its rows.
 */
const MATCH_LIMIT = 200;

/** Settle delay for the in-category search. See `typed` vs `q` below. */
const SEARCH_DEBOUNCE_MS = 180;

export function CategorySheet({
  visible,
  onClose,
  categories,
  selection,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  categories: ApiCategory[];
  selection: CategorySelection;
  /** Commit a selection. `EMPTY_SELECTION` clears everything. */
  onSelect: (next: CategorySelection) => void;
}) {
  const { t } = useI18n();
  // The category being drilled into (null = show the category list).
  const [drill, setDrill] = useState<ApiCategory | null>(null);
  // Ancestor chain inside the drilled category; the last entry is the level shown.
  const [stack, setStack] = useState<SubcategoryNode[]>([]);
  // `typed` is what the field shows; `q` is the settled term the heavy search
  // runs on. Filtering a category spans every level — up to 1615 nodes — and
  // paints up to MATCH_LIMIT rows into a list that is not virtualized, which
  // stutters on Android if it reruns on every keystroke. The previous result set
  // stays on screen across the gap, so nothing flickers.
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQ(typed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [typed]);

  const search = (next: string) => {
    setTyped(next);
    if (!next) setQ('');
  };

  // One fetch per category, covering every level below it.
  const { data: subs = [], isFetching, isError, refetch } = useQuery<ApiSubcategory[]>({
    queryKey: ['category-subtree', drill?.id],
    queryFn: () => api.categories.subtree(drill!.id, { depth: 'all' }),
    enabled: Boolean(drill?.id),
    staleTime: 5 * 60 * 1000,
  });

  const tree = useMemo(() => buildSubcategoryTree(subs), [subs]);
  const current = stack.length ? stack[stack.length - 1] : null;
  const levelNodes = current ? current.children : tree;

  // Every node paired with its root-first ancestor path, resolved in ONE walk of
  // the tree. Search hits used to call `findSubcategoryPath` per rendered row —
  // a fresh full-tree DFS each time, so 200 rows over a 1615-node category cost
  // ~320k comparisons on every settled keystroke. This is a map lookup instead.
  const flat = useMemo(() => flattenSubcategoryTree(tree), [tree]);
  const pathById = useMemo(() => {
    const map = new Map<string, SubcategoryNode[]>();
    const walk = (nodes: SubcategoryNode[], trail: SubcategoryNode[]) => {
      for (const node of nodes) {
        const next = [...trail, node];
        map.set(node.id, next);
        if (node.children.length) walk(node.children, next);
      }
    };
    walk(tree, []);
    return map;
  }, [tree]);

  const filteredCats = useMemo(() => {
    // The category list is 24 rows, so it filters on the raw keystroke — waiting
    // out the debounce here would only add lag to something already instant.
    const needle = typed.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(needle));
  }, [categories, typed]);

  // Searching inside a category spans every level, not just the one on screen.
  // `total` is every hit; `rows` is the slice actually rendered — see MATCH_LIMIT.
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !drill) return null;
    const hits = flat.filter(({ node }) => node.name.toLowerCase().includes(needle));
    return {
      total: hits.length,
      rows: hits.slice(0, MATCH_LIMIT).map(({ node }) => ({ node, path: pathById.get(node.id) ?? [] })),
    };
  }, [q, drill, flat, pathById]);

  // React Query keeps `data` through a failed refetch, so `isError` alone would
  // paint a hard error over a perfectly good cached tree the moment a background
  // refresh failed. The error and spinner belong only to "there is nothing to
  // show". `isFetching` rather than `isLoading` because after a failure the
  // status is 'error', not 'pending' — so a retry would otherwise spin nothing.
  const nothingLoaded = subs.length === 0;
  const showSpinner = !!drill && isFetching && nothingLoaded;
  const showError = !!drill && !isFetching && isError && nothingLoaded;
  const showRows = !!drill && !showSpinner && !showError;

  const reset = () => {
    setDrill(null);
    setStack([]);
    search('');
  };
  const close = () => {
    reset();
    onClose();
  };

  const commit = (category: ApiCategory, path: SubcategoryNode[]) => {
    const leaf = path[path.length - 1];
    const categoryNameEn = schemaName(category);
    onSelect({
      categoryId: category.id,
      categoryName: category.name,
      categoryNameEn,
      subcategoryId: leaf?.id ?? '',
      subcategoryName: leaf?.name ?? '',
      trail: [category.name, ...path.map((n) => n.name)],
      attrFields: resolveAttrFields(path),
    });
    close();
  };

  const openCategory = (c: ApiCategory) => {
    setDrill(c);
    setStack([]);
    search('');
  };

  /** The header chevron: go up one level, abandoning any search at this level. */
  const back = () => {
    search('');
    if (stack.length) setStack((s) => s.slice(0, -1));
    else setDrill(null);
  };

  /**
   * Android's hardware Back. It used to be wired straight to `close()`, so Back
   * from four levels down threw away the whole drill instead of climbing one
   * step. It now undoes one thing at a time — the search, then a level, then the
   * category list, and only then dismisses. That is deliberately gentler than
   * the header chevron, which is an explicit "up a level" and clears the search
   * on the way. iOS never fires this for a slide-up modal.
   */
  const requestClose = () => {
    if (typed.trim()) search('');
    else if (drill) back();
    else close();
  };

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  };

  const headerTitle = drill ? (current?.name ?? drill.name) : t('pubX.browse.category');
  // Arabic and Persian read right-to-left, so every directional glyph flips.
  const crumbSeparator = isRTL() ? '‹' : '›';
  const trailSeparator = `  ${crumbSeparator}  `;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={requestClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={close} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '86%' }}>
        {/* header */}
        <Row style={{ justifyContent: 'space-between', padding: space.lg, paddingBottom: space.sm }}>
          <Row gap={10} style={{ flexShrink: 1 }}>
            {drill && (
              <Pressable onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common:back')}>
                <Ionicons name={backChevron()} size={22} color={C.ink} />
              </Pressable>
            )}
            <Txt variant="h3" style={{ flexShrink: 1 }} numberOfLines={1}>
              {headerTitle}
            </Txt>
          </Row>
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common:close')}>
            <Ionicons name="close" size={22} color={C.inkSoft} />
          </Pressable>
        </Row>

        {/* breadcrumb — tap any ancestor to jump back to it */}
        {drill && stack.length > 0 && (
          <Row gap={4} style={{ flexWrap: 'wrap', paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            <Pressable onPress={() => setStack([])}>
              <Txt variant="small" style={{ color: C.green, fontWeight: '700' }}>
                {drill.name}
              </Txt>
            </Pressable>
            {stack.map((node, i) => (
              <Row key={node.id} gap={4}>
                <Txt variant="small" color={C.inkSoft}>
                  {crumbSeparator}
                </Txt>
                <Pressable onPress={() => setStack((s) => s.slice(0, i + 1))}>
                  <Txt
                    variant="small"
                    style={{ color: i === stack.length - 1 ? C.ink : C.green, fontWeight: '700' }}
                  >
                    {node.name}
                  </Txt>
                </Pressable>
              </Row>
            ))}
          </Row>
        )}

        {/* search within the current category (or the category list) */}
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingHorizontal: 12, height: 42 }}>
            <Ionicons name="search" size={17} color={C.inkSoft} />
            <TextInput
              value={typed}
              onChangeText={search}
              placeholder={t('pubX.browse.searchInList')}
              placeholderTextColor={C.inkSoft}
              style={{ flex: 1, fontSize: 14, color: C.ink, paddingVertical: 0 }}
            />
            {typed.length > 0 && (
              <Pressable onPress={() => search('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('pubX.filter.clear')}>
                <Ionicons name="close-circle" size={18} color={C.inkSoft} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xl }}>
          {/* "All" reset row — always available at the top of each level */}
          {!drill ? (
            <Pressable onPress={() => { onSelect(EMPTY); close(); }} style={rowStyle}>
              <Ionicons name="apps-outline" size={20} color={C.green} />
              <Txt style={{ flex: 1, fontWeight: selection.categoryId === '' ? '800' : '600', color: selection.categoryId === '' ? C.green : C.ink }}>
                {t('pubX.browse.allCategories')}
              </Txt>
              {selection.categoryId === '' && <Ionicons name="checkmark" size={20} color={C.green} />}
            </Pressable>
          ) : (
            <Pressable onPress={() => commit(drill, stack)} style={rowStyle}>
              <Ionicons name="pricetags-outline" size={20} color={C.green} />
              <Txt style={{ flex: 1, fontWeight: '700' }}>
                {t('pubX.browse.allOf')} {current?.name ?? drill.name}
              </Txt>
              {selection.categoryId === drill.id && selection.subcategoryId === (current?.id ?? '') && (
                <Ionicons name="checkmark" size={20} color={C.green} />
              )}
            </Pressable>
          )}

          {/* level 1: categories */}
          {!drill &&
            filteredCats.map((c) => {
              const active = c.id === selection.categoryId;
              return (
                <Pressable key={c.id} onPress={() => openCategory(c)} style={rowStyle}>
                  <Txt style={{ fontSize: 18 }}>{c.emoji ?? '📦'}</Txt>
                  <Txt style={{ flex: 1, fontWeight: active ? '800' : '600', color: active ? C.green : C.ink }}>
                    {c.name}
                  </Txt>
                  {active && <Ionicons name="checkmark" size={20} color={C.green} />}
                  <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />
                </Pressable>
              );
            })}

          {showSpinner && (
            <View style={{ padding: space.xl }}>
              <ActivityIndicator color={C.green} />
            </View>
          )}

          {/* A failed subtree fetch used to render as "nothing matches", which
              reads as an empty category rather than a network error, and left no
              way back in but closing the sheet. `QueryError` is the house state
              for this (MOB-01), so the copy, the retry affordance and its
              accessibility come for free. */}
          {showError && <QueryError onRetry={() => void refetch()} />}

          {/* The cap has to admit itself ABOVE the rows: below 200 of them it sits
              a couple of dozen screens down and is never read, which would make
              the truncation less visible than the 60-row version it replaced. */}
          {showRows && matches && matches.total > matches.rows.length && (
            <Txt variant="small" color={C.inkSoft} style={{ textAlign: 'center', paddingHorizontal: space.lg, paddingVertical: space.md }}>
              {t('pubX.browse.moreMatches', { shown: matches.rows.length, total: matches.total })}
            </Txt>
          )}

          {/* search results across every level of the drilled category */}
          {showRows &&
            matches?.rows.map(({ node, path }) => (
              <Pressable key={node.id} onPress={() => commit(drill, path)} style={{ ...rowStyle, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: selection.subcategoryId === node.id ? '800' : '600', color: selection.subcategoryId === node.id ? C.green : C.ink }}>
                    {node.name}
                  </Txt>
                  <Txt variant="small" color={C.inkSoft}>
                    {path.map((n) => n.name).join(trailSeparator)}
                  </Txt>
                </View>
              </Pressable>
            ))}

          {/* the level currently in view */}
          {showRows &&
            !matches &&
            levelNodes.map((node) => {
              const active = selection.subcategoryId === node.id;
              const hasChildren = node.children.length > 0;
              return (
                <Pressable
                  key={node.id}
                  onPress={() => (hasChildren ? setStack((s) => [...s, node]) : commit(drill, [...stack, node]))}
                  style={rowStyle}
                >
                  {node.emoji ? <Txt style={{ fontSize: 16 }}>{node.emoji}</Txt> : null}
                  <Txt style={{ flex: 1, fontWeight: active ? '800' : '600', color: active ? C.green : C.ink }}>
                    {node.name}
                  </Txt>
                  {active && <Ionicons name="checkmark" size={20} color={C.green} />}
                  {/* A parent drills in; the "All of …" row above selects it outright. */}
                  {hasChildren && <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />}
                </Pressable>
              );
            })}

          {/* empty states */}
          {((!drill && filteredCats.length === 0) ||
            (showRows && (matches ? matches.total === 0 : levelNodes.length === 0))) && (
            <Txt variant="small" color={C.inkSoft} style={{ textAlign: 'center', padding: space.xl }}>
              {t('pubX.browse.noneMatch')}
            </Txt>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
