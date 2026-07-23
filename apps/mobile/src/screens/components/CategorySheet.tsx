import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  attributeSourceName,
  buildSubcategoryTree,
  findSubcategoryPath,
  flattenSubcategoryTree,
  type ApiCategory,
  type ApiSubcategory,
  type SubcategoryNode,
} from '@agrotraders/api-client';
import { Row, Txt } from '../../ui';
import { api } from '../../lib/api';
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
  const [q, setQ] = useState('');

  // One fetch per category, covering every level below it.
  const { data: subs = [], isLoading } = useQuery<ApiSubcategory[]>({
    queryKey: ['category-subtree', drill?.id],
    queryFn: () => api.categories.subtree(drill!.id, { depth: 'all' }),
    enabled: Boolean(drill?.id),
    staleTime: 5 * 60 * 1000,
  });

  const tree = useMemo(() => buildSubcategoryTree(subs), [subs]);
  const current = stack.length ? stack[stack.length - 1] : null;
  const levelNodes = current ? current.children : tree;

  const filteredCats = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(needle));
  }, [categories, q]);

  // Searching inside a category spans every level, not just the one on screen.
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !drill) return null;
    return flattenSubcategoryTree(tree)
      .filter(({ node }) => node.name.toLowerCase().includes(needle))
      .slice(0, 60)
      .map(({ node }) => ({ node, path: findSubcategoryPath(tree, node.id) }));
  }, [q, drill, tree]);

  const reset = () => {
    setDrill(null);
    setStack([]);
    setQ('');
  };
  const close = () => {
    reset();
    onClose();
  };

  const commit = (category: ApiCategory, path: SubcategoryNode[]) => {
    const leaf = path[path.length - 1];
    onSelect({
      categoryId: category.id,
      categoryName: category.name,
      subcategoryId: leaf?.id ?? '',
      subcategoryName: leaf?.name ?? '',
      trail: [category.name, ...path.map((n) => n.name)],
      attrSource: attributeSourceName(path, category.name),
    });
    close();
  };

  const openCategory = (c: ApiCategory) => {
    setDrill(c);
    setStack([]);
    setQ('');
  };

  const back = () => {
    setQ('');
    if (stack.length) setStack((s) => s.slice(0, -1));
    else setDrill(null);
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={close} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '86%' }}>
        {/* header */}
        <Row style={{ justifyContent: 'space-between', padding: space.lg, paddingBottom: space.sm }}>
          <Row gap={10} style={{ flexShrink: 1 }}>
            {drill && (
              <Pressable onPress={back} hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color={C.ink} />
              </Pressable>
            )}
            <Txt variant="h3" style={{ flexShrink: 1 }} numberOfLines={1}>
              {headerTitle}
            </Txt>
          </Row>
          <Pressable onPress={close} hitSlop={10}>
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
                  ›
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
              value={q}
              onChangeText={setQ}
              placeholder={t('pubX.browse.searchInList')}
              placeholderTextColor={C.inkSoft}
              style={{ flex: 1, fontSize: 14, color: C.ink, paddingVertical: 0 }}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
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
                  <Ionicons name="chevron-forward" size={18} color={C.inkSoft} />
                </Pressable>
              );
            })}

          {drill && isLoading && (
            <View style={{ padding: space.xl }}>
              <ActivityIndicator color={C.green} />
            </View>
          )}

          {/* search results across every level of the drilled category */}
          {drill &&
            !isLoading &&
            matches?.map(({ node, path }) => (
              <Pressable key={node.id} onPress={() => commit(drill, path)} style={{ ...rowStyle, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: selection.subcategoryId === node.id ? '800' : '600', color: selection.subcategoryId === node.id ? C.green : C.ink }}>
                    {node.name}
                  </Txt>
                  <Txt variant="small" color={C.inkSoft}>
                    {path.map((n) => n.name).join('  ›  ')}
                  </Txt>
                </View>
              </Pressable>
            ))}

          {/* the level currently in view */}
          {drill &&
            !isLoading &&
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
                  {hasChildren && <Ionicons name="chevron-forward" size={18} color={C.inkSoft} />}
                </Pressable>
              );
            })}

          {/* empty states */}
          {((!drill && filteredCats.length === 0) ||
            (drill && !isLoading && (matches ? matches.length === 0 : levelNodes.length === 0))) && (
            <Txt variant="small" color={C.inkSoft} style={{ textAlign: 'center', padding: space.xl }}>
              {t('pubX.browse.noneMatch')}
            </Txt>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
