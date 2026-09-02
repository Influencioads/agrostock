import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT_ENV_DIR = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_* to the app, and the root .env is loaded by Nest —
  // never exported to the shell — so `process.env.WEB_PORT` here was always
  // undefined and the port silently fell back to 5173. Loading the root
  // .env with an empty prefix gives the CONFIG the plain vars too, so the value
  // in .env is the one that actually takes effect. A real shell export still
  // wins, which is what CI expects.
  const env = { ...loadEnv(mode, ROOT_ENV_DIR, ''), ...process.env };

  return {
    plugins: [react()],
    // Read env (VITE_API_URL, …) from the monorepo-root .env so web + admin share a
    // single source of truth and both follow the dedicated API port.
    envDir: ROOT_ENV_DIR,
    // Force a single React instance across the app and workspace packages
    // (@agrotraders/ui), otherwise pnpm's peer install creates duplicate copies
    // and React throws "Invalid hook call".
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: Number(env.WEB_PORT) || 5173,
      host: true,
      // Fail loudly if 5173 is taken instead of silently moving to another port.
      strictPort: true,
    },
    preview: {
      port: Number(env.WEB_PORT) || 5173,
    },
    test: {
      // `e2e/` is Playwright, which brings its own runner and its own `test`
      // export. Vitest picking those files up fails the unit run on an import it
      // was never meant to resolve — they are driven by `pnpm e2e`.
      exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    },
  };
});
