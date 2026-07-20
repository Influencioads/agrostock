import { Image } from 'react-native';
import { BRAND } from '@agrotraders/types';

const glyph = require('../../assets/brand-mark.png');
const lockup = require('../../assets/brand-logo.png');
const lockupInverse = require('../../assets/brand-logo-light.png');

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
