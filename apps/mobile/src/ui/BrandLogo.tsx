import { Image, View } from 'react-native';
import { BRAND } from '@agrotraders/types';

const glyph = require('../../assets/brand-mark.png');
const lockup = require('../../assets/brand-logo.png');
const lockupInverse = require('../../assets/brand-logo-light.png');

/**
 * The app-icon tile as it appears on the splash and the login header in the
 * prototype. `assets/brand-mark.png` is already the finished tile — a green
 * rounded square with the white mark on a transparent background — so it is
 * rendered as-is (tinting it would flood the whole tile shape one colour).
 */
export function BrandTile({ size = 64 }: { size?: number; radius?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        shadowColor: '#0B3D2E',
        shadowOpacity: 0.28,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      <Image
        source={glyph}
        accessibilityLabel={BRAND.name}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </View>
  );
}

// width / height of the background-removed wordmark lockup (assets/brand-logo.png)
const LOCKUP_ASPECT = 1621 / 385;

export function BrandLogo({
  size = 40,
  glyphOnly = false,
  inverse = false,
}: {
  size?: number;
  glyphOnly?: boolean;
  inverse?: boolean;
}) {
  if (glyphOnly) {
    return (
      <Image
        source={glyph}
        accessibilityLabel={BRAND.name}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <Image
      source={inverse ? lockupInverse : lockup}
      accessibilityLabel={BRAND.name}
      resizeMode="contain"
      style={{ width: Math.round(size * LOCKUP_ASPECT), height: size }}
    />
  );
}
