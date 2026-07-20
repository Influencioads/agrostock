/**
 * ESM entry — consumed by the apps (import). Explicit named exports so
 * bundlers (Vite/Rollup) resolve them statically.
 */
import t from './tokens.json';

export const colors = t.colors;
export const fontFamily = t.fontFamily;
export const radii = t.radii;
export const shadows = t.shadows;
