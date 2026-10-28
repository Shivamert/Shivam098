/**
 * RoutineFlow Service Worker
 * Handles offline caching, PWA installation, and real Web Push notifications.
 */

const CACHE_NAME = 'routineflow-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network first with Cache fallback for navigation & static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Do not cache API routes
  if (request.url.includes('/api/')) {
    return;
  }

  // Navigation requests: try network, fallback to /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback for image requests
        if (request.destination === 'image') {
          return caches.match('/icon.svg');
        }
      });
    })
  );
});

// Real Web Push Notification Listener
self.addEventListener('push', (event) => {
  let data = {
    title: 'RoutineFlow Reminder',
    body: 'You have a scheduled routine or task waiting.',
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    tag: 'routineflow-reminder',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/icon.svg',
    tag: data.tag || (data.data && data.data.occurrenceId ? `rf-${data.data.occurrenceId}` : 'rf-notification'),
    renotify: true,
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: 'Open Task' },
      { action: 'snooze', title: 'Snooze 10m' }
    ],
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler: open app or trigger action
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  if (action === 'snooze') {
    // Notify clients to snooze if open
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'ROUTINEFLOW_NOTIFICATION_ACTION',
            action: 'snooze',
            data: event.notification.data,
          });
        }
      })
    );
    return;
  }

  // Open or focus application window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
