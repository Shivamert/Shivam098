/**
 * Web Push and Browser Notification Service
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  endpoint?: string;
}

export class NotificationService {
  /**
   * Check browser notification permission and capabilities
   */
  static getStatus(): NotificationStatus {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return { supported: false, permission: 'unsupported', subscribed: false };
    }

    return {
      supported: true,
      permission: Notification.permission,
      subscribed: false,
    };
  }

  /**
   * Register service worker and subscribe to real server-backed Web Push
   */
  static async subscribeToPush(): Promise<{ success: boolean; message: string; endpoint?: string }> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, message: 'Web Push is not supported by your current browser.' };
    }

    try {
      // 1. Request user permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          message: 'Notification permission was denied. Please allow notifications in site settings.',
        };
      }

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 3. Fetch server VAPID key
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) {
        throw new Error('Failed to retrieve VAPID key from backend');
      }
      const { publicKey } = await keyRes.json();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // 4. Subscribe with push manager
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      // 5. Send subscription to server
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: 'user_active',
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to register subscription with RoutineFlow backend');
      }

      return {
        success: true,
        message: 'Web Push notifications successfully enabled and registered!',
        endpoint: subscription.endpoint,
      };
    } catch (e: any) {
      console.error('Push registration error', e);
      return {
        success: false,
        message: e.message || 'Error configuring Web Push subscription.',
      };
    }
  }

  /**
   * Unsubscribe from Web Push
   */
  static async unsubscribe(): Promise<{ success: boolean; message: string }> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint }),
          });
        }
      }
      return { success: true, message: 'Unsubscribed from push notifications.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to unsubscribe.' };
    }
  }

  /**
   * Send test push notification from backend to user's device
   */
  static async sendTestPush(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: 'Test notification sent! Check your notification panel.' };
      } else {
        return { success: false, message: data.error || 'Server could not deliver test push.' };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error triggering test push.' };
    }
  }

  /**
   * Local instant in-app notification fallback
   */
  static showLocalAlert(title: string, options?: NotificationOptions) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          ...options,
        });
      } catch (e) {
        // Fallback silently if direct constructor blocked
      }
    }
  }
}
