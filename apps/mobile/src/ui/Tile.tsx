import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, radius, type } from '../theme/tokens';

/**
 * Category / service tile: a circular or rounded medallion with a caption under
 * it. Takes an image, an emoji, or an icon — the taxonomy has emoji for every
 * node but only some categories carry artwork.
 */
export function Tile({ label, emoji, imageUrl, icon, tint, size = 62, onPress, shape = 'circle' }: {
  label: string;
  emoji?: string | null;
  imageUrl?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  tint?: string;
  size?: number;
  onPress?: () => void;
  shape?: 'circle' | 'rounded';
}) {
  const r = shape === 'circle' ? size / 2 : radius.card;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width: size + 14, alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[s.medallion, { width: size, height: size, borderRadius: r, backgroundColor: tint ?? C.surface }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : icon ? (
          <Ionicons name={icon} size={size * 0.4} color={C.dark} />
        ) : (
          <Text style={{ fontSize: size * 0.42 }}>{emoji ?? '🌾'}</Text>
        )}
      </View>
      <Text numberOfLines={2} style={s.label}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  medallion: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { ...type.caption, fontSize: 11, color: C.ink, textAlign: 'center' },
});
