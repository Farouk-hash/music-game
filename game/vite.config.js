// game/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Load env vars from `.env`, `.env.local`, `.env.[mode]`, etc.
  // The third arg '' means: load ALL vars, not just VITE_*-prefixed ones
  // (the prefix filter only applies to the browser bundle).
  const env = loadEnv(mode, process.cwd(), '');

  // Prefer VITE_API_BASE0 (Worker origin, no /game) — the exact value
  // CF_BASE needs. Fall back to a hardcoded URL so the config still
  // works if the env file is missing (e.g. fresh clone before `cp .env.example`).
  const CF_BASE =
    env.VITE_API_BASE0 ;

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    build: {
      chunkSizeWarningLimit: 800,
    },

    server: {
      host: '0.0.0.0',
      port: 5174,
      proxy: {
        '/api/game': {
          target: CF_BASE,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});