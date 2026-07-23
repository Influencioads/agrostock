import { useRef, useState, type ReactNode } from 'react';
import { Dimensions, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { C, radius, space } from '../theme/tokens';

/**
 * Paged banner rail with dot indicators. Pages snap to the viewport width minus
 * the page gutter, so the next banner peeks in at the edge — the cue that tells
 * users the rail is swipeable without needing an arrow.
 */
export function Carousel({ children, height = 150, gutter = space.lg }: {
  children: ReactNode[];
  height?: number;
  gutter?: number;
}) {
  const width = Dimensions.get('window').width - gutter * 2;
  const step = width + space.md;
  const [index, setIndex] = useState(0);
  const last = useRef(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / step);
    if (i !== last.current) {
      last.current = i;
      setIndex(i);
    }
  };

  if (children.length === 0) return null;

  return (
    <View style={{ gap: space.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}
      >
        {children.map((child, i) => (
          <View key={i} style={{ width, height, borderRadius: radius.card, overflow: 'hidden' }}>
            {child}
          </View>
        ))}
      </ScrollView>
      {children.length > 1 ? (
        <View style={s.dots}>
          {children.map((_, i) => (
            <View key={i} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.hairline },
  dotActive: { width: 16, backgroundColor: C.green },
});
