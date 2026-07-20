/**
 * CJS entry — consumed by the Tailwind preset (require).
 * Data lives in tokens.json so CJS and ESM never drift.
 */
const t = require('./tokens.json');
module.exports = {
  colors: t.colors,
  fontFamily: t.fontFamily,
  radii: t.radii,
  shadows: t.shadows,
};
