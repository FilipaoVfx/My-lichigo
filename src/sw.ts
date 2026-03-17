/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Handle Push Notifications (Crucial for "outside the app" / closed app)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Nueva Notificación';
    const options = {
      body: data.body || '',
      icon: '/pwa-icon.png',
      badge: '/mask-icon.svg',
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || `alert-${Date.now()}`,
      data: data.data || {},
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'Ver Detalles' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error handling push event:', err);
    // Fallback if not JSON
    event.waitUntil(
      self.registration.showNotification('Recordatorio de Préstamo', {
        body: event.data.text(),
        icon: '/pwa-icon.png',
      })
    );
  }
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL('/', self.location.origin).href;

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
