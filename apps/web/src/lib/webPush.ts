import { getToken, onMessage, isSupported, type MessagePayload } from 'firebase/messaging';
import { messaging, firebaseConfig } from './firebase';
import { api } from './api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const TOKEN_CACHE_KEY = 'fcmToken';

/** Public config the service worker needs, as URL query params (not secret). */
function swUrl(): string {
  const p = new URLSearchParams();
  if (firebaseConfig.apiKey) p.set('apiKey', firebaseConfig.apiKey);
  if (firebaseConfig.authDomain) p.set('authDomain', firebaseConfig.authDomain);
  if (firebaseConfig.projectId) p.set('projectId', firebaseConfig.projectId);
  if (firebaseConfig.storageBucket) p.set('storageBucket', firebaseConfig.storageBucket);
  if (firebaseConfig.messagingSenderId) p.set('messagingSenderId', firebaseConfig.messagingSenderId);
  if (firebaseConfig.appId) p.set('appId', firebaseConfig.appId);
  return `/firebase-messaging-sw.js?${p.toString()}`;
}

/** True when this browser can actually do FCM web push and it's configured. */
export async function webPushSupported(): Promise<boolean> {
  if (!messaging || !VAPID_KEY) return false;
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return false;
  return isSupported().catch(() => false);
}

/**
 * Request permission, obtain an FCM token and register it with the API. Safe to
 * call repeatedly — a no-op when unsupported, unconfigured, or already granted
 * with a cached token. `onForeground` fires for messages received while the tab
 * is focused (the SW handles background). Returns the token or null.
 */
export async function enableWebPush(onForeground?: (p: MessagePayload) => void): Promise<string | null> {
  try {
    if (!(await webPushSupported()) || !messaging) return null;

    const registration = await navigator.serviceWorker.register(swUrl());
    if (Notification.permission === 'denied') return null;
    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return null;

    // Re-register only when the token changed to avoid a request on every mount.
    if (localStorage.getItem(TOKEN_CACHE_KEY) !== token) {
      await api.notifications
        .registerDevice({ platform: 'web', token, userAgent: navigator.userAgent })
        .then(() => localStorage.setItem(TOKEN_CACHE_KEY, token))
        .catch(() => {});
    }

    if (onForeground) onMessage(messaging, onForeground);
    return token;
  } catch {
    return null;
  }
}

/** Unregister this browser's token (call on logout). Best-effort. */
export async function disableWebPush(): Promise<void> {
  const token = localStorage.getItem(TOKEN_CACHE_KEY);
  localStorage.removeItem(TOKEN_CACHE_KEY);
  if (token) await api.notifications.unregisterDevice(token).catch(() => {});
}
