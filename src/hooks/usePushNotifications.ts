import { useEffect, useState, useCallback } from 'react';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check initial subscription status in DB
  useEffect(() => {
    if (!userId) return;
    
    const checkSubscription = async () => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setIsSubscribed(true);
      }
    };
    
    checkSubscription();
  }, [userId]);

  // Realtime listener for in-app alerts
  useEffect(() => {
    if (!userId) return;
    if (!('Notification' in window)) return;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
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

  const subscribeToPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !userId) return false;
    
    setIsSyncing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Ensure we have a clean slate if needed
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: subscription.toJSON(),
          device_info: `${navigator.platform} - ${navigator.userAgent.slice(0, 50)}`,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      setIsSubscribed(true);
      console.log('✅ Push subscription synced with server');
      return true;
    } catch (err) {
      console.error('❌ Failed to subscribe to push notifications:', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      const success = await subscribeToPush();
      if (success) {
        sendNotification('¡Sistema Activo!', 'Ahora recibirás alertas de cobranza directamente en este dispositivo.');
      }
    }
    return result === 'granted';
  };

  const sendNotification = async (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.showNotification(title, {
        body,
        icon: '/pwa-icon.png',
        badge: '/mask-icon.svg',
        vibrate: [100, 50, 100],
        requireInteraction: true,
        data: { url: window.location.origin }
      } as any);
    } else {
      new Notification(title, { body, icon: '/pwa-icon.png' } as any);
    }
  };

  // NEW: Direct test with Edge Function to eliminate friction
  const triggerTest = async () => {
    if (!userId) return { success: false, message: 'No active session' };
    
    setIsSyncing(true);
    try {
      // First ensure the subscription is fresh
      await subscribeToPush();

      // Directly invoke the function for this specific user
      const { data, error } = await supabase.functions.invoke('detect-overdue-loans', {
        body: { force_user_id: userId, is_test: true }
      });

      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error('Test trigger failed:', err);
      return { success: false, message: err.message };
    } finally {
      setIsSyncing(false);
    }
  };

  return { 
    permission, 
    isSubscribed, 
    isSyncing, 
    requestPermission, 
    subscribeToPush, 
    triggerTest,
    sendNotification 
  };
}

