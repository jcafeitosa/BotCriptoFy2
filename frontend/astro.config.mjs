// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
// Note: Tailwind CSS v4 is configured via postcss.config.mjs
export default defineConfig({
  // Site URL (for sitemap and canonical URLs)
  site: 'https://app.botcriptofy.com',

  // Base path for deployment
  base: '/',

  // Integrations
  integrations: [
    react(),
  ],

  // Output mode: server (SSR for authentication)
  output: 'server',

  // Adapter for production deployment
  adapter: node({
    mode: 'standalone',
  }),

  // Server configuration (development)
  server: {
    port: 4321,
    host: true, // Expose to network
  },

  // Build configuration
  build: {
    assets: '_astro', // Asset directory name
  },

  // Vite configuration (Optimized for Performance)
  vite: {
    ssr: {
      noExternal: ['framer-motion'],
    },
    define: {
      // Make process.env available
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
    // Build optimizations
    build: {
      // Code splitting strategy
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Framework chunks
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/@astro')) {
              return 'astro-vendor';
            }

            // Chart library (heavy dependency)
            if (id.includes('node_modules/lightweight-charts')) {
              return 'charts-vendor';
            }

            // UI components
            if (id.includes('src/components/ui')) {
              return 'ui-components';
            }

            // Trading/chart components
            if (id.includes('src/components/charts') || id.includes('src/lib/binance')) {
              return 'trading-components';
            }

            // Auth components
            if (id.includes('src/components/auth') || id.includes('src/lib/auth')) {
              return 'auth-components';
            }

            // Other vendor dependencies
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Minification
      minify: 'esbuild',
      // Target modern browsers for better optimization
      target: 'esnext',
    },
    // Development optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'lightweight-charts'],
      exclude: ['@astrojs/react'],
    },
    // Worker support
    worker: {
      format: 'es',
      plugins: [],
    },
  },
});