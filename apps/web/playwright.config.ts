import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end suite.
 *
 * Runs against an ALREADY-RUNNING local stack (api on 3100, web on 5173) rather
 * than starting its own: the API needs Postgres, Redis and MinIO up, and a
 * webServer block that boots half of that is slower and lies about failures.
 * Start the stack with `pnpm dev:up` first.
 *
 * Serial by default — several specs sign in as the same seeded demo accounts and
 * mutate their data, so parallel workers would race each other.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    // 127.0.0.1, not localhost: the API resolves ::1 first on this box and
    // stalls (see the wslrelay note in the repo docs).
    extraHTTPHeaders: { 'Accept-Language': 'en' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
