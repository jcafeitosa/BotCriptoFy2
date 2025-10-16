// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
// Note: Tailwind CSS v4 is configured via postcss.config.mjs
// The @astrojs/tailwind integration is not compatible with v4
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
  // Use SSR for server-side authentication
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

  // Vite configuration
  vite: {
    ssr: {
      noExternal: ['framer-motion'],
    },
    define: {
      // Make process.env available
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
  },
});
