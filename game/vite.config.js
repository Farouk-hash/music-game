// game/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const CF_BASE = env.VITE_API_BASE0;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Music Game',
          short_name: 'MusicGame',
          description: 'The ultimate music quiz game',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        // Phase 1: the service worker only precaches the app shell (JS/CSS/HTML/icons)
        // so the UI opens offline. It caches NO API responses and NO audio.
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [],
        },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    build: { chunkSizeWarningLimit: 800 },
    server: {
      host: '0.0.0.0',
      port: 5174,
      proxy: {
        '/api/game': {
          target: CF_BASE,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  };
});