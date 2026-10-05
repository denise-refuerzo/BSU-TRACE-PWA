import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'app_logo_192.png', 'app_logo_512.png', 'bsu-logo.png'],
      manifest: {
        name: 'BSU-Trace Resource Management',
        short_name: 'BSU-Trace',
        description: 'Analytical Resource Management & Logistics System',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/app_logo_192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/app_logo_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/app_logo_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Increase cache limit to 4MB so split vendor chunks (like lucide-react) are successfully cached offline
        maximumFileSizeToCacheInBytes: 4000000 
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-scanner': ['html5-qrcode', '@yudiel/react-qr-scanner'],
          'vendor-ui': ['lucide-react', 'sweetalert2']
        }
      }
    }
  }
})