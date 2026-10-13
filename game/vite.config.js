// game/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cloudflare Worker base — all /api/game/* requests proxy here in dev.
// In production the game will sit behind the same domain or CORS-enabled worker.
const CF_BASE = 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';

export default defineConfig({
  plugins: [react()],
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
    },
  },
});