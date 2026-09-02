import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT_ENV_DIR = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_* to the app, and the root .env is loaded by Nest —
  // never exported to the shell — so `process.env.ADMIN_PORT` here was always
  // undefined and the port silently fell back to 5174. Loading the root
  // .env with an empty prefix gives the CONFIG the plain vars too, so the value
  // in .env is the one that actually takes effect. A real shell export still
  // wins, which is what CI expects.
  const env = { ...loadEnv(mode, ROOT_ENV_DIR, ''), ...process.env };

  return {
    plugins: [react()],
    // Read env from the monorepo-root .env (shared VITE_API_URL / dedicated API port).
    envDir: ROOT_ENV_DIR,
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: Number(env.ADMIN_PORT) || 5174,
      host: true,
      strictPort: true,
    },
    preview: {
      port: Number(env.ADMIN_PORT) || 5174,
    },
  };
});
