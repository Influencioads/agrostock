import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  browseAttrFields,
  resolveAttrFields,
  schemaName,
  buildSubcategoryTree,
  flattenSubcategoryTree,
  type ApiCategory,
  type ApiSubcategory,
  type ProductQuery,
  type SubcategoryNode,
} from '@agrotraders/api-client';
import { QueryError, Row, Txt } from '../../ui';
import { api } from '../../lib/api';
import { backChevron, forwardChevron } from '../../lib/rtl';
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

/**
 * Match a taxon on the label shown AND on its canonical English name.
 *
 * Only 6.5% of subcategory rows carry a Russian translation, so a ru-locale
 * buyer sees a list that is mostly English with a scattering of translated
 * rows. Filtering on the displayed name alone made each row findable in exactly
 * one language — and which language varied row by row — so "seed" hid the
 * translated rows and "семена" hid the untranslated ones. The API's own product
 * search already ORs the base name against its translations; this is the picker
 * catching up.
 */
const hit = (taxon: { name: string; nameEn?: string }, needle: string) =>
  taxon.name.toLowerCase().includes(needle) ||
  (taxon.nameEn ? taxon.nameEn.toLowerCase().includes(needle) : false);

/** A branch with no listings under the current filters stays tappable, just quieter. */
const dim = (n: number | undefined) => (n === 0 ? { opacity: 0.45 } : null);

/** A row's listing count, when the sheet is browsing. */
function Count({ n }: { n: number | undefined }) {
  return n == null ? null : <Txt variant="small" color={C.inkSoft}>{n}</Txt>;
}

export function CategorySheet({
  visible,
  onClose,
  categories,
  categoriesError,
  onRetryCategories,
  selection,
  onSelect,
  browse,
}: {
  visible: boolean;
  onClose: () => void;
  categories: ApiCategory[];
  /** The owner's `/categories` fetch failed. Without this an empty `categories`
   *  array is indistinguishable from an empty catalogue, and the sheet opens
   *  onto "nothing matches" with nothing to tap — the same defect the subtree
   *  fetch had, one level up. */
  categoriesError?: boolean;
  /** Retry that failed `/categories` fetch. */
  onRetryCategories?: () => void;
  selection: CategorySelection;
  /** Commit a selection. `EMPTY_SELECTION` clears everything. */
  onSelect: (next: CategorySelection) => void;
  /**
   * Set when a BUYER is browsing (not a seller classifying a listing), with the
   * rest of their filter query. Rows then show how many listings each branch
   * holds under those filters, dimmed at zero, and the selection carries the
   * browse facets (`browseAttrFields`) instead of every field a seller must fill.
   */
  browse?: { query: ProductQuery };
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

  // Reopening lands inside the category already picked, one tap from its
  // subcategories, rather than back at the top list. The home category chips
  // rely on this: tapping "Nuts" opens straight onto Almond, Cashew, …
  useEffect(() => {
    if (!visible || !selection.categoryId) return;
    const picked = categories.find((c) => c.id === selection.categoryId);
    if (picked) {
      setDrill(picked);
      setStack([]);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // One fetch per category, covering every level below it.
  const { data: subs = [], isFetching, isError, refetch } = useQuery<ApiSubcategory[]>({
    queryKey: ['category-subtree', drill?.id],
    queryFn: () => api.categories.subtree(drill!.id, { depth: 'all' }),
    enabled: Boolean(drill?.id),
    staleTime: 5 * 60 * 1000,
  });

  // Branch counts. The taxonomy is stripped from the query — the counts answer
  // "what would picking THIS node return", and attributes belong to the old
  // node. Level 1 comes from the category facet, the drilled level from the
  // subcategory facet scoped to that category; both are branch-inclusive.
  const countBase = useMemo<ProductQuery | undefined>(
    () => (browse ? { ...browse.query, categoryId: undefined, subcategoryId: undefined, attrs: undefined } : undefined),
    [browse],
  );
  const drillQuery = countBase && drill ? { ...countBase, categoryId: drill.id } : undefined;
  const { data: topFacets } = useQuery({
    queryKey: ['product-facets', countBase],
    queryFn: () => api.products.facets(countBase!),
    enabled: visible && !!countBase,
    staleTime: 30e3,
  });
  const { data: drillFacets } = useQuery({
    queryKey: ['product-facets', drillQuery],
    queryFn: () => api.products.facets(drillQuery!),
    enabled: visible && !!drillQuery,
    staleTime: 30e3,
  });
  const catCounts = useMemo(() => topFacets && new Map(topFacets.categories.map((o) => [o.value, o.count])), [topFacets]);
  const subCounts = useMemo(() => drillFacets && new Map(drillFacets.subcategories.map((o) => [o.value, o.count])), [drillFacets]);
  /** Undefined until counted (or outside browse), so nothing dims on a guess. */
  const countOf = (counts: Map<string, number> | undefined, id: string) => (counts ? (counts.get(id) ?? 0) : undefined);

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
    return categories.filter((c) => hit(c, needle));
  }, [categories, typed]);

  // Searching inside a category spans every level, not just the one on screen.
  // `total` is every hit; `rows` is the slice actually rendered — see MATCH_LIMIT.
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !drill) return null;
    const hits = flat.filter(({ node }) => hit(node, needle));
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
  const catsFailed = !drill && !!categoriesError && categories.length === 0;
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
      attrFields: browse ? browseAttrFields(path, leaf ? leaf.children : tree) : resolveAttrFields(path),
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
    if (typed.length > 0) search('');
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
  // NOT flipped for RTL: U+203A is Bidi_Mirrored, so the text engine already
  // renders it pointing the other way inside an RTL run. Substituting U+2039
  // here would mirror an already-mirrored glyph and point it back the wrong way.
  // The chevron ICONS are a different matter — those are Ionicons glyphs with no
  // bidi behaviour of their own, which is what `rtl.ts` is for.
  const crumbSeparator = '›';
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
            <Pressable onPress={() => { search(''); setStack([]); }}>
              <Txt variant="small" style={{ color: C.green, fontWeight: '700' }}>
                {drill.name}
              </Txt>
            </Pressable>
            {stack.map((node, i) => (
              <Row key={node.id} gap={4}>
                <Txt variant="small" color={C.inkSoft}>
                  {crumbSeparator}
                </Txt>
                <Pressable onPress={() => { search(''); setStack((st) => st.slice(0, i + 1)); }}>
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
          {catsFailed ? null : !drill ? (
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
              <Count n={current ? countOf(subCounts, current.id) : countOf(catCounts, drill.id)} />
              {selection.categoryId === drill.id && selection.subcategoryId === (current?.id ?? '') && (
                <Ionicons name="checkmark" size={20} color={C.green} />
              )}
            </Pressable>
          )}

          {catsFailed && <QueryError onRetry={onRetryCategories} />}

          {/* level 1: categories */}
          {!drill && !catsFailed &&
            filteredCats.map((c) => {
              const active = c.id === selection.categoryId;
              return (
                <Pressable key={c.id} onPress={() => openCategory(c)} style={[rowStyle, dim(countOf(catCounts, c.id))]}>
                  <Txt style={{ fontSize: 18 }}>{c.emoji ?? '📦'}</Txt>
                  <Txt style={{ flex: 1, fontWeight: active ? '800' : '600', color: active ? C.green : C.ink }}>
                    {c.name}
                  </Txt>
                  <Count n={countOf(catCounts, c.id)} />
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
              <Pressable key={node.id} onPress={() => commit(drill, path)} style={[rowStyle, { alignItems: 'flex-start' }, dim(countOf(subCounts, node.id))]}>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: selection.subcategoryId === node.id ? '800' : '600', color: selection.subcategoryId === node.id ? C.green : C.ink }}>
                    {node.name}
                  </Txt>
                  <Txt variant="small" color={C.inkSoft}>
                    {path.map((n) => n.name).join(trailSeparator)}
                  </Txt>
                </View>
                <Count n={countOf(subCounts, node.id)} />
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
                  onPress={() => {
                    // Level rows are still on screen during the debounce window,
                    // so a tap here can land before `q` settles — without this
                    // the pending search would then paint whole-category hits
                    // over the level just opened, header still naming the level.
                    search('');
                    if (hasChildren) setStack((st) => [...st, node]);
                    else commit(drill, [...stack, node]);
                  }}
                  style={[rowStyle, dim(countOf(subCounts, node.id))]}
                >
                  {node.emoji ? <Txt style={{ fontSize: 16 }}>{node.emoji}</Txt> : null}
                  <Txt style={{ flex: 1, fontWeight: active ? '800' : '600', color: active ? C.green : C.ink }}>
                    {node.name}
                  </Txt>
                  <Count n={countOf(subCounts, node.id)} />
                  {active && <Ionicons name="checkmark" size={20} color={C.green} />}
                  {/* A parent drills in; the "All of …" row above selects it outright. */}
                  {hasChildren && <Ionicons name={forwardChevron()} size={18} color={C.inkSoft} />}
                </Pressable>
              );
            })}

          {/* empty states */}
          {((!drill && !catsFailed && filteredCats.length === 0) ||
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
