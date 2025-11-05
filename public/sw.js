// Service Worker for AI Trading Platform PWA
const CACHE_NAME = 'ai-trading-platform-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/admin',
  '/admin/ai-dashboard',
  '/admin/dashboard-v2',
  '/manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network only (no cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Network unavailable' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // For navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page
            return caches.match('/admin');
          });
        })
    );
    return;
  }

  // For all other requests - cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        fetch(request).then((response) => {
          if (response.ok) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, response);
            });
          }
        });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncTrades());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New notification from AI Trading Platform',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AI Trading Platform', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/admin')
    );
  }
});

// Helper function to sync trades
async function syncTrades() {
  try {
    // Get pending trades from IndexedDB
    const pendingTrades = await getPendingTrades();
    
    // Sync each trade
    for (const trade of pendingTrades) {
      await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade)
      });
    }
    
    // Clear pending trades
    await clearPendingTrades();
    console.log('[Service Worker] Trades synced successfully');
  } catch (error) {
    console.error('[Service Worker] Error syncing trades:', error);
    throw error;
  }
}

// Placeholder functions for IndexedDB operations
async function getPendingTrades() {
  // TODO: Implement IndexedDB read
  return [];
}

async function clearPendingTrades() {
  // TODO: Implement IndexedDB clear
}

console.log('[Service Worker] Loaded');
