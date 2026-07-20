import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';

/* ── Reduce-motion hook ───────────────────────────────────────────── */

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduce(!!v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/* ── Reveal (fade + rise on mount) ────────────────────────────────── */

export interface RevealProps {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /** vertical offset to rise from (px) */
  offset?: number;
}

export function Reveal({ children, delay = 0, style, offset = 12 }: RevealProps) {
  const reduce = useReduceMotion();
  return (
    <MotiView
      style={style}
      from={reduce ? { opacity: 1, translateY: 0 } : { opacity: 0, translateY: offset }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 380, delay }}
    >
      {children}
    </MotiView>
  );
}

/* ── Stagger (delay-indexed children) ─────────────────────────────── */

export interface StaggerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** per-item delay in ms */
  step?: number;
  /** cap the number of animated items (long lists) */
  max?: number;
}

export function Stagger({ children, style, step = 55, max = 12 }: StaggerProps) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={style}>
      {items.map((child, i) => (
        <Reveal key={(child as { key?: string }).key ?? i} delay={Math.min(i, max) * step}>
          {child}
        </Reveal>
      ))}
    </View>
  );
}

/* ── PressableScale (spring press feedback) ───────────────────────── */

export interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
}

export function PressableScale({ children, onPress, onLongPress, style, disabled, scaleTo = 0.97 }: PressableScaleProps) {
  const reduce = useReduceMotion();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <MotiView
        style={style}
        animate={{ scale: reduce ? 1 : pressed ? scaleTo : 1, opacity: disabled ? 0.5 : 1 }}
        transition={{ type: 'timing', duration: 100 }}
      >
        {children}
      </MotiView>
    </Pressable>
  );
}

/* ── AnimatedNumber (count-up) ────────────────────────────────────── */

export interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: boolean;
  /** render function so callers control the <Text> styling */
  render: (formatted: string) => ReactNode;
}

export function AnimatedNumber({ value, duration = 900, decimals = 0, prefix = '', suffix = '', format = true, render }: AnimatedNumberProps) {
  const reduce = useReduceMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const start = Date.now();
    const from = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setDisplay(from + (value - from) * easeOut(t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, reduce, duration]);

  const fixed = display.toFixed(decimals);
  const body = format
    ? Number(fixed).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : fixed;
  return <>{render(`${prefix}${body}${suffix}`)}</>;
}

/* ── AnimatedProgress (animated width bar) ────────────────────────── */

export interface AnimatedProgressProps {
  pct: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function AnimatedProgress({ pct, color = '#249653', trackColor = '#E7EFE9', height = 6 }: AnimatedProgressProps) {
  const reduce = useReduceMotion();
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: trackColor, overflow: 'hidden' }}>
      <MotiView
        from={reduce ? { width: `${clamped}%` } : { width: '0%' }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'timing', duration: 700 }}
        style={{ height: '100%', backgroundColor: color, borderRadius: height }}
      />
    </View>
  );
}

export { MotiView };
