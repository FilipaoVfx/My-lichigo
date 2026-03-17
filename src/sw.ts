/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// --- AGGRESSIVE PUSH HANDLING ---
self.addEventListener('push', (event) => {
  let data: any = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🚨 Aviso de My Lichigo';
  const options: NotificationOptions = {
    body: data.body || 'Tienes una actualización importante de tu cartera.',
    icon: '/pwa-icon.png',
    badge: '/mask-icon.svg',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: data.tag || 'loan-notification',
    renotify: true, // Vibrates even if tag is the same
    requireInteraction: true,
    data: { 
      url: data.url || '/',
      timestamp: Date.now()
    },
    silent: false, // Ensure sound if device allows
    // @ts-ignore - Specific to some browsers for high priority
    priority: 2, 
    actions: [
      { action: 'open', title: 'Ver ahora' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// --- DEEP LINKING ON CLICK ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Force update on the new SW
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
