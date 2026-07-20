import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read env from the monorepo-root .env (shared VITE_API_URL / dedicated API port).
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: Number(process.env.ADMIN_PORT) || 5174,
    host: true,
    strictPort: true,
  },
  preview: {
    port: Number(process.env.ADMIN_PORT) || 5174,
  },
});
