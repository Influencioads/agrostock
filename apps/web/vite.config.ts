import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read env (VITE_API_URL, …) from the monorepo-root .env so web + admin share a
  // single source of truth and both follow the dedicated API port.
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  // Force a single React instance across the app and workspace packages
  // (@agrotraders/ui), otherwise pnpm's peer install creates duplicate copies
  // and React throws "Invalid hook call".
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: Number(process.env.WEB_PORT) || 5173,
    host: true,
    // Fail loudly if 5173 is taken instead of silently moving to another port.
    strictPort: true,
  },
  preview: {
    port: Number(process.env.WEB_PORT) || 5173,
  },
});
