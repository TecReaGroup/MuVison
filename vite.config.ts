import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Must match [server] in backend/config.toml
const BACKEND_URL = 'http://127.0.0.1:8000'
const proxy = { '/api': BACKEND_URL, '/media': BACKEND_URL }
// Matches --color-canvas so the splash screen and status bar blend into the app
const CANVAS_COLOR = '#f7f6f3'
const GOOGLE_FONT_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
// Oldest images are evicted past this count; covers and creator photos are a few hundred KB at most
const MEDIA_IMAGE_CACHE_MAX_ENTRIES = 2000

const pwa = VitePWA({
  // A plain registration script that never reloads the page: a playing video is left alone
  injectRegister: 'script-defer',
  manifest: {
    id: '/',
    name: 'MuVision',
    short_name: 'MuVision',
    description: 'MuVision — discover videos, albums and creators.',
    lang: 'zh-CN',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: CANVAS_COLOR,
    background_color: CANVAS_COLOR,
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // The new worker takes over at once so the next launch runs the new build. Otherwise it waits until every
    // window is closed, which an installed app on iOS may not do for days.
    // NOTE: the plugin only sets these itself with injectRegister 'auto'
    skipWaiting: true,
    clientsClaim: true,
    globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    navigateFallback: '/index.html',
    // API answers depend on the login session and media streams need HTTP Range: both must always hit the network
    navigateFallbackDenylist: [/^\/api\//, /^\/media\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // Cover and creator photo URLs embed the file version, so a cached image never goes stale. The service worker
        // cache outlives the HTTP cache, which browsers (iOS above all) evict quickly, so large libraries reopen
        // without refetching
        urlPattern: /\/media\/(video\/[^/]+\/[^/]+\/cover|creator\/[^/]+\/[^/]+\/photo)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'media-image',
          expiration: { maxEntries: MEDIA_IMAGE_CACHE_MAX_ENTRIES, purgeOnQuotaError: true },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'google-font-stylesheet' },
      },
      {
        urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-font-file',
          expiration: { maxAgeSeconds: GOOGLE_FONT_CACHE_MAX_AGE_SECONDS },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), pwa],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '0.0.0.0', port: 5005, strictPort: true, proxy },
  preview: { host: '0.0.0.0', port: 5005, strictPort: true, proxy },
})
