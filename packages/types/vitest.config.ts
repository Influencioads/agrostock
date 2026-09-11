import { defineConfig } from 'vitest/config';

/**
 * Scoped to this package's own sources.
 *
 * Without an `include`, vitest falls back to its default glob and walks the whole
 * workspace from here — which is why running it by hand spent ten minutes in
 * "transform" and then collected nothing. The tests in this package had no `test`
 * script at all, so they never ran in `pnpm test` or in CI: shared role, plan,
 * attribute, unit and locale logic that was tested on paper only.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
