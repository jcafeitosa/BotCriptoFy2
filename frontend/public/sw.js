/**
 * @fileoverview Service Worker for BotCriptoFy2
 * @description Offline-first caching strategy for API and static assets
 * @version 1.0.0
 *
 * FEATURES:
 * - ✅ Cache-first strategy for static assets
 * - ✅ Network-first strategy for API calls
 * - ✅ Stale-while-revalidate for images
 * - ✅ Offline fallback support
 * - ✅ Cache versioning and cleanup
 *
 * PERFORMANCE:
 * - Reduces API latency (cache hits)
 * - Enables offline functionality
 * - Improves load times on repeat visits
 */

const CACHE_VERSION = 'v1';
const CACHE_STATIC = `botcriptofy-static-${CACHE_VERSION}`;
const CACHE_API = `botcriptofy-api-${CACHE_VERSION}`;
const CACHE_IMAGES = `botcriptofy-images-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

// ============================================================================
// INSTALL - Cache static assets
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Force activation immediately
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE - Clean up old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (
            cacheName.startsWith('botcriptofy-') &&
            !cacheName.endsWith(CACHE_VERSION)
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

// ============================================================================
// FETCH - Handle network requests
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // ========================================
  // STRATEGY 1: API Calls (Network First)
  // ========================================
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const responseClone = response.clone();

          // Cache successful responses (200-299)
          if (response.ok) {
            caches.open(CACHE_API).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Fallback to cache on network failure
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving API from cache (offline):', url.pathname);
              return cachedResponse;
            }

            // Return offline response
            return new Response(
              JSON.stringify({ error: 'Offline - no cached data available' }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // ========================================
  // STRATEGY 2: Images (Stale While Revalidate)
  // ========================================
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_IMAGES).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });

          // Return cached version immediately, update in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // ========================================
  // STRATEGY 3: Static Assets (Cache First)
  // ========================================
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', url.pathname);
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (
          request.destination === 'script' ||
          request.destination === 'style' ||
          request.destination === 'font' ||
          url.pathname.startsWith('/_astro/')
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_STATIC).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return response;
      });
    })
  );
});

// ============================================================================
// MESSAGE - Handle messages from client
// ============================================================================

self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('botcriptofy-')) {
              console.log('[SW] Clearing cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
