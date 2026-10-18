// game/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CF_BASE = 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';

export default defineConfig({
  plugins: [react()],
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
      '/api/profiles': {
        target: CF_BASE,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/profiles/, '/profiles'),
      },
      '/api/follows': {
        target: CF_BASE,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/follows/, '/follows'),
      },
      '/api/invites': {
        target: CF_BASE,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/invites/, '/invites'),
      },
    },
  },
});