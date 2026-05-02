import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip', threshold: 1024 }),
    // Copy TinyMCE runtime assets into dist/tinymce/. The Editor lazy-loads
    // skin CSS, theme/model/plugin JS, and i18n files at runtime via base_url,
    // so they must be reachable as static files (not just bundled into JS).
    // stripBase: 3 strips "node_modules/tinymce/<subdir>" from the matched path
    // so files land at dist/tinymce/<subdir>/... instead of being nested under
    // dist/tinymce/<subdir>/node_modules/tinymce/<subdir>/...
    viteStaticCopy({
      targets: [
        { src: 'node_modules/tinymce/skins/**',   dest: 'tinymce/skins',   rename: { stripBase: 3 } },
        { src: 'node_modules/tinymce/themes/**',  dest: 'tinymce/themes',  rename: { stripBase: 3 } },
        { src: 'node_modules/tinymce/models/**',  dest: 'tinymce/models',  rename: { stripBase: 3 } },
        { src: 'node_modules/tinymce/icons/**',   dest: 'tinymce/icons',   rename: { stripBase: 3 } },
        { src: 'node_modules/tinymce/plugins/**', dest: 'tinymce/plugins', rename: { stripBase: 3 } },
      ],
    }),
    // Source-map upload to Sentry. `disable` makes this a no-op when the auth
    // token isn't present (local dev, or first-time prod build before Railway
    // env vars are set), so the build never fails just because Sentry isn't
    // configured yet. Maps still get *generated* via build.sourcemap below.
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  preview: {
    port: parseInt(process.env.PORT) || 4173,
    host: '0.0.0.0',
    allowedHosts: 'all',
  },
  build: {
    // 'hidden' generates source maps but omits the //# sourceMappingURL
    // comment from the served JS, so end users don't see them in DevTools
    // while Sentry's plugin can still upload + use them server-side.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
