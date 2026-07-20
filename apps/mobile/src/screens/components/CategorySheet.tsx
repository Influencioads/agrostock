import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ApiCategory } from '@agrotraders/api-client';
import { Row, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';

/**
 * Cascading category picker as a bottom sheet. Replaces the two horizontal
 * chip strips (24 categories, 40+ subcategories) — which were impossible to
 * scan — with a vertical drill-in list: Categories → Subcategories. Every row
 * is full-width and searchable. Selecting applies the filter and closes.
 *
 * The lead attribute ("sub-subcategory") is intentionally left to the existing
 * attribute-facet chips on the Browse screen, so nothing is duplicated here.
 */
export function CategorySheet({
  visible,
  onClose,
  categories,
  category,
  subcategory,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  categories: ApiCategory[];
  category: string;
  subcategory: string;
  /** Commit a selection. Empty strings clear that level. */
  onSelect: (next: { category: string; subcategory: string }) => void;
}) {
  const { t } = useI18n();
  // Which category is being drilled into (null = show the category list).
  const [drill, setDrill] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const drillCat = categories.find((c) => c.name === drill);
  const subs = drillCat?.subcategories ?? [];

  const filteredCats = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(needle));
  }, [categories, q]);
  const filteredSubs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return subs;
    return subs.filter((s) => s.name.toLowerCase().includes(needle));
  }, [subs, q]);

  // Reset transient state so each open starts clean.
  const close = () => {
    setDrill(null);
    setQ('');
    onClose();
  };
  const openCategory = (c: ApiCategory) => {
    if (c.subcategories && c.subcategories.length > 0) {
      setDrill(c.name);
      setQ('');
    } else {
      // Leaf category — no children, so select it directly.
      onSelect({ category: c.name, subcategory: '' });
      close();
    }
  };
  const back = () => {
    setDrill(null);
    setQ('');
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
            <Txt variant="h3" style={{ flexShrink: 1 }}>
              {drill ?? t('pubX.browse.category')}
            </Txt>
          </Row>
          <Pressable onPress={close} hitSlop={10}>
            <Ionicons name="close" size={22} color={C.inkSoft} />
          </Pressable>
        </Row>

        {/* search within the current level */}
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
            <Pressable
              onPress={() => { onSelect({ category: '', subcategory: '' }); close(); }}
              style={rowStyle}
            >
              <Ionicons name="apps-outline" size={20} color={C.green} />
              <Txt style={{ flex: 1, fontWeight: category === '' ? '800' : '600', color: category === '' ? C.green : C.ink }}>
                {t('pubX.browse.allCategories')}
              </Txt>
              {category === '' && <Ionicons name="checkmark" size={20} color={C.green} />}
            </Pressable>
          ) : (
            <Pressable
              onPress={() => { onSelect({ category: drill, subcategory: '' }); close(); }}
              style={rowStyle}
            >
              <Ionicons name="pricetags-outline" size={20} color={C.green} />
              <Txt style={{ flex: 1, fontWeight: subcategory === '' ? '800' : '600', color: subcategory === '' ? C.green : C.ink }}>
                {t('pubX.browse.allOf')} {drill}
              </Txt>
              {category === drill && subcategory === '' && <Ionicons name="checkmark" size={20} color={C.green} />}
            </Pressable>
          )}

          {/* level 1: categories */}
          {!drill &&
            filteredCats.map((c) => {
              const active = c.name === category;
              return (
                <Pressable key={c.id} onPress={() => openCategory(c)} style={rowStyle}>
                  <Txt style={{ fontSize: 18 }}>{c.emoji ?? '📦'}</Txt>
                  <Txt style={{ flex: 1, fontWeight: active ? '800' : '600', color: active ? C.green : C.ink }}>
                    {c.name}
                  </Txt>
                  {active && subcategory === '' && <Ionicons name="checkmark" size={20} color={C.green} />}
                  <Ionicons name="chevron-forward" size={18} color={C.inkSoft} />
                </Pressable>
              );
            })}

          {/* level 2: subcategories of the drilled category */}
          {drill &&
            filteredSubs.map((s) => {
              const active = category === drill && subcategory === s.name;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => { onSelect({ category: drill, subcategory: s.name }); close(); }}
                  style={rowStyle}
                >
                  {s.emoji ? <Txt style={{ fontSize: 16 }}>{s.emoji}</Txt> : null}
                  <Txt style={{ flex: 1, fontWeight: active ? '800' : '600', color: active ? C.green : C.ink }}>
                    {s.name}
                  </Txt>
                  {active && <Ionicons name="checkmark" size={20} color={C.green} />}
                </Pressable>
              );
            })}

          {/* empty search state */}
          {((!drill && filteredCats.length === 0) || (drill && filteredSubs.length === 0)) && (
            <Txt variant="small" color={C.inkSoft} style={{ textAlign: 'center', padding: space.xl }}>
              {t('pubX.browse.noneMatch')}
            </Txt>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
