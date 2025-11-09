// Service Worker for data caching and performance optimization
const CACHE_NAME = 'data-viz-v1';
const API_CACHE_NAME = 'api-cache-v1';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/globals.css',
  '/favicon.ico'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/data',
  '/api/config'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('Service Worker: Serving from cache (API):', request.url);
                return cachedResponse;
              }
              throw new Error('Network and cache failed');
            });
        })
    );
    return;
  }

  // Handle static resources with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache (static):', request.url);
          return cachedResponse;
        }

        // Fetch from network and cache
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses or non-GET requests
            if (!response.ok || request.method !== 'GET') {
              return response;
            }

            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));

            return response;
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('Service Worker: Performing background sync');
  // Implement background data sync logic here
  // This could sync any queued data mutations when back online
}

// Push notifications for real-time updates (optional)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.url
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_DATA') {
    // Store performance data for analysis
    console.log('Service Worker: Received performance data', event.data.payload);
  }
});