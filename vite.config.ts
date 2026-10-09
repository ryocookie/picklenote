import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const THEME_COLOR = '#071a12'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

// BUILD_TARGET=pages   → GitHub Pages project site (served under /<repo>/)
// BUILD_TARGET=android → Capacitor native shell (no service worker needed)
const BUILD_TARGET = process.env.BUILD_TARGET
const PAGES_BASE = '/picklenote/'

// https://vite.dev/config/
export default defineConfig({
  base: BUILD_TARGET === 'pages' ? PAGES_BASE : '/',
  plugins: [
    react(),
    VitePWA({
      disable: BUILD_TARGET === 'android',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'PickleNote — ピックルボールのスコアとルール',
        short_name: 'PickleNote',
        description: 'ピックルボールの得点計算とルール一覧',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            // Japanese fonts are split into many unicode-range files; cache only the ones actually used
            // instead of precaching megabytes of glyphs.
            urlPattern: ({ url }) => url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 60, maxAgeSeconds: ONE_YEAR_SECONDS },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
