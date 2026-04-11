import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip', threshold: 1024 }),
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
