import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { SectionHeader } from '../../ui';

/**
 * Shared chrome for the five role dashboards, so a change to dashboard rhythm
 * lands in one place rather than five.
 */

/**
 * Greeting header — an uppercase workspace eyebrow over a large greeting, with
 * an optional notifications bell, matching the prototype's dashboard top.
 */
export function DashHeader({ name, sub, onBell, right }: { name: string; sub: string; onBell?: () => void; right?: ReactNode }) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={[s.sub, microLabel()]}>{sub}</Text>
        <Text style={s.hello} numberOfLines={1}>{name}</Text>
      </View>
      {right}
      {onBell ? (
        <Pressable onPress={onBell} hitSlop={6} style={s.bell}>
          <Ionicons name="notifications-outline" size={20} color={C.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** A row of KPI cards — icon, big figure, caption — matching the prototype. */
export function StatCards({ items }: {
  items: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; tint?: string }[];
}) {
  return (
    <View style={s.statRow}>
      {items.map((it) => (
        <View key={it.label} style={s.statCard}>
          <Ionicons name={it.icon} size={20} color={it.tint ?? C.green} />
          <Text numberOfLines={1} style={s.statValue}>{it.value}</Text>
          <Text numberOfLines={2} style={s.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** A grid of square quick-action tiles — icon over a label. */
export function QuickGrid({ items }: {
  items: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[];
}) {
  return (
    <View style={s.quickRow}>
      {items.map((it) => (
        <Pressable key={it.label} onPress={it.onPress} style={s.quickCard}>
          <Ionicons name={it.icon} size={22} color={C.green} />
          <Text numberOfLines={1} style={s.quickLabel}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** White content band with an optional section header. */
export function DashSection({ title, action, onAction, children, padded = true }: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <View style={[s.section, { paddingHorizontal: padded ? space.lg : 0 }]}>
      {title ? (
        <View style={padded ? undefined : { paddingHorizontal: space.lg }}>
          <SectionHeader title={title} action={action} onAction={onAction} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: C.page, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  hello: { ...type.h1, fontSize: 26, marginTop: 2 },
  sub: { ...type.micro, color: C.inkMuted },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  section: { backgroundColor: C.white, paddingVertical: space.lg, gap: space.md },

  statRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  statCard: { flex: 1, backgroundColor: C.white, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 14, gap: 6, minHeight: 96 },
  statValue: { ...type.numeric, fontSize: 22, color: C.ink, marginTop: 6 },
  statLabel: { ...type.caption, color: C.inkSoft },

  quickRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  quickCard: { flex: 1, backgroundColor: C.white, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingVertical: 16, alignItems: 'center', gap: 8 },
  quickLabel: { ...type.caption, fontSize: 11.5, color: C.ink, textAlign: 'center' },
});
