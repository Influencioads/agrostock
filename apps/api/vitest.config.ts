import { defineConfig, configDefaults } from 'vitest/config';

// NestJS relies on legacy decorators + reflect-metadata; honour the app tsconfig
// so esbuild transpiles `@Injectable()` etc. correctly during tests.
export default defineConfig({
  esbuild: { target: 'es2021' },
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    // Integration specs boot the whole Nest app and need a live seeded Postgres
    // + @nestjs/testing; they run via `pnpm test:integration`, not the unit run.
    exclude: [...configDefaults.exclude, 'test/**/*.integration.spec.ts'],
    setupFiles: ['reflect-metadata'],
    globals: true,
  },
});
