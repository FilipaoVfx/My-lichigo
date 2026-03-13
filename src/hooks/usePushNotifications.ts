import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function usePushNotifications(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!userId) return;
    if (!('Notification' in window)) return;

    const today = new Date().toLocaleDateString('en-CA');

    // Subscribe to DB events for "event driven" push notifications
    const channel = supabase
      .channel('loans-notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'loans',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          // Event driven: Check if it became overdue (prestamos en mora)
          const justBecameOverdue =
            newRecord.status === 'overdue' &&
            (payload.eventType === 'INSERT' || oldRecord?.status !== 'overdue');

          if (justBecameOverdue) {
            sendNotification(
              'Préstamo en Mora 🚨',
              `Un préstamo ha entrado en estado de mora. Saldo: $${newRecord.balance}`
            );
          }

          // Event driven: Check if there's an upcoming collection (proximos cobros)
          const justBecameDueToday =
            newRecord.next_due_date === today &&
            newRecord.status !== 'paid' &&
            (payload.eventType === 'INSERT' || oldRecord?.next_due_date !== today);

          if (justBecameDueToday) {
            sendNotification(
              'Próximo Cobro Hoy 📅',
              `Tienes un cobro programado para hoy. Saldo pendiente: $${newRecord.balance}`
            );
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
        sendNotification('Notificaciones Activadas', 'Recibirás avisos de cobros y mora.');
    }
    return result === 'granted';
  };

  const sendNotification = async (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // Since it's a PWA, use the Service Worker to show the notification
    // It provides better mobile native integration
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        registration.showNotification(title, {
          body,
          icon: '/pwa-icon.png',
          badge: '/mask-icon.svg',
          vibrate: [200, 100, 200],
          tag: 'prestamos-notification', // prevent duplicates if triggered multiple times
        } as any);
        return;
      }
    }

    // Fallback standard notification
    new Notification(title, { body, icon: '/pwa-icon.png' });
  };

  return { permission, requestPermission, sendNotification };
}
