import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, cardShadow, radius, space } from '../theme/tokens';
import type { Tone } from '../lib/format';
import { useI18n } from '../i18n';
import { AnimatedNumber, AnimatedProgress, PressableScale, Reveal, Stagger, MotiView, useReduceMotion } from './motion';

export {
  AnimatedNumber,
  AnimatedProgress,
  PressableScale,
  Reveal,
  Stagger,
  MotiView,
  useReduceMotion,
} from './motion';

/* ── Text ─────────────────────────────────────────────────────────── */
type TxtVariant = 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'small' | 'muted' | 'label';
export function Txt({
  children, variant = 'body', color, style, numberOfLines,
}: { children: ReactNode; variant?: TxtVariant; color?: string; style?: object; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[txt[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

const txt = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: C.ink },
  h2: { fontSize: 21, fontWeight: '800', color: C.ink },
  h3: { fontSize: 17, fontWeight: '700', color: C.ink },
  title: { fontSize: 15, fontWeight: '700', color: C.ink },
  body: { fontSize: 14, color: C.ink },
  small: { fontSize: 12, color: C.ink },
  muted: { fontSize: 12, color: C.inkSoft },
  label: { fontSize: 13, fontWeight: '600', color: C.ink },
});

/* ── Screen ───────────────────────────────────────────────────────── */
export function Screen({
  children, scroll = true, padded = true, edges, animate = true,
}: { children: ReactNode; scroll?: boolean; padded?: boolean; edges?: ('top' | 'bottom')[]; animate?: boolean }) {
  const pad = padded ? { padding: space.lg } : undefined;
  const gap = padded ? { gap: space.lg } : undefined;
  // In scroll mode we stagger the top-level children in on mount for a lively entrance.
  const body =
    scroll && animate ? <Stagger style={gap}>{children}</Stagger> : <View style={[gap]}>{children}</View>;
  // Every Screen renders under a navigator header, which already sits below the status
  // bar. Insets aren't rebased for the header, so defaulting to a 'top' edge here would
  // re-apply the status-bar inset and leave an empty band under the header. Headerless
  // screens (headerShown: false) must opt in with edges={['top']}.
  return (
    <SafeAreaView style={s.screen} edges={edges ?? []}>
      {scroll ? (
        <ScrollView contentContainerStyle={[{ paddingBottom: 32 }, pad]} showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, gap]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/* ── Card ─────────────────────────────────────────────────────────── */
export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[s.card, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

/* ── Button ───────────────────────────────────────────────────────── */
type BtnVariant = 'primary' | 'outline' | 'ghost' | 'accent' | 'danger';
export function Button({
  title, onPress, variant = 'primary', size = 'md', icon, disabled, loading, full,
}: {
  title: string; onPress?: () => void; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; loading?: boolean; full?: boolean;
}) {
  const v = btnVariants[variant];
  const h = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const reduce = useReduceMotion();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={full ? { alignSelf: 'stretch' } : undefined}
    >
      <MotiView
        animate={{ scale: reduce || disabled ? 1 : pressed ? 0.96 : 1 }}
        transition={{ type: 'timing', duration: 100 }}
        style={[
          s.btn,
          { height: h, backgroundColor: v.bg, borderColor: v.border ?? v.bg, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            {icon && <Ionicons name={icon} size={size === 'sm' ? 15 : 17} color={v.fg} />}
            <Text numberOfLines={1} style={{ color: v.fg, fontWeight: '700', fontSize: size === 'sm' ? 13 : 15, flexShrink: 1 }}>{title}</Text>
          </View>
        )}
      </MotiView>
    </Pressable>
  );
}

const btnVariants: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: C.green, fg: C.white },
  outline: { bg: C.white, fg: C.ink, border: C.border },
  ghost: { bg: 'transparent', fg: C.inkSoft },
  accent: { bg: C.mango, fg: C.evergreen },
  danger: { bg: C.error, fg: C.white },
};

/* ── Badge ────────────────────────────────────────────────────────── */
const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  green: { bg: C.surface, fg: C.dark },
  gold: { bg: C.mangoSoft, fg: C.gold },
  mango: { bg: C.mangoSoft, fg: C.orange },
  warn: { bg: '#FBF3E2', fg: C.warning },
  error: { bg: '#FBE9E6', fg: C.error },
  info: { bg: '#E6F0F4', fg: C.info },
  slate: { bg: '#F0EFEA', fg: C.inkSoft },
};
export function Badge({ label, tone = 'green' }: { label: string; tone?: Tone }) {
  const t = toneStyles[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

/* ── Chip (selectable) ────────────────────────────────────────────── */
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, { backgroundColor: active ? C.green : C.white, borderColor: active ? C.green : C.border }]}
    >
      <Text style={{ color: active ? C.white : C.ink, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/* ── ChipSelect (single-choice, horizontal) ───────────────────────── */
export function ChipSelect({
  label, options, value, onChange,
}: {
  label?: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={txt.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((o) => (
          <Chip key={o.id} label={o.label} active={o.id === value} onPress={() => onChange(o.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

/* ── Stat (KPI card) ──────────────────────────────────────────────── */
export function Stat({
  icon, value, label, delta, deltaUp = true, animateTo, prefix, suffix, decimals,
}: {
  icon: keyof typeof Ionicons.glyphMap; value: string; label: string; delta?: string; deltaUp?: boolean;
  /** when provided, the value counts up to this number on mount */
  animateTo?: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const valueStyle = { fontSize: 22, fontWeight: '800' as const, color: C.ink, marginTop: 8 };
  return (
    <View style={[s.card, s.stat]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={s.statIcon}><Ionicons name={icon} size={17} color={C.dark} /></View>
        {delta ? <Text style={{ fontSize: 11, fontWeight: '800', color: deltaUp ? C.success : C.error }}>{delta}</Text> : null}
      </View>
      {typeof animateTo === 'number' ? (
        <AnimatedNumber
          value={animateTo}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          render={(txtVal) => <Text style={valueStyle}>{txtVal}</Text>}
        />
      ) : (
        <Text style={valueStyle}>{value}</Text>
      )}
      <Text numberOfLines={2} style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/* ── Input ────────────────────────────────────────────────────────── */
export function Input({ label, error, style, ...rest }: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={txt.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.inkSoft}
        style={[s.input, error ? { borderColor: C.error } : null, style]}
        {...rest}
      />
      {error ? <Text style={{ color: C.error, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

/* ── SearchBar ────────────────────────────────────────────────────── */
export function SearchBar({ value, onChangeText, placeholder, onSubmit }: {
  value?: string; onChangeText?: (t: string) => void; placeholder?: string; onSubmit?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={s.search}>
      <Ionicons name="search" size={17} color={C.inkSoft} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder ?? t('common:search')}
        placeholderTextColor={C.inkSoft}
        style={{ flex: 1, fontSize: 14, color: C.ink, paddingVertical: 0 }}
        returnKeyType="search"
      />
    </View>
  );
}

/* ── Avatar ───────────────────────────────────────────────────────── */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: C.dark, fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

/* ── ProgressBar ──────────────────────────────────────────────────── */
export function ProgressBar({ pct, color = C.green, height = 6 }: { pct: number; color?: string; height?: number }) {
  return <AnimatedProgress pct={pct} color={color} trackColor={C.border} height={height} />;
}

/* ── RatingStars ──────────────────────────────────────────────────── */
export function RatingStars({ n, size = 13, onChange }: { n: number; size?: number; onChange?: (n: number) => void }) {
  // Interactive mode: each star is a Pressable that sets the rating to its index.
  if (onChange) {
    return (
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Pressable key={i} onPress={() => onChange(i + 1)} hitSlop={6}>
            <Ionicons name="star" size={size} color={i < n ? C.mangoDeep : C.border} />
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ionicons key={i} name="star" size={size} color={i < n ? C.mangoDeep : C.border} />
      ))}
    </View>
  );
}

/* ── SegmentedControl ─────────────────────────────────────────────── */
export function Segmented({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <View style={s.segment}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[s.segItem, active && { backgroundColor: C.evergreen }]}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ color: active ? C.white : C.inkSoft, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── SectionHeader ────────────────────────────────────────────────── */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={txt.h3}>{title}</Text>
      {action ? <Pressable onPress={onAction}><Text style={{ color: C.green, fontWeight: '700', fontSize: 13 }}>{action}</Text></Pressable> : null}
    </View>
  );
}

/* ── ListRow ──────────────────────────────────────────────────────── */
export function ListRow({ children, onPress, last }: { children: ReactNode; onPress?: () => void; last?: boolean }) {
  const body = <View style={[s.row, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>{children}</View>;
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>{body}</Pressable>;
  return body;
}

/* ── EmptyState ───────────────────────────────────────────────────── */
export function EmptyState({ icon = 'cube-outline', title, body }: { icon?: keyof typeof Ionicons.glyphMap; title: string; body?: string }) {
  return (
    <Reveal>
      <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
        <View style={s.emptyIcon}><Ionicons name={icon} size={26} color={C.dark} /></View>
        <Text style={[txt.h3, { marginTop: 12 }]}>{title}</Text>
        {body ? <Text style={[txt.muted, { marginTop: 4, textAlign: 'center', maxWidth: 280 }]}>{body}</Text> : null}
      </View>
    </Reveal>
  );
}

/* ── Loading ──────────────────────────────────────────────────────── */
export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={C.green} />
      {label ? <Text style={txt.muted}>{label}</Text> : null}
    </View>
  );
}

/* ── Row helper ───────────────────────────────────────────────────── */
export function Row({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.white, borderRadius: radius.lg, borderWidth: 1, borderColor: C.border, padding: space.lg, ...cardShadow },
  stat: { flex: 1, minWidth: 150 },
  statIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  btn: { borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  badge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  chip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  input: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, paddingHorizontal: 14, fontSize: 14, color: C.ink },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: radius.pill, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, height: 44 },
  avatar: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  track: { width: '100%', backgroundColor: C.border, overflow: 'hidden' },
  segment: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: radius.md, padding: 3, gap: 3 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radius.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
});
