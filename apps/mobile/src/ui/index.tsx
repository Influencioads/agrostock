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
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, elevation, font, radius, space, type } from '../theme/tokens';
import { microLabel } from '../theme/casing';
import type { Tone } from '../lib/format';
import { useI18n } from '../i18n';
import { forwardChevron } from '../lib/rtl';
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
export { Skeleton, SkeletonCard, SkeletonGrid, SkeletonRows, SkeletonStats } from './Skeleton';
export { AppBar } from './AppBar';
export { Sheet } from './Sheet';
export { FilterBar } from './FilterBar';
export { Carousel } from './Carousel';
export { Tile } from './Tile';

/* ── Text ─────────────────────────────────────────────────────────── */
type TxtVariant =
  | 'display' | 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'small' | 'muted' | 'label'
  | 'caption' | 'micro' | 'numeric';
export function Txt({
  children, variant = 'body', color, style, numberOfLines,
}: { children: ReactNode; variant?: TxtVariant; color?: string; style?: object; numberOfLines?: number }) {
  // The caps treatment is locale-dependent, so it can't live in the StyleSheet.
  const casing = variant === 'micro' ? microLabel() : null;
  return (
    <Text numberOfLines={numberOfLines} style={[txt[variant], casing, color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

const txt = StyleSheet.create({
  display: { ...type.display, color: C.ink },
  h1: { ...type.h1, color: C.ink },
  h2: { ...type.h2, color: C.ink },
  h3: { ...type.h3, color: C.ink },
  title: { ...type.title, color: C.ink },
  body: { ...type.body, color: C.ink },
  small: { ...type.caption, color: C.ink },
  muted: { ...type.caption, color: C.inkMuted },
  label: { ...type.title, fontSize: 13, color: C.ink },
  caption: { ...type.caption, color: C.inkMuted },
  micro: { ...type.micro, color: C.inkMuted },
  numeric: { ...type.numeric, color: C.ink },
});

/* ── Screen ───────────────────────────────────────────────────────── */
export function Screen({
  children, scroll = true, padded = true, edges, animate = true, edgeToEdge = false, footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
  animate?: boolean;
  /** Drops horizontal padding so grids and rails can bleed to the screen edge. */
  edgeToEdge?: boolean;
  /** Sticky bar pinned below the content, above the tab bar (PDP buy bar, basket total). */
  footer?: ReactNode;
}) {
  const showPad = padded && !edgeToEdge;
  const pad = showPad ? { padding: space.lg } : edgeToEdge ? { paddingVertical: space.lg } : undefined;
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[{ paddingBottom: footer ? 16 : 32 }, pad]}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, gap]}>{children}</View>
      )}
      {/* A sibling of the scroller rather than an absolute overlay, so it never
          covers the last row of content and needs no bottom padding hack. */}
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/* ── Card ─────────────────────────────────────────────────────────── */
type CardVariant = 'flat' | 'raised' | 'inset';
export function Card({ children, style, onPress, variant = 'flat' }: {
  children: ReactNode; style?: ViewStyle; onPress?: () => void; variant?: CardVariant;
}) {
  const v = [s.card, variant === 'raised' && s.cardRaised, variant === 'inset' && s.cardInset, style];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={StyleSheet.flatten(v)}>
        {children}
      </PressableScale>
    );
  }
  return <View style={v}>{children}</View>;
}

/* ── Divider ──────────────────────────────────────────────────────── */
export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.hairline, marginStart: inset }} />;
}

/* ── Button ───────────────────────────────────────────────────────── */
type BtnVariant = 'primary' | 'outline' | 'ghost' | 'accent' | 'danger' | 'primaryOutline';
export function Button({
  title, onPress, variant = 'primary', size = 'md', icon, iconRight, disabled, loading, full,
}: {
  title: string; onPress?: () => void; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  /** Places the icon after the label — used by "Continue →"-style CTAs. */
  iconRight?: boolean;
  disabled?: boolean; loading?: boolean; full?: boolean;
}) {
  const v = btnVariants[variant];
  // The prototype's buttons are tall pills: the primary CTA is 52px, list/sheet
  // actions 44, and the compact inline button 38. The radius is always the
  // half-height, so every size reads as a full pill.
  const h = size === 'sm' ? 38 : size === 'lg' ? 52 : 44;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 15 : 14.5;
  const reduce = useReduceMotion();
  const [pressed, setPressed] = useState(false);
  const glyph = icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} /> : null;
  // F34: the compact 38px pill is below the 44px minimum touch target. Keep the
  // visual height but expand the pressable area with hitSlop so it meets the
  // guideline for motor-impaired users without disturbing the layout.
  const slop = size === 'sm' ? { top: 3, bottom: 3, left: 0, right: 0 } : undefined;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={slop}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      // F34: expose role + state so screen readers announce the button and its
      // disabled/busy status; label it by its title.
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={full ? { alignSelf: 'stretch' } : undefined}
    >
      <MotiView
        animate={{ scale: reduce || disabled ? 1 : pressed ? 0.97 : 1 }}
        transition={{ type: 'timing', duration: 100 }}
        style={[
          s.btn,
          { height: h, borderRadius: h / 2, backgroundColor: v.bg, borderColor: v.border ?? v.bg },
          // Filled brand/accent CTAs carry a soft coloured glow; disabled and
          // outline/ghost buttons stay flat.
          !disabled && v.glow ? v.glow : null,
          disabled ? { opacity: 0.45 } : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            {!iconRight ? glyph : null}
            <Text
              numberOfLines={1}
              style={{ color: v.fg, fontFamily: font.bodyBold, fontSize, flexShrink: 1 }}
            >
              {title}
            </Text>
            {iconRight ? glyph : null}
          </View>
        )}
      </MotiView>
    </Pressable>
  );
}

const btnVariants: Record<BtnVariant, { bg: string; fg: string; border?: string; glow?: object }> = {
  primary: { bg: C.green, fg: C.white, glow: elevation.cta },
  outline: { bg: C.white, fg: C.ink, border: C.border },
  ghost: { bg: 'transparent', fg: C.inkSoft },
  accent: { bg: C.mango, fg: C.white, glow: { ...elevation.cta, shadowColor: C.mango } },
  danger: { bg: C.error, fg: C.white, glow: { ...elevation.cta, shadowColor: C.error } },
  // The secondary half of a split sticky bar — brand-weighted, but not the commit action.
  primaryOutline: { bg: C.white, fg: C.green, border: C.green },
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
      <Text style={{ color: t.fg, ...type.micro, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

/* ── Chip (selectable) ────────────────────────────────────────────── */
export function Chip({ label, active, onPress, count, onClear }: {
  label: string; active?: boolean; onPress?: () => void;
  /** Selection count shown after the label, e.g. "Grade · 2". */
  count?: number;
  /** Renders a dismiss affordance — used by the applied-filter row. */
  onClear?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, { backgroundColor: active ? C.surface : C.white, borderColor: active ? C.green : C.border }]}
    >
      <Text style={{ color: active ? C.dark : C.ink, ...type.title, fontSize: 12.5 }}>
        {label}{count ? ` · ${count}` : ''}
      </Text>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <Ionicons name="close" size={13} color={active ? C.dark : C.inkSoft} />
        </Pressable>
      ) : null}
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

/* ── Stat (KPI) ───────────────────────────────────────────────────── */
export function Stat({
  icon, value, label, delta, deltaUp = true, animateTo, prefix, suffix, decimals,
}: {
  icon: keyof typeof Ionicons.glyphMap; value: string; label: string; delta?: string; deltaUp?: boolean;
  /** when provided, the value counts up to this number on mount */
  animateTo?: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const valueStyle = { ...type.h2, color: C.ink, marginTop: 8 };
  return (
    <View style={[s.card, s.stat]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={s.statIcon}><Ionicons name={icon} size={16} color={C.dark} /></View>
        {delta ? <Text style={{ ...type.micro, color: deltaUp ? C.success : C.error }}>{delta}</Text> : null}
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
      <Text numberOfLines={2} style={{ ...type.caption, color: C.inkMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/* ── StatStrip (dense KPI row) ────────────────────────────────────── */
export function StatStrip({ items }: {
  items: { value: string; label: string; tone?: string; animateTo?: number }[];
}) {
  return (
    <View style={s.statStrip}>
      {items.map((it, i) => (
        <View key={it.label} style={{ flex: 1, flexDirection: 'row' }}>
          {i > 0 ? <View style={s.statStripRule} /> : null}
          <View style={{ flex: 1, paddingHorizontal: space.sm, gap: 3 }}>
            {typeof it.animateTo === 'number' ? (
              <AnimatedNumber
                value={it.animateTo}
                render={(v) => <Text style={{ ...type.h2, color: it.tone ?? C.ink }}>{v}</Text>}
              />
            ) : (
              <Text numberOfLines={1} style={{ ...type.h2, color: it.tone ?? C.ink }}>{it.value}</Text>
            )}
            <Text numberOfLines={2} style={[{ ...type.micro, color: C.inkMuted }, microLabel()]}>{it.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ── KeyValue (spec row) ──────────────────────────────────────────── */
export function KeyValue({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View style={s.kv}>
      <Text style={{ ...type.body, color: C.inkMuted, flexShrink: 1 }}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={{ ...(strong ? type.numeric : type.title), color: C.ink, flexShrink: 1, textAlign: 'right' }}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

/* ── Accordion ────────────────────────────────────────────────────── */
export function Accordion({ title, children, defaultOpen = false, count }: {
  title: string; children: ReactNode; defaultOpen?: boolean; count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} style={s.accordionHead}>
        <Text style={[{ ...type.micro, color: C.ink }, microLabel()]}>
          {title}{count ? ` (${count})` : ''}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={C.inkSoft} />
      </Pressable>
      {open ? <View style={{ paddingBottom: space.lg, gap: space.sm }}>{children}</View> : null}
      <Divider />
    </View>
  );
}

/* ── Input ────────────────────────────────────────────────────────── */
export function Input({
  label, error, style, icon, trailing, secureTextEntry, ...rest
}: TextInputProps & {
  label?: string;
  error?: string;
  /** Leading glyph inside the field — the prototype's phone/lock/mail marks. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Trailing adornment (e.g. a password eye toggle). */
  trailing?: ReactNode;
}) {
  const [showSecureText, setShowSecureText] = useState(false);
  const canToggleSecureText = secureTextEntry === true && !trailing;
  const effectiveTrailing = trailing ?? (canToggleSecureText ? (
    <Pressable
      onPress={() => setShowSecureText((v) => !v)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={showSecureText ? 'Hide password' : 'Show password'}
    >
      <Ionicons name={showSecureText ? 'eye-off-outline' : 'eye-outline'} size={19} color={C.inkMuted} />
    </Pressable>
  ) : null);
  // With an icon or trailing node the field becomes a flex row wrapping the bare
  // TextInput; without either it stays a plain padded input.
  const framed = icon || effectiveTrailing;
  const effectiveSecureTextEntry = canToggleSecureText ? !showSecureText : secureTextEntry;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={txt.label}>{label}</Text> : null}
      {framed ? (
        <View style={[s.inputRow, error ? { borderColor: C.error } : null]}>
          {icon ? <Ionicons name={icon} size={19} color={C.inkMuted} /> : null}
          <TextInput
            placeholderTextColor={C.inkMuted}
            style={[{ flex: 1, ...type.body, fontSize: 15, color: C.ink, paddingVertical: 0 }, style]}
            secureTextEntry={effectiveSecureTextEntry}
            {...rest}
          />
          {effectiveTrailing}
        </View>
      ) : (
        <TextInput
          placeholderTextColor={C.inkMuted}
          style={[s.input, error ? { borderColor: C.error } : null, style]}
          secureTextEntry={effectiveSecureTextEntry}
          {...rest}
        />
      )}
      {error ? <Text style={{ color: C.error, ...type.caption }}>{error}</Text> : null}
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
        placeholderTextColor={C.inkMuted}
        style={{ flex: 1, ...type.body, color: C.ink, paddingVertical: 0 }}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText?.('')} hitSlop={8}>
          <Ionicons name="close-circle" size={17} color={C.inkSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── Avatar ───────────────────────────────────────────────────────── */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: C.dark, fontFamily: type.h3.fontFamily, fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

/* ── ProgressBar ──────────────────────────────────────────────────── */
export function ProgressBar({ pct, color = C.green, height = 6 }: { pct: number; color?: string; height?: number }) {
  return <AnimatedProgress pct={pct} color={color} trackColor={C.hairline} height={height} />;
}

/* ── RatingStars ──────────────────────────────────────────────────── */
export function RatingStars({ n, size = 13, onChange }: { n: number; size?: number; onChange?: (n: number) => void }) {
  // Interactive mode: each star is a Pressable that sets the rating to its index.
  if (onChange) {
    return (
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Pressable key={i} onPress={() => onChange(i + 1)} hitSlop={6}>
            <Ionicons name="star" size={size} color={i < n ? C.mangoDeep : C.hairline} />
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ionicons key={i} name="star" size={size} color={i < n ? C.mangoDeep : C.hairline} />
      ))}
    </View>
  );
}

/* ── RatingPill (compact "4.6 ★ (23)") ────────────────────────────── */
export function RatingPill({ avg, count }: { avg: number; count: number }) {
  return (
    <View style={s.ratingPill}>
      <Text style={{ ...type.micro, color: C.ink, fontSize: 10.5 }}>{avg.toFixed(1)}</Text>
      <Ionicons name="star" size={9} color={C.mangoDeep} />
      <Text style={{ ...type.caption, fontSize: 10, color: C.inkMuted }}>| {count}</Text>
    </View>
  );
}

/* ── SegmentedControl (underline tabs) ────────────────────────────── */
export function Segmented({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <View style={s.segment}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[s.segItem, active && s.segItemActive]}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[
                { ...type.micro, color: active ? C.green : C.inkMuted, textAlign: 'center' },
                microLabel(),
              ]}
            >
              {o.label}
            </Text>
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
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[{ ...type.micro, color: C.green }, microLabel()]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── ListRow ──────────────────────────────────────────────────────── */
export function ListRow({ children, onPress, last, chevron }: {
  children: ReactNode; onPress?: () => void; last?: boolean;
  /** Adds the trailing disclosure chevron (direction-aware). */
  chevron?: boolean;
}) {
  const body = (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline }]}>
      {children}
      {chevron ? <Ionicons name={forwardChevron()} size={17} color={C.inkSoft} /> : null}
    </View>
  );
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}>{body}</Pressable>;
  return body;
}

/* ── EmptyState ───────────────────────────────────────────────────── */
export function EmptyState({ icon = 'cube-outline', title, body, action, onAction }: {
  icon?: keyof typeof Ionicons.glyphMap; title: string; body?: string; action?: string; onAction?: () => void;
}) {
  return (
    <Reveal>
      <View style={{ alignItems: 'center', paddingVertical: 48, gap: 4 }}>
        <View style={s.emptyIcon}><Ionicons name={icon} size={26} color={C.dark} /></View>
        <Text style={[txt.h3, { marginTop: 12 }]}>{title}</Text>
        {body ? <Text style={[txt.muted, { marginTop: 2, textAlign: 'center', maxWidth: 280 }]}>{body}</Text> : null}
        {action ? <View style={{ marginTop: 14 }}><Button title={action} variant="outline" size="sm" onPress={onAction} /></View> : null}
      </View>
    </Reveal>
  );
}

/* ── ErrorState ───────────────────────────────────────────────────── */
/**
 * F28: a request failure is visually distinct from an empty result, and always
 * offers a retry. Screens must render this on `isError` rather than falling
 * through to a spinner or an empty message.
 */
export function ErrorState({ title, body, onRetry, retryLabel }: {
  title: string; body?: string; onRetry?: () => void; retryLabel?: string;
}) {
  return (
    <Reveal>
      <View style={{ alignItems: 'center', paddingVertical: 48, gap: 4 }}>
        <View style={s.emptyIcon}><Ionicons name="cloud-offline-outline" size={26} color={C.dark} /></View>
        <Text style={[txt.h3, { marginTop: 12 }]}>{title}</Text>
        {body ? <Text style={[txt.muted, { marginTop: 2, textAlign: 'center', maxWidth: 280 }]}>{body}</Text> : null}
        {onRetry ? <View style={{ marginTop: 14 }}><Button title={retryLabel ?? 'Retry'} variant="outline" size="sm" onPress={onRetry} /></View> : null}
      </View>
    </Reveal>
  );
}

/**
 * MOB-01: one-line query error state. The generic `title`/`body`/`retry` copy is
 * already translated in the shared `common` catalog, so screens only need to
 * pass their `refetch`. This exists so the sweep across the ~62 fetching screens
 * that used to render a false "empty" on failure is a single import + one line,
 * not a repeated four-prop `<ErrorState>` block.
 */
export function QueryError({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <ErrorState
      title={t('common:errorTitle')}
      body={t('common:errorBody')}
      onRetry={onRetry}
      retryLabel={t('common:retry')}
    />
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
  screen: { flex: 1, backgroundColor: C.page },
  // The prototype's cards are white with a soft 16px corner, a hairline `--bd`
  // outline and a faint drop shadow that lifts them off the green-tinted page.
  // `raised` deepens that shadow; `inset` drops it for nested wells.
  card: { backgroundColor: C.white, borderRadius: radius.card, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, ...elevation.card },
  cardRaised: { ...elevation.card, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  cardInset: { backgroundColor: C.page, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, shadowOpacity: 0, elevation: 0 },
  footer: {
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    ...elevation.low,
  },
  stat: { flex: 1, minWidth: 150 },
  statIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  statStrip: { flexDirection: 'row', backgroundColor: C.white, paddingVertical: space.lg, paddingHorizontal: space.sm },
  statStripRule: { width: StyleSheet.hairlineWidth, backgroundColor: C.hairline, marginVertical: 2 },
  kv: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.lg, paddingVertical: 7 },
  accordionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.lg },
  // Pills: the radius is set per-size on the button itself (half-height); the
  // stylesheet only carries the shared box. Generous padding keeps labels off
  // the rounded ends.
  btn: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.chip, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  input: { height: 50, borderRadius: radius.input, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, paddingHorizontal: 14, ...type.body, fontSize: 15, color: C.ink },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: radius.input, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, paddingHorizontal: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.white, borderRadius: radius.input, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, height: 46 },
  avatar: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.white, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3 },
  segment: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  segItemActive: { borderBottomColor: C.green },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingVertical: 12, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
});

/** Shared text styles for screens that need to compose rather than use `<Txt>`. */
export const textStyles: Record<TxtVariant, TextStyle> = txt;
