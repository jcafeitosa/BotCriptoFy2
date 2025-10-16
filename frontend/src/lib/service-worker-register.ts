/**
 * @fileoverview Service Worker Registration
 * @description Client-side SW registration and lifecycle management
 * @version 1.0.0
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service Worker registered successfully:', registration);

    // Check for updates on page load
    registration.update();

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New Service Worker available, ready to update');

            // Notify user about update
            const shouldUpdate = confirm(
              'Nova versão disponível! Atualizar agora?'
            );

            if (shouldUpdate) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister Service Worker (for debugging)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('[SW] Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('[SW] Failed to unregister Service Worker:', error);
    return false;
  }
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'CLEAR_CACHE' });
    console.log('[SW] Cache clear requested');
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}
