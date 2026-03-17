import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = 'BLb2eXXY-EXMrwqA9sMOaXZrH7P3aNZRmrpFbJUzzwZ6HVi1Dr3QEqfDr57WCXlx3Jxk3h9hLCtbGXSz0mhZPvM';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!userId) return;
    if (!('Notification' in window)) return;

    // Subscribe to DB events from the new "notifications" table
    const channel = supabase
      .channel('backend-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as any;
          
          if (newNotification.title && newNotification.body) {
            sendNotification(newNotification.title, newNotification.body);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribeToPush();
      sendNotification('Notificaciones Activadas', 'Recibirás avisos de cobros y mora incluso con la app cerrada.');
    }
    return result === 'granted';
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !userId) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Save to Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: subscription.toJSON(),
          device_info: navigator.userAgent
        });

      if (error) console.error('Error saving push subscription:', error);
      else console.log('✅ Push subscription saved successfully');

    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
    }
  };

  const sendNotification = async (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // Check if we have a service worker registered
    let swRegistration = null;
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          swRegistration = registrations[0];
          // Try to update SW just in case it's stale
          swRegistration.update().catch(() => {});
        } else {
          // Si Vite PWA lo acaba de inyectar pero getRegistrations no lo devuelve inmediato
          swRegistration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('SW Timeout')), 1500))
          ]).catch(() => null);
        }
      } catch (err) {
        console.warn('Error fetching service worker registration, falling back to basic notification', err);
      }
    }

    if (swRegistration) {
      try {
        await (swRegistration as ServiceWorkerRegistration).showNotification(title, {
          body,
          icon: '/pwa-icon.png',
          badge: '/mask-icon.svg',
          vibrate: [200, 100, 200, 100, 200],
          tag: `prestamos-alert-${Date.now()}`, // Dynamic tag so OS always alerts
          requireInteraction: true, // Forces notification to stay on screen until dismissed
        } as any);
        return;
      } catch (err) {
        console.warn('Failed to show notification via service worker, falling back', err);
      }
    }

    // Fallback standard notification stringently
    try {
      const fallbackNotif = new Notification(title, { 
        body, 
        icon: '/pwa-icon.png',
        tag: `prestamos-alert-${Date.now()}`,
        requireInteraction: true
      });
      // Optionally handle click
      fallbackNotif.onclick = () => {
        window.focus();
        fallbackNotif.close();
      };
    } catch (e) {
      console.error('Final fallback notification failed', e);
    }
  };

  return { permission, requestPermission, sendNotification };
}
